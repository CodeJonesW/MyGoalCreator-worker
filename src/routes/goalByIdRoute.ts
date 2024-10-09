import { Env } from '../types';
import { verifyToken } from '../utils/auth';

export const goalByIdRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const { goalId }: any = await request.json();

	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE GoalId = ?`).bind(goalId).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	return new Response(JSON.stringify({ goal }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
