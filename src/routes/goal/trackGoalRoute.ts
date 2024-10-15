import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { checkGoalExists } from '../../utils/db_queries';

export const trackGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;
	const user = authResponse.user;

	const { goal_id }: any = await request.json();

	if (!goal_id) {
		return new Response(JSON.stringify({ error: 'Missing goal_id' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const goalExists = checkGoalExists(goal_id, env);
	if (!goalExists) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const trackedGoal = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE user_id = ?`).bind(user.user_id).first();
		if (trackedGoal) {
			await env.DB.prepare(`DELETE FROM TrackedGoals WHERE user_id = ?`).bind(user.user_id).run();
		}
		const { success } = await env.DB.prepare(`INSERT INTO TrackedGoals (goal_id, user_id) VALUES (?, ?)`).bind(goal_id, user.user_id).run();
		if (success) {
			return new Response(JSON.stringify({ message: 'User added successfully' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			return new Response(JSON.stringify({ error: 'Failed to insert trackedgoal' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} catch (error) {
		console.log('Error tracking goal', error);
		return new Response(JSON.stringify({ error: 'Failed to insert trackedgoal' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
