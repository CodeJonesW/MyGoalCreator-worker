import { verifyToken } from './utils/auth';
import OpenAI from 'openai';
import { Env } from './types';
import { loginRoute } from './routes/loginRoute';
import { profileRoute } from './routes/profileRoute';
import { checkIfUserHasAnalyzeRequests } from './utils/db_queries';
import { analyzeRoute } from './routes/analyzeRoute';

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);
		console.log('pathname', pathname);

		if (pathname === '/api/register') {
			const { registerRoute } = await import('./routes/registerRoute');
			return await registerRoute(request, env);
		}

		if (pathname === '/api/login') {
			return await loginRoute(request, env);
		}

		if (pathname === '/api/profile') {
			return await profileRoute(request, env);
		}

		if (pathname === '/api/analyze') {
			return await analyzeRoute(request, env);
		}

		if (pathname.startsWith('/api/goal')) {
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
		}

		return new Response('TubeScriptAiWorker');
	},
} satisfies ExportedHandler<Env>;
