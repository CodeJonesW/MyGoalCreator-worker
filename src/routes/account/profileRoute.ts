import { Env } from '../../types';
import {
	checkUserFirstLogin,
	findUserTrackedGoals,
	findUserRecentGoal,
	findUserClientData,
	findUserGoals,
} from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';

export const profileRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const userFromDb = await findUserClientData(env, user.user_id);
	if (!userFromDb) {
		return errorResponse('User not found', 404);
	}

	const userGoals = await findUserGoals(env, user.user_id);
	const recentGoal = await findUserRecentGoal(env, user.user_id);
	const trackedGoals = await findUserTrackedGoals(env, user.user_id);
	const auths = await checkUserFirstLogin(env, user.user_id);
	const is_first_login = auths.results.length <= 1 ? true : false;
	const showUiHelp = is_first_login && userGoals.results.length === 0;

	if (recentGoal) {
		const recentGoalId = recentGoal.goal_id;
		const isRecentGoalTracked = trackedGoals.results.filter((goal) => goal.goal_id === recentGoalId).length > 0;
		recentGoal.isGoalTracked = isRecentGoalTracked;
	}

	if (userGoals.results.length > 0) {
		userGoals.results.forEach((goal) => {
			const isGoalTracked = trackedGoals.results.filter((trackedGoal) => trackedGoal.goal_id === goal.goal_id).length > 0;
			goal.isGoalTracked = isGoalTracked;
		});
	}

	const responseData = {
		user: userFromDb,
		goals: userGoals.results,
		recentGoal: recentGoal ? recentGoal : null,
		trackedGoals: trackedGoals.results,
		showUiHelp: showUiHelp,
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
