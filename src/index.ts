import { Env } from './types';
import {
	registerRoute,
	trackGoalRoute,
	createSubGoalRoute,
	goalByIdRoute,
	analyzeRoute,
	profileRoute,
	loginRoute,
	createSubGoalRouteV2,
	deleteGoalByIdRoute,
} from './routes';

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);
		console.log(pathname);

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

		if (pathname === '/api/deletegoal') {
			return await deleteGoalByIdRoute(request, env);
		}

		if (pathname === '/api/subgoal') {
			return await createSubGoalRoute(request, env);
		}

		if (pathname === '/api/subgoalv2') {
			return await createSubGoalRouteV2(request, env);
		}

		if (pathname === '/api/trackGoal') {
			return await trackGoalRoute(request, env);
		}

		return new Response('Not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
