import { Context } from 'hono';
import { errorResponse } from '../../utils/response_utils';

export const deleteDailyTodoRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	try {
		const { req: request, env } = context;

		const authResponse = await verifyToken(request.raw, env);
		if (authResponse instanceof Response) return authResponse;

		const user = authResponse.user;

		const { daily_todo_id, completed }: any = await request.json();

		if (!daily_todo_id) {
			return errorResponse('Todo ID is required', 400);
		}

		const { results } = await env.DB.prepare(`DELETE FROM DailyTodos WHERE user_id = ? AND daily_todo_id = ?`)
			.bind(user.user_id, daily_todo_id)
			.run();

		return new Response(JSON.stringify({ message: 'success', result: results[0] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.log(error);
		return errorResponse('Internal server error', 500);
	}
};
