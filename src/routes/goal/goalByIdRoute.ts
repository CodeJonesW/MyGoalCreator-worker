import { Context } from 'hono';
import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { errorResponse } from '../../utils/response_utils';

export const goalByIdRoute = async (context: Context): Promise<Response> => {
	const { req: request, env: contextEnv } = context;
	const { env } = contextEnv.Bindings;

	const authResponse = await verifyToken(request.raw, env);
	console.log('authResponse', authResponse);
	if (authResponse instanceof Response) return authResponse;

	const url = new URL(request.url);
	const goal_id = url.searchParams.get('goal_id');

	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	const trackedGoals = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}

	const isGoalTracked = trackedGoals ? true : false;
	goal.isGoalTracked = isGoalTracked;

	return new Response(JSON.stringify({ goal }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
