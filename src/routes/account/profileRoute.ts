import { Env } from '../../types';
import { checkUserFirstLogin, findUserTrackedGoal, findUserRecentGoal, findUserClientData, findUserGoals } from '../../utils/db/db_queries';
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

	const goalsQuery = await findUserGoals(env, user.user_id);
	const recentGoal = await findUserRecentGoal(env, user.user_id);
	const trackedGoal = await findUserTrackedGoal(env, user.user_id);
	const auths = await checkUserFirstLogin(env, user.user_id);
	const is_first_login = auths.results.length <= 1 ? true : false;
	const showUiHelp = is_first_login && goalsQuery.results.length === 0;

	if (recentGoal) {
		const trackedGoal = await env.DB.prepare(`SELECT * FROM TrackedGoals WHERE goal_id = ? AND user_id = ?`)
			.bind(recentGoal.goal_id, user.user_id)
			.first();
		recentGoal.isGoalTracked = trackedGoal ? true : false;
	}

	const responseData = {
		user: userFromDb,
		goals: goalsQuery.results,
		recentGoal: recentGoal ? recentGoal : null,
		trackedGoal: trackedGoal ? trackedGoal : null,
		showUiHelp: showUiHelp,
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
