import { Env } from '../types';
import { verifyToken } from '../utils/auth';

export const trackGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;
	const user = authResponse.user;

	const { goal_id }: any = await request.json();

	const { success } = await env.DB.prepare(`INSERT INTO TrackedGoals (goal_id, user_id() VALUES (?, ?)`).bind(goal_id, user.user_id).run();
	if (success) {
		return new Response(JSON.stringify({ message: 'User added successfully' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} else {
		return new Response(JSON.stringify({ error: 'Failed to insert user' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
