import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { checkGoalExists } from '../../utils/db_queries';
import { errorResponse } from '../../utils/response_utils';

export const trackGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;
	const user = authResponse.user;

	const { goal_id }: any = await request.json();

	if (!goal_id) {
		return errorResponse('Missing goal_id', 400);
	}
	const goalExists = checkGoalExists(goal_id, env);
	if (!goalExists) {
		return errorResponse('Goal not found', 404);
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
			return errorResponse('Failed to insert trackedgoal', 500);
		}
	} catch (error) {
		console.log('Error tracking goal', error);
		return errorResponse('Failed to insert trackedgoal', 500);
	}
};
