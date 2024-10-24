import { Env, Goal, User } from '../../types';

export const checkIfUserExistsByEmail = async (email: string, env: Env): Promise<null | User> => {
	return await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
};

export const checkIfUserHasAnalyzeRequests = async (user_id: number, env: Env): Promise<boolean> => {
	const user = (await env.DB.prepare(`SELECT analyze_requests FROM Users WHERE user_id = ?`).bind(user_id).first()) as User;
	if (!user) return false;
	return (user.analyze_requests as number) > 0;
};

export const checkGoalExists = async (goal_id: number, env: Env): Promise<boolean> => {
	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	return !!goal;
};

export const insertAuthEntry = async (env: Env, user_id: any) => {
	return await env.DB.prepare(`INSERT INTO Auth (user_id) VALUES (?)`).bind(user_id).run();
};

export const checkUserFirstLogin = async (env: Env, user_id: any) => {
	return await env.DB.prepare(`SELECT * FROM Auth WHERE user_id = ?`).bind(user_id).all();
};

export const findUserTrackedGoals = async (env: Env, user_id: any) => {
	return await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE user_id = ?`).bind(user_id).all();
};

export const findUserRecentGoal = async (env: Env, user_id: any) => {
	return await env.DB.prepare(`SELECT goal_id, plan FROM Goals WHERE user_id = ? ORDER BY goal_id DESC LIMIT 1`).bind(user_id).first();
};

export const findUserClientData = async (env: Env, user_id: any) => {
	return await env.DB.prepare(`SELECT email, analyze_requests FROM Users WHERE user_id = ?`).bind(user_id).first();
};

export const findUserGoals = async (env: Env, user_id: any) => {
	return await env.DB.prepare(`SELECT goal_name, goal_id FROM Goals WHERE user_id = ?`).bind(user_id).all();
};

export const getGoalById = async (env: Env, goal_id: any) => {
	return await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
};

export const getGoalByParentGoalIdAndName = async (env: Env, goal_id: any, sub_goal_name: any) => {
	return await env.DB.prepare(`SELECT * FROM Goals WHERE parent_goal_id = ? AND goal_name = ?`).bind(goal_id, sub_goal_name).first();
};

export const findUserGoalsWithSubgoals = async (env: Env, user_id: any) => {
	const query = `
		SELECT 
			g.goal_id, 
			g.goal_name, 
			sg.sub_goal_id, 
			sg.sub_goal_name 
		FROM Goals g
		LEFT JOIN SubGoals sg ON g.goal_id = sg.goal_id
		WHERE g.user_id = ?
		ORDER BY g.goal_id, sg.line_number;
	`;

	const goalsWithSubGoals = await env.DB.prepare(query).bind(user_id).all();
	const goalsMap = new Map();

	goalsWithSubGoals.results.forEach((row) => {
		if (!goalsMap.has(row.goal_id)) {
			goalsMap.set(row.goal_id, {
				goal_id: row.goal_id,
				goal_name: row.goal_name,
				subgoals: [],
			});
		}

		if (row.sub_goal_id) {
			goalsMap.get(row.goal_id).subgoals.push({
				sub_goal_id: row.sub_goal_id,
				sub_goal_name: row.sub_goal_name,
			});
		}
	});

	return Array.from(goalsMap.values());
};

export const findGoalsAndSubGoalsByUserId = async (env: Env, user_id: number) => {
	const query = `
		SELECT 
			g.goal_id AS parent_goal_id, 
			g.goal_name AS parent_goal_name, 
			g.plan AS parent_plan,
			g.timeline AS parent_timeline,
			g.aof AS parent_aof,
			sg.goal_id AS sub_goal_id, 
			sg.goal_name AS sub_goal_name,
			sg.plan AS sub_goal_plan,
			sg.timeline AS sub_goal_timeline,
			sg.aof AS sub_goal_aof
		FROM Goals g
		LEFT JOIN Goals sg ON g.goal_id = sg.parent_goal_id
		WHERE g.user_id = ? AND g.parent_goal_id IS NULL
		ORDER BY g.goal_id;
	`;

	const goalsWithSubGoals = await env.DB.prepare(query).bind(user_id).all();
	console.log('goalsWithSubGoals', goalsWithSubGoals);

	if (!goalsWithSubGoals.results.length) {
		return [];
	}

	// Group goals and their respective subgoals
	const goalsMap = new Map<number, Goal>();

	goalsWithSubGoals.results.forEach((row) => {
		const parentGoalId = row.parent_goal_id as number;

		// If the goal is not in the map, add it
		if (!goalsMap.has(parentGoalId)) {
			goalsMap.set(parentGoalId, {
				goal_id: parentGoalId,
				goal_name: row.parent_goal_name as string,
				plan: row.parent_plan as string,
				timeline: row.parent_timeline as string,
				aof: row.parent_aof as string,
				subgoals: [] as Goal[],
			});
		}

		// If there is a subgoal, add it to the goal's subgoals list
		if (row.sub_goal_id) {
			// @ts-ignore
			goalsMap.get(parentGoalId)?.subgoals.push({
				parent_goal_id: parentGoalId,
				goal_id: row.sub_goal_id as number,
				goal_name: row.sub_goal_name as string,
				plan: row.sub_goal_plan as string,
				timeline: row.sub_goal_timeline as string,
				aof: row.sub_goal_aof as string,
			});
		}
	});

	// Convert the map to an array of Goal objects
	const goals = Array.from(goalsMap.values());

	return goals;
};

export const getLatestTimelineId = async (env: Env) => {
	const { results } = await env.DB.prepare(`SELECT MAX(timeline_id) as latest_id FROM Timelines`).all();
	return results[0].latest_id;
};

export const getLatestPlanItemId = async (env: Env) => {
	const { results } = await env.DB.prepare(`SELECT MAX(plan_item_id) as latest_id FROM PlanItems`).all();
	return results[0].latest_id;
};
