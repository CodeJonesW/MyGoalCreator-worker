import { Env } from '../types';
import { verifyToken } from '../utils/auth';

export const trackGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;
	const user = authResponse.user;

	const { goal_id }: any = await request.json();

	const goal = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE goal_id = ? AND user_id = ?`).bind(goal_id, user.user_id).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ goal }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
