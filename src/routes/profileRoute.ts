import { Env } from '../types';

export const profileRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../utils/auth');
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const goalsQuery = await env.DB.prepare(`SELECT goal_name, goal_id FROM Goals WHERE user_id = ?`).bind(user.user_id).all();
	const userFromDb = await env.DB.prepare(`SELECT email, analyze_requests FROM Users WHERE user_id = ?`).bind(user.user_id).first();
	const recentGoal = await env.DB.prepare(`SELECT goal_id, plan FROM Goals WHERE user_id = ? ORDER BY goal_id DESC LIMIT 1`)
		.bind(user.user_id)
		.first();

	if (!userFromDb) {
		return new Response(JSON.stringify({ error: 'User not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ user: userFromDb, goals: goalsQuery.results, recentGoal: recentGoal ? recentGoal : null }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
