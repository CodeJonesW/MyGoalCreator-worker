import { Env, User } from '../types';

export const checkIfUserExistsByEmail = async (email: string, env: Env): Promise<null | User> => {
	return await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
};

export const checkIfUserHasAnalyzeRequests = async (userId: number, env: Env): Promise<boolean> => {
	const user = (await env.DB.prepare(`SELECT analyze_requests FROM Users WHERE UserId = ?`).bind(userId).first()) as User;
	if (!user) return false;
	return (user.analyze_requests as number) > 0;
};
