import { Context } from 'hono';
import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';
import { errorResponse } from '../../utils/response_utils';

export const updatePlanItemRoute = async (context: Context): Promise<Response> => {
	const { req: request, env } = context;
	const authResponse = await verifyToken(request.raw, env);
	if (authResponse instanceof Response) return authResponse;
	const { plan_item_id, status }: any = await request.json();

	const plan_item = await env.DB.prepare(`SELECT * FROM PlanItems WHERE plan_item_id = ?`).bind(plan_item_id).first();
	if (!plan_item) {
		return errorResponse('Goal not found', 404);
	}

	const { success } = await env.DB.prepare(`UPDATE PlanItems SET item_status = ? WHERE plan_item_id = ?`).bind(status, plan_item_id).run();
	if (!success) {
		return errorResponse('Failed to update plan item', 500);
	}

	return new Response(JSON.stringify({ message: 'Plan item updated successfully' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
