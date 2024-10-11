import { Env } from './types';
import { loginRoute } from './routes/loginRoute';
import { profileRoute } from './routes/profileRoute';
import { analyzeRoute } from './routes/analyzeRoute';
import { goalByIdRoute } from './routes/goalByIdRoute';
import { registerRoute } from './routes/registerRoute';
import { createSubGoalRoute } from './routes/subGoalRoute';

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (pathname === '/api/register') {
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
			return await goalByIdRoute(request, env);
		}

		if (pathname === '/api/subgoal') {
			return await createSubGoalRoute(request, env);
		}

		return new Response('Not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
