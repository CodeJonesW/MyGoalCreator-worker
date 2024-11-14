import { Context } from 'hono';
import {
	findUserTrackedGoals,
	findUserRecentGoal,
	findUserClientData,
	findGoalsAndSubGoalsByUserId,
	getUserDailyTodos,
} from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';

export const profileRoute = async (context: Context): Promise<Response> => {
	const { req: request, env } = context;

	const { verifyToken } = await import('../../utils/auth');
	const authResponse = await verifyToken(request.raw, env);
	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const userFromDb = await findUserClientData(env, user.user_id);
	console.log('userFromDb', userFromDb);
	if (!userFromDb) {
		return errorResponse('User not found', 404);
	}

	const userGoals = await findGoalsAndSubGoalsByUserId(env, user.user_id, null);
	console.log('userGoals', userGoals);
	const recentGoal = await findUserRecentGoal(env, user.user_id);
	console.log('recentGoal', recentGoal);
	const trackedGoals = await findUserTrackedGoals(env, user.user_id);
	console.log('trackedGoals', trackedGoals);
	const showUiHelp = userGoals.length > 0 && !userGoals.some((goal) => goal.subgoals.length > 0);

	if (recentGoal) {
		const recentGoalId = recentGoal.goal_id;
		const isRecentGoalTracked = trackedGoals.results.filter((goal) => goal.goal_id === recentGoalId).length > 0;
		recentGoal.isGoalTracked = isRecentGoalTracked;
	}

	if (userGoals.length > 0) {
		userGoals.forEach((goal) => {
			const isGoalTracked = trackedGoals.results.filter((trackedGoal) => trackedGoal.goal_id === goal.goal_id).length > 0;
			goal.isGoalTracked = isGoalTracked;
		});
	}

	const dailyTodos = await getUserDailyTodos(user.user_id, env);
	console.log('dailyTodos', dailyTodos);

	const dailyTodosCompletions = await env.DB.prepare(
		`
	  SELECT *
	  FROM DailyTodoCompletions
	  WHERE user_id = ?
	`
	)
		.bind(user.user_id)
		.all();

	const today = new Date().toISOString().split('T')[0];
	const dailyTodosCompletedToday = await env.DB.prepare(
		`
            SELECT *
            FROM DailyTodoCompletions
            WHERE user_id = ?
              AND DATE(completed_at) = DATE(?)
        `
	)
		.bind(user.user_id, today)
		.first();

	console.log('dailyTodosCompletedToday', dailyTodosCompletedToday);

	const responseData = {
		user: userFromDb,
		goals: userGoals,
		recentGoal: recentGoal ? recentGoal : null,
		trackedGoals: trackedGoals.results,
		showUiHelp: showUiHelp,
		dailyTodos: dailyTodos.results,
		dailyTodosCompletions: dailyTodosCompletions.results,
		dailyTodosCompletedToday: dailyTodosCompletedToday ? true : false,
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
