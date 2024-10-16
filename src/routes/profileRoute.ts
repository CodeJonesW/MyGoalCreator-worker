import { Env } from '../types';

export const profileRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../utils/auth');
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const userFromDb = await env.DB.prepare(`SELECT email, analyze_requests FROM Users WHERE user_id = ?`).bind(user.user_id).first();
	if (!userFromDb) {
		return new Response(JSON.stringify({ error: 'User not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const goalsQuery = await env.DB.prepare(`SELECT goal_name, goal_id FROM Goals WHERE user_id = ?`).bind(user.user_id).all();
	const recentGoal = await env.DB.prepare(`SELECT goal_id, plan FROM Goals WHERE user_id = ? ORDER BY goal_id DESC LIMIT 1`)
		.bind(user.user_id)
		.first();

	const trackedGoal = await env.DB.prepare(`SELECT goal_id FROM TrackedGoals WHERE user_id = ?`).bind(user.user_id).first();

	const responseData = {
		user: userFromDb,
		goals: goalsQuery.results,
		recentGoal: recentGoal ? recentGoal : null,
		trackedGoal: trackedGoal ? trackedGoal : null,
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
