import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { errorResponse } from '../../utils/response_utils';

export const trackedGoalByIdRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const url = new URL(request.url);
	const goal_id = url.searchParams.get('goal_id');

	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}

	const planItems = await env.DB.prepare(`SELECT * FROM PlanItems WHERE goal_id = ?`).bind(goal_id).all();
	const timelines = await env.DB.prepare(`SELECT * FROM Timelines WHERE goal_id = ?`).bind(goal_id).all();

	console.log('planItems', planItems);
	console.log('timelines', timelines);

	return new Response(JSON.stringify({ planItems: planItems.results }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};