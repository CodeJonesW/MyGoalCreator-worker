import { Env } from '../types';

export const profileRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../utils/auth');
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const goalsQuery = await env.DB.prepare(`SELECT goal_name, GoalId FROM Goals WHERE UserId = ?`).bind(user.userId).all();
	const userFromDb = await env.DB.prepare(`SELECT email, analyze_requests FROM Users WHERE UserId = ?`).bind(user.userId).first();
	const recentGoal = await env.DB.prepare(`SELECT GoalId, plan FROM Goals WHERE UserId = ? ORDER BY GoalId DESC LIMIT 1`)
		.bind(user.userId)
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
