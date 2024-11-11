import { Context } from 'hono';
import { errorResponse } from '../../utils/response_utils';

export const createDailyTodoRoute = async (context: Context): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	try {
		const { req: request, env } = context;

		const authResponse = await verifyToken(request.raw, env);
		if (authResponse instanceof Response) return authResponse;

		const user = authResponse.user;

		const { todo }: any = await request.json();

		if (!todo) {
			return errorResponse('Todo is required', 400);
		}

		const { results } = await env.DB.prepare(`INSERT INTO DailyTodos (user_id, task) VALUES (?, ?) RETURNING *`)
			.bind(user.user_id, todo)
			.run();
		console.log('result', results);

		return new Response(JSON.stringify({ message: 'success', result: results[0] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.log(error);
		return errorResponse('Internal server error', 500);
	}
};
