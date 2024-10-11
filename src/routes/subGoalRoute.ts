import { Env } from '../types';
import OpenAI from 'openai';
import { verifyToken } from '../utils/auth';

export const createSubGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	// Extract the required fields from the request body
	const { goalId, sub_goal_name, line_number }: any = await request.json();

	// Check if the goal exists
	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE GoalId = ?`).bind(goalId).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const subGoal = await env.DB.prepare(`SELECT * FROM SubGoals WHERE GoalId = ? AND sub_goal_name = ?`).bind(goalId, sub_goal_name).first();
	if (subGoal) {
		return new Response(JSON.stringify({ message: 'success', subGoal }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { goal_name, plan } = goal;
	const completion = await openai.chat.completions.create({
		stream: false,
		messages: [
			{
				role: 'system',
				content: `You are an expert in the field of ${goal_name} and are helping the user achieve their goal.`,
			},
			{ role: 'user', content: `I need to ${sub_goal_name}.` },
			{ role: 'system', content: `Design a plan and provide resources to help the user achieve their goal` },
			{
				role: 'system',
				content: `Please format your response in valid Markdown, adhering to the following:
				- Use headings with "#" for levels (e.g., "#", "##").
				- Use "- " for bullet points and "1." for numbered lists.
				- Line breaks should use two trailing spaces.
				- Enclose code blocks with triple backticks (\`\`\`).
				- Avoid empty lines in bullet points or lists.
			  
				Ensure the Markdown is clean and easy to copy into any Markdown editor.`,
			},
		],
		model: 'gpt-4o-mini',
	});
	try {
		const result = await env.DB.prepare(`INSERT INTO SubGoals (GoalId, sub_goal_name, plan, line_number) VALUES (?, ?, ?, ?)`)
			// @ts-ignore
			.bind(goalId, sub_goal_name, completion.choices[0].message.content, line_number)
			.run();

		if (result.success) {
			return new Response(
				JSON.stringify({
					message: 'SubGoal created successfully',
					subGoal: {
						sub_goal_name,
						plan: completion.choices[0].message.content,
						line_number,
						// @ts-ignore
						subGoalId: result.lastInsertRowid,
					},
				}),
				{
					status: 201,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		} else {
			throw new Error('Failed to insert subgoal');
		}
	} catch (error) {
		console.log(error);
		// @ts-ignore
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
