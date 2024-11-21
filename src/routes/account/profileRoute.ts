import { Context } from 'hono';
import {
	findUserTrackedGoals,
	findUserRecentGoal,
	findUserClientData,
	findGoalsAndSubGoalsByUserId,
	getUserDailyTodos,
} from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const profileRoute = async (context: Context): Promise<Response> => {
	const { req: request, env } = context;

	const { verifyToken } = await import('../../utils/auth');
	const authResponse = await verifyToken(request.raw, env);
	if (authResponse instanceof Response) return authResponse;

	const user = authResponse.user;

	const userFromDb = await findUserClientData(env, user.user_id);
	if (!userFromDb) {
		return errorResponse('User not found', 404);
	}

	const userGoals = await findGoalsAndSubGoalsByUserId(env, user.user_id, null);
	const recentGoal = await findUserRecentGoal(env, user.user_id);
	const trackedGoals = await findUserTrackedGoals(env, user.user_id);
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
	const dailyTodosCompletions = await env.DB.prepare(
		`
	  SELECT *
	  FROM DailyTodoCompletions
	  WHERE user_id = ?
	`
	)
		.bind(user.user_id)
		.all();

	const req_datetime = request.header('datetime');
	const req_timezone = request.header('timezone');

	const completedToday = dailyTodosCompletions.results.some((completion: any) => {
		const completionDate = dayjs(completion.completed_at).tz(req_timezone).format('YYYY-MM-DD');
		const user_datetime = dayjs(req_datetime).format('YYYY-MM-DD');
		return completionDate === user_datetime;
	});

	const dailyTodoCompletionsInUserTimezone = dailyTodosCompletions.results.map((completion: any) => {
		return {
			...completion,
			completed_at: dayjs(completion.completed_at).tz(req_timezone).format('YYYY-MM-DD HH:mm:ss'),
		};
	});

	const responseData = {
		user: userFromDb,
		goals: userGoals,
		recentGoal: recentGoal ? recentGoal : null,
		trackedGoals: trackedGoals.results,
		showUiHelp: showUiHelp,
		dailyTodos: dailyTodos.results,
		dailyTodosCompletions: dailyTodoCompletionsInUserTimezone,
		dailyTodosCompletedToday: completedToday ? true : false,
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
