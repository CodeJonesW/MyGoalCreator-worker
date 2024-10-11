import { Env } from '../types';
import OpenAI from 'openai';
import { verifyToken } from '../utils/auth';

export const createSubGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	// Extract the required fields from the request body
	const { goalId, sub_goal_name, lineLocation }: any = await request.json();

	// Check if the goal exists
	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE GoalId = ?`).bind(goalId).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { goal_name, plan } = goal;
	console.log(openai.chat.completions);
	const completion = await openai.chat.completions.create({
		stream: true,
		messages: [
			{
				role: 'system',
				content: `You are an expert in the field of ${goal_name} and are helping the user achieve their goal.`,
			},
			{ role: 'user', content: `I need to ${sub_goal_name}.` },
			{ role: 'system', content: `Find resources to help the user achieve their goal` },
			{
				role: 'system',
				content: `Please format your response in valid Markdown. Ensure that:
                - Headings use proper Markdown syntax (e.g., "#", "##").
                - Lists are correctly formatted using "-" for unordered lists or "1.", "2." for ordered lists.
                - New lines are indicated by two trailing spaces for line breaks.
                - Code blocks are properly enclosed with triple backticks (\`\`\`) for both inline and block code.
                - Bold and italics are properly marked with double asterisks ("**") or underscores ("_").
                
                Ensure the Markdown is easy to copy and paste into any Markdown editor.`,
			},
		],
		model: 'gpt-4o-mini',
	});

	// Insert the subgoal into the SubGoals table
	try {
		const result = await env.DB.prepare(`INSERT INTO SubGoals (GoalId, sub_goal_name, plan, lineLocation) VALUES (?, ?, ?, ?)`)
			.bind(goalId, sub_goal_name, plan, lineLocation)
			.run();

		if (result.success) {
			// @ts-ignore
			return new Response(JSON.stringify({ message: 'SubGoal created successfully', subGoalId: result.lastInsertId }), {
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			throw new Error('Failed to insert subgoal');
		}
	} catch (error) {
		// @ts-ignore
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
