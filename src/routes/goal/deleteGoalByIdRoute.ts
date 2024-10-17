import { verifyToken } from '../../utils/auth';
import { Env } from '../../types';
import { errorResponse } from '../../utils/response_utils';

export const deleteGoalByIdRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const { goal_id }: any = await request.json();

	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}

	await env.DB.prepare(`DELETE FROM SubGoals WHERE goal_id = ?`).bind(goal.goal_id).run();

	const trackedGoal = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE goal_id = ?`).bind(goal.goal_id).first();

	if (trackedGoal) {
		await env.DB.prepare(`DELETE FROM TrackedGoals WHERE goal_id = ?`).bind(goal.goal_id).run();
	}

	await env.DB.prepare(`DELETE FROM Goals WHERE goal_id = ?`).bind(goal_id).run();

	return new Response(JSON.stringify({ message: 'success' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
