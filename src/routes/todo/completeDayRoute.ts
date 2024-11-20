import { Context } from 'hono';
import { errorResponse } from '../../utils/response_utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const completeDayRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	try {
		const { req: request, env } = context;
		const authResponse = await verifyToken(request.raw, env);
		if (authResponse instanceof Response) return authResponse;

		const req_datetime = request.header('datetime');
		const req_timezone = request.header('timezone');

		const user = authResponse.user;

		const dailyTodosCompletions = await env.DB.prepare(
			`
			SELECT *
			FROM DailyTodoCompletions
			WHERE user_id = ?
			`
		)
			.bind(user.user_id)
			.all();

		const completedToday = dailyTodosCompletions.results.some((completion: any) => {
			const completionDate = dayjs(completion.completed_at).tz(req_timezone).format('YYYY-MM-DD');
			const user_datetime = dayjs(req_datetime).format('YYYY-MM-DD');
			return completionDate === user_datetime;
		});

		if (completedToday) {
			return errorResponse('Todo already completed today', 403);
		}
		await env.DB.prepare(`INSERT INTO DailyTodoCompletions (user_id) VALUES (?)`).bind(user.user_id).run();
		return new Response(JSON.stringify({ message: 'success' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.log(error);
		return errorResponse('Internal server error', 500);
	}
};
