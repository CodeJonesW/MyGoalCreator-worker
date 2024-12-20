import { streamSubGoal } from '../../utils/ai_completions';
import { getGoalById, getGoalByParentGoalIdAndName } from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';
import { Context } from 'hono';

export const createSubGoalRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const { req: request, env } = context;

	const authResponse = await verifyToken(request.raw, env);

	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const { parent_goal_id, sub_goal_name }: any = await request.json();

	if (!parent_goal_id || !sub_goal_name) {
		return errorResponse('Missing required fields', 400);
	}

	const parent_goal = await getGoalById(env, parent_goal_id);
	if (!parent_goal) {
		return errorResponse('Goal not found', 404);
	}

	if ((parent_goal.depth as number) >= 4) {
		return errorResponse('Sub goal depth exceeded', 400);
	}

	const subGoal = await getGoalByParentGoalIdAndName(env, parent_goal_id, sub_goal_name);
	if (subGoal) {
		return new Response(JSON.stringify({ message: 'success', goal_id: subGoal.goal_id, existed: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { results } = await env.DB.prepare(
		`
		INSERT INTO Goals (parent_goal_id, goal_name, user_id, depth)
		VALUES (?, ?, ?, COALESCE((SELECT depth + 1 FROM Goals WHERE goal_id = ?), 0))
		RETURNING goal_id
	  `
	)
		.bind(parent_goal_id, sub_goal_name, user.user_id, parent_goal_id)
		.run();

	const goal_id = results[0].goal_id as string;

	return new Response(JSON.stringify({ goal_id, existed: false }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

export const streamSubGoalRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const { req: request, env } = context;

	const authResponse = await verifyToken(request.raw, env);
	if (authResponse instanceof Response) return authResponse;
	console.log('stream sub goal');

	const { goal_id }: any = await request.json();
	console.log('goalid', goal_id);

	if (!goal_id) {
		return errorResponse('Missing required fields', 400);
	}

	const goal = await getGoalById(env, goal_id);
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}
	console.log('sub goal', goal);

	const parentGoal = await getGoalById(env, goal.parent_goal_id as string);

	const stream = await streamSubGoal(env, parentGoal, goal.goal_name as string, goal.goal_id as number);
	console.log('i can do it');
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
};
