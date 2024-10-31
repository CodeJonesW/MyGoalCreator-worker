import { Env, Goal } from '../../types';
import { parseGoalPlanHeadersAndContent } from '../../utils/md_parser';
import { generatePreparedStatementsForTimelinesAndPlanItems } from '../../utils/db/query_gen';
import { getLatestPlanItemId, getLatestTimelineId } from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';
import { Context } from 'hono';

export const trackGoalRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const { getGoalById } = await import('../../utils/db/db_queries');
	const { req: request, env: contextEnv } = context;
	const { env } = contextEnv.Bindings;

	const authResponse = await verifyToken(request.raw, env);
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
		const trackedGoal = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE goal_id = ?`).bind(goal.goal_id).first();
		if (trackedGoal) {
			return new Response(JSON.stringify({ message: 'Goal already tracked' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { success } = await env.DB.prepare(`INSERT INTO TrackedGoals (goal_id, user_id) VALUES (?, ?)`).bind(goal_id, user.user_id).run();
		if (success) {
			const timeLineExists = await env.DB.prepare('SELECT * FROM Timelines WHERE goal_id = ?').bind(goal_id).first();
			if (!timeLineExists) {
				await parseGoalAndInsertTimelineAndPlanItems(env, goal as Goal);
			}

			return new Response(JSON.stringify({ message: 'Goal tracked successfully' }), {
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

const parseGoalAndInsertTimelineAndPlanItems = async (env: Env, goal: Goal) => {
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
};
