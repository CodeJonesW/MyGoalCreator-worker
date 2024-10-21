import { Env } from '../../types';
import { createSubGoal } from '../../utils/ai_completions';
import { getGoalById, getGoalByParentGoalIdAndName } from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';

export const createSubGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const { goal_id: parent_goal_id, sub_goal_name, line_number }: any = await request.json();

	if (!parent_goal_id || !sub_goal_name || !line_number) {
		return errorResponse('Missing required fields', 400);
	}

	const parent_goal = await getGoalById(env, parent_goal_id);
	if (!parent_goal) {
		return errorResponse('Goal not found', 404);
	}

	const subGoal = await getGoalByParentGoalIdAndName(env, parent_goal_id, sub_goal_name);
	if (subGoal) {
		return new Response(JSON.stringify({ message: 'success', subGoal }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const stream = await createSubGoal(env, parent_goal, sub_goal_name);

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
};
