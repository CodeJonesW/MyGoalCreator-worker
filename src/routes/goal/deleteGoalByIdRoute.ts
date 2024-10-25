import { verifyToken } from '../../utils/auth';
import { Env } from '../../types';
import { errorResponse } from '../../utils/response_utils';

export const deleteGoalByIdRoute = async (request: Request, env: Env): Promise<Response> => {
	try {
		const authResponse = await verifyToken(request, env);
		if (authResponse instanceof Response) return authResponse;

		const { goal_id }: any = await request.json();

		const recursivelyDeleteSubGoals = async (goalId: number): Promise<void> => {
			const subGoals = await env.DB.prepare(`SELECT goal_id FROM Goals WHERE parent_goal_id = ?`).bind(goalId).all();

			if (subGoals.results.length > 0) {
				for (const subGoal of subGoals.results) {
					await recursivelyDeleteSubGoals(subGoal.goal_id as number);
				}

				await env.DB.prepare(`DELETE FROM Goals WHERE parent_goal_id = ?`).bind(goalId).run();
			}
		};

		const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
		if (!goal) {
			return errorResponse('Goal not found', 404);
		}

		await recursivelyDeleteSubGoals(goal.goal_id as number);

		try {
			await env.DB.prepare(`DELETE FROM TrackedGoals WHERE goal_id = ?`).bind(goal.goal_id).run();
			await env.DB.prepare(`DELETE FROM PlanItems WHERE goal_id = ?`).bind(goal.goal_id).run();
			await env.DB.prepare(`DELETE FROM Timelines WHERE goal_id = ?`).bind(goal.goal_id).run();
			await env.DB.prepare(`DELETE FROM Goals WHERE goal_id = ?`).bind(goal.goal_id).run();
		} catch (error) {
			console.log('Error deleting goal data', error);
			return errorResponse('Failed to delete goal data', 500);
		}

		return new Response(JSON.stringify({ message: 'success' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.log('Error deleting goal', error);
		return errorResponse('Failed to delete goal', 500);
	}
};
