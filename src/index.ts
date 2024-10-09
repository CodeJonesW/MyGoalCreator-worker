import { Env } from './types';
import { loginRoute } from './routes/loginRoute';
import { profileRoute } from './routes/profileRoute';
import { analyzeRoute } from './routes/analyzeRoute';
import { goalByIdRoute } from './routes/goalByIdRoute';

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);

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
			return goalByIdRoute(request, env);
		}

		return new Response('TubeScriptAiWorker');
	},
} satisfies ExportedHandler<Env>;
