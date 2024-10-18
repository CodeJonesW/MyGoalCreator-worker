import { getGoalById } from './db_queries';
import { Env } from '../types';
import { errorResponse } from './response_utils';

export const parseGoalPlanHeaders = async (goal_id: any, env: Env) => {
	const goal = await getGoalById(env, goal_id);
	if (!goal) {
		console.log('Goal not found in parseGoalForPlan');
		return errorResponse('Goal not found', 404);
	}
	const plan = goal.plan;
	const planLines = (plan as string).split('\n');
	console.log(planLines);

	const headers: string[] = [];
	(planLines as []).forEach((line: string) => {
		console.log(line);
		if (/^#/m.test(line) || /^##/m.test(line)) {
			headers.push(line);
		}
	});
	return headers;
};
