import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { createSubGoal } from '../../utils/ai_completions';
import { getGoalById, getSubGoalByGoalIdAndSubGoalName } from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';

export const createSubGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const { goal_id, sub_goal_name, line_number }: any = await request.json();

	if (!goal_id || !sub_goal_name || !line_number) {
		return errorResponse('Missing required fields', 400);
	}

	const goal = await getGoalById(env, goal_id);
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}

	const subGoal = await getSubGoalByGoalIdAndSubGoalName(env, goal_id, sub_goal_name);
	if (subGoal) {
		return new Response(JSON.stringify({ message: 'success', subGoal }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const stream = await createSubGoal(env, goal, sub_goal_name, line_number);

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
};
