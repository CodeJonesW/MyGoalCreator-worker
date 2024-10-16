import { Env } from '../../types';
import { verifyToken } from '../../utils/auth';

export const goalByIdRoute = async (request: Request, env: Env): Promise<Response> => {
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	const url = new URL(request.url);
	const goal_id = url.searchParams.get('goal_id');

	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
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
