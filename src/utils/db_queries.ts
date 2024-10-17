import { Env, User } from '../types';

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

export const findUserTrackedGoal = async (env: Env, user_id: any) => {
	return await env.DB.prepare(`SELECT goal_id FROM TrackedGoals WHERE user_id = ?`).bind(user_id).first();
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

export const getSubGoalByGoalIdAndSubGoalName = async (env: Env, goal_id: any, sub_goal_name: any) => {
	return await env.DB.prepare(`SELECT * FROM SubGoals WHERE goal_id = ? AND sub_goal_name = ?`).bind(goal_id, sub_goal_name).first();
};
