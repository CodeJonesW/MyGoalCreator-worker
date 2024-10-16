import { Env } from '../../types';
import OpenAI from 'openai';
import { verifyToken } from '../../utils/auth';
import { checkIfUserHasAnalyzeRequests } from '../../utils/db_queries';
import { createGoal } from '../../utils/ai_completions';

export const createGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	try {
		const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
		const authResponse = await verifyToken(request, env);
		if (authResponse instanceof Response) return authResponse;

		const user = authResponse.user;
		const hasAnalyzeRequests = await checkIfUserHasAnalyzeRequests(user.user_id, env);
		if (!hasAnalyzeRequests) {
			return new Response(JSON.stringify({ error: 'No analyze requests left' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { goal, prompt: areaOfFocus, timeline }: any = await request.json();

		if (!goal) {
			return new Response(JSON.stringify({ error: 'URL is required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const stream = await createGoal(env, goal, areaOfFocus, timeline, user);

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.log(error);
		// @ts-ignore
		return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
