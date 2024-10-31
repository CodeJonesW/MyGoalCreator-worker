import { Env, Goal, User } from '../../types';

export const checkIfUserExistsByEmail = async (email: string, env: Env): Promise<null | User> => {
	return await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
};

export const checkIfUserHasAnalyzeRequests = async (user_id: number, env: Env): Promise<boolean> => {
	const user = (await env.DB.prepare(`SELECT analyze_requests FROM Users WHERE user_id = ?`).bind(user_id).first()) as User;
	console.log('checkIfUserHasAnalyzeRequests', user);
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
	console.log('getgoalbyid', goal_id);
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

export const findGoalsAndSubGoalsByUserId = async (env: Env, user_id: number, parent_goal_id: number | null = null): Promise<Goal[]> => {
	const query = `
	  SELECT 
		g.goal_id, 
		g.goal_name, 
		g.plan,
		g.timeline,
		g.aof,
		g.depth
	  FROM Goals g
	  WHERE g.user_id = ? AND g.parent_goal_id ${parent_goal_id ? '= ?' : 'IS NULL'}
	  ORDER BY g.goal_id;
	`;

	// Execute the query to get goals for the user, filtered by parent_goal_id or top-level goals if parent_goal_id is null
	const goalsResult = parent_goal_id
		? await env.DB.prepare(query).bind(user_id, parent_goal_id).all()
		: await env.DB.prepare(query).bind(user_id).all();

	const goalsWithSubGoals: Goal[] = [];

	if (!goalsResult.results.length) {
		return goalsWithSubGoals;
	}

	for (const row of goalsResult.results) {
		const goal: Goal = {
			goal_id: row.goal_id as number,
			goal_name: row.goal_name as string,
			plan: row.plan as string,
			timeline: row.timeline as string,
			aof: row.aof as string,
			subgoals: [] as Goal[],
			depth: row.depth as number,
		};

		goal.subgoals = await findGoalsAndSubGoalsByUserId(env, user_id, goal.goal_id);

		goalsWithSubGoals.push(goal);
	}

	return goalsWithSubGoals;
};

export const getLatestTimelineId = async (env: Env) => {
	const { results } = await env.DB.prepare(`SELECT MAX(timeline_id) as latest_id FROM Timelines`).all();
	return results[0].latest_id;
};

export const getLatestPlanItemId = async (env: Env) => {
	const { results } = await env.DB.prepare(`SELECT MAX(plan_item_id) as latest_id FROM PlanItems`).all();
	return results[0].latest_id;
};
