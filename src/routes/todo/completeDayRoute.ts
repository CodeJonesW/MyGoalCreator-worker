import { Context } from 'hono';
import { errorResponse } from '../../utils/response_utils';
export const completeDayRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	try {
		const { req: request, env } = context;
		const authResponse = await verifyToken(request.raw, env);
		if (authResponse instanceof Response) return authResponse;
		const user = authResponse.user;
		const today = new Date().toISOString().split('T')[0];
		const result = await env.DB.prepare(
			`
            SELECT *
            FROM DailyTodoCompletions
            WHERE user_id = ?
              AND DATE(completed_at) = DATE(?)
        `
		)
			.bind(user.user_id, today)
			.first();
		if (result) {
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
