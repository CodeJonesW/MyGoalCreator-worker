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
	const auths = await env.DB.prepare(`SELECT * FROM Auth WHERE user_id = ?`).bind(user_id).all();
	return auths.results.length <= 1 ? true : false;
};
