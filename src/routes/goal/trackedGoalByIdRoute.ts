import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { errorResponse } from '../../utils/response_utils';

export const trackedGoalByIdRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const url = new URL(request.url);
	const goal_id = url.searchParams.get('goal_id');
	const step = url.searchParams.get('step');
	if (!goal_id || !step) {
		return errorResponse('Missing required fields', 400);
	}

	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}

	const planItems = await env.DB.prepare(`SELECT * FROM PlanItems WHERE goal_id = ?`).bind(goal_id).all();
	const timelines = await env.DB.prepare(`SELECT * FROM Timelines WHERE goal_id = ?`).bind(goal_id).all();

	const selectedTimeline = timelines.results[parseInt(step) as number];
	const selectedTimeLinePlanItems = planItems.results.filter((item) => {
		return item.timeline_id === selectedTimeline.timeline_id;
	});

	const isLastStep = parseInt(step) === timelines.results.length - 1;

	return new Response(
		JSON.stringify({
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
