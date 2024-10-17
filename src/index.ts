import { Env } from './types';
import {
	registerRoute,
	trackGoalRoute,
	createSubGoalRoute,
	goalByIdRoute,
	createGoalRoute,
	profileRoute,
	loginRoute,
	deleteGoalByIdRoute,
} from './routes';

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (pathname === '/api/analyze') {
			return await createGoalRoute(request, env);
		}

		if (pathname.startsWith('/api/goal')) {
			if (request.method === 'GET') {
				return await goalByIdRoute(request, env);
			}
			if (request.method === 'DELETE') {
				return await deleteGoalByIdRoute(request, env);
			}
		}

		if (pathname === '/api/login') {
			return await loginRoute(request, env);
		}

		if (pathname === '/api/profile') {
			return await profileRoute(request, env);
		}

		if (pathname === '/api/register') {
			return await registerRoute(request, env);
		}

		if (pathname === '/api/subgoal') {
			return await createSubGoalRoute(request, env);
		}

		if (pathname === '/api/trackGoal') {
			return await trackGoalRoute(request, env);
		}

		return new Response('Not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
