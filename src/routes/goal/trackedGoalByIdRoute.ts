import { Context } from 'hono';
import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { errorResponse } from '../../utils/response_utils';

export const trackedGoalByIdRoute = async (context: Context): Promise<Response> => {
	const { req: request, env } = context;

	const authResponse = await verifyToken(request.raw, env);
	if (authResponse instanceof Response) return authResponse;

	const url = new URL(request.url);
	const goal_id = url.searchParams.get('goal_id');
	const step = url.searchParams.get('step');
	if (!goal_id || !step) {
		return errorResponse('Missing required fields', 400);
	}
	console.log('env DB', env.DB);
	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	console.log('goal', goal);
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}

	if (goal.user_id !== authResponse.user.user_id) {
		return errorResponse('Unauthorized', 401);
	}

	const planItems = await env.DB.prepare(`SELECT * FROM PlanItems WHERE goal_id = ?`).bind(goal_id).all();
	const timelines = await env.DB.prepare(`SELECT * FROM Timelines WHERE goal_id = ?`).bind(goal_id).all();
	console.log('timelines', timelines);
	console.log('planItems', planItems);

	const selectedTimeline = timelines.results[parseInt(step) as number];
	const selectedTimeLinePlanItems = planItems.results.filter((item: any) => {
		return item.timeline_id === selectedTimeline.timeline_id;
	});
	console.log('selecttimeline ', selectedTimeline);

	const isLastStep = parseInt(step) === timelines.results.length - 1;

	return new Response(
		JSON.stringify({
			goal_name: goal.goal_name,
			goal_id: goal_id,
			timelineName: selectedTimeline.title,
			planItems: selectedTimeLinePlanItems,
			step: step,
			isLastStep: isLastStep,
		}),
		{
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		}
	);
};
