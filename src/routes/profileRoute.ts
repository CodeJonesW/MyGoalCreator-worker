import { Env } from '../types';
import { checkUserFirstLogin, findUserTrackedGoal, findUserRecentGoal, findUserClientData, findUserGoals } from '../utils/db_queries';

export const profileRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../utils/auth');
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const userFromDb = await findUserClientData(env, user.user_id);
	if (!userFromDb) {
		return new Response(JSON.stringify({ error: 'User not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const goalsQuery = await findUserGoals(env, user.user_id);
	const recentGoal = await findUserRecentGoal(env, user.user_id);
	const trackedGoal = await findUserTrackedGoal(env, user.user_id);
	const auths = await checkUserFirstLogin(env, user.user_id);
	const is_first_login = auths.results.length <= 1 ? true : false;
	const showUiHelp = is_first_login && goalsQuery.results.length === 0;

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
