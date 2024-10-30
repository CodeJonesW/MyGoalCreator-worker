import { Context } from 'hono';
import { Env } from '../../types';
import { streamGoal } from '../../utils/ai_completions';
import { errorResponse } from '../../utils/response_utils';

export const createGoalRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const { checkIfUserHasAnalyzeRequests } = await import('../../utils/db/db_queries');
	try {
		const { req: request, env } = context;
		const authResponse = await verifyToken(request.raw, env);
		if (authResponse instanceof Response) return authResponse;

		const user = authResponse.user;
		const hasAnalyzeRequests = await checkIfUserHasAnalyzeRequests(user.user_id, env);
		if (!hasAnalyzeRequests) {
			return errorResponse('No analyze requests left', 400);
		}
		console.log('Request body', request.parseBody());

		const { goal_name, area_of_focus, timeline }: any = await request.json();

		if (!goal_name) {
			return errorResponse('Goal is required', 400);
		}

		const { results } = await env.DB.prepare(`INSERT INTO Goals (user_id, goal_name, aof, timeline) VALUES (?, ?, ?, ?) RETURNING goal_id`)
			.bind(user.user_id, goal_name, area_of_focus, timeline)
			.run();

		const goal_id = results[0].goal_id as string;

		return new Response(JSON.stringify({ goal_id }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.log(error);
		return errorResponse('Internal server error', 500);
	}
};

export const streamGoalRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const { checkIfUserHasAnalyzeRequests } = await import('../../utils/db/db_queries');
	try {
		const { req: request, env } = context;
		const authResponse = await verifyToken(request.raw, env);
		if (authResponse instanceof Response) return authResponse;

		const user = authResponse.user;
		const hasAnalyzeRequests = await checkIfUserHasAnalyzeRequests(user.user_id, env);
		if (!hasAnalyzeRequests) {
			return errorResponse('No analyze requests left', 400);
		}

		const { goal_id }: any = await request.json();

		if (!goal_id) {
			return errorResponse('Goal ID is required', 400);
		}

		const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
		if (!goal) {
			return errorResponse('Goal not found', 404);
		}
		const { goal_name, aof, timeline } = goal;

		const stream = await streamGoal(env, goal_id, goal_name, aof, timeline, user);
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.log(error);
		return errorResponse('Internal server error', 500);
	}
};
