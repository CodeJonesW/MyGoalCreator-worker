import { verifyToken } from '../../utils/auth';
import { Env } from '../../types';

export const deleteGoalByIdRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	console.log('deleteGoalByIdRoute');

	const { goal_id }: any = await request.json();

	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// remove all subgoals
	const { success: subGoalSuccess } = await env.DB.prepare(`DELETE FROM SubGoals WHERE goal_id = ?`).bind(goal.goal_id).run();
	if (!subGoalSuccess) {
		console.log('Failed to delete subgoals', subGoalSuccess);
		throw new Error('Failed to delete subgoals');
	}
	console.log('deleted subgoals');

	// remove tracked goal if it exists
	const trackedGoal = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE goal_id = ?`).bind(goal.goal_id).first();
	if (trackedGoal) {
		await env.DB.prepare(`DELETE FROM TrackedGoals WHERE goal_id = ?`).bind(goal.goal_id).run();
	}

	const { success } = await env.DB.prepare(`DELETE FROM Goals WHERE goal_id = ?`).bind(goal_id).run();
	if (success) {
		return new Response(JSON.stringify({ message: 'success' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} else {
		console.log('Failed to delete goal');
		throw new Error('Failed to delete goal');
	}
};
