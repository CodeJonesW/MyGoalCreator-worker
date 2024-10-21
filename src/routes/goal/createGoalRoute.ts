import { Env } from '../../types';
import { createGoal } from '../../utils/ai_completions';
import { errorResponse } from '../../utils/response_utils';

export const createGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const { verifyToken } = await import('../../utils/auth');
	const { checkIfUserHasAnalyzeRequests } = await import('../../utils/db/db_queries');
	try {
		const authResponse = await verifyToken(request, env);
		if (authResponse instanceof Response) return authResponse;

		const user = authResponse.user;
		const hasAnalyzeRequests = await checkIfUserHasAnalyzeRequests(user.user_id, env);
		if (!hasAnalyzeRequests) {
			return errorResponse('No analyze requests left', 400);
		}

		const { goal, prompt: areaOfFocus, timeline }: any = await request.json();

		if (!goal) {
			return errorResponse('Goal is required', 400);
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
		return errorResponse('Internal server error', 500);
	}
};
