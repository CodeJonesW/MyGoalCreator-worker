import { Env } from '../../types';
import { parseGoalPlanHeadersAndContent } from '../../utils/md_parser';
import { generatePreparedStatementsForTimelinesAndPlanItems } from '../../utils/db/query_gen';
import { getLatestPlanItemId, getLatestTimelineId } from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';

export const trackGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const { getGoalById } = await import('../../utils/db/db_queries');
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;
	const user = authResponse.user;

	const { goal_id }: any = await request.json();

	if (!goal_id) {
		return errorResponse('Missing goal_id', 400);
	}
	const goal = await getGoalById(env, goal_id);
	if (!goal) {
		return errorResponse('Goal not found', 404);
	}

	try {
		const trackedGoal = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE user_id = ?`).bind(user.user_id).first();
		if (trackedGoal) {
			await env.DB.prepare(`DELETE FROM TrackedGoals WHERE user_id = ?`).bind(user.user_id).run();
		}
		const { success } = await env.DB.prepare(`INSERT INTO TrackedGoals (goal_id, user_id) VALUES (?, ?)`).bind(goal_id, user.user_id).run();
		if (success) {
			const parsed = parseGoalPlanHeadersAndContent(goal);
			const latestTimelineId = await getLatestTimelineId(env);
			const latestPlanItemId = await getLatestPlanItemId(env);
			const statements = generatePreparedStatementsForTimelinesAndPlanItems(
				env.DB,
				parsed,
				latestTimelineId as number,
				latestPlanItemId as number,
				goal.goal_id as number
			);
			await env.DB.batch(statements);
			console.log('Batch execution completed successfully.');

			return new Response(JSON.stringify({ message: 'User added successfully' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			return errorResponse('Failed to insert trackedgoal', 500);
		}
	} catch (error) {
		console.log('Error tracking goal', error);
		return errorResponse('Failed to insert trackedgoal', 500);
	}
};
