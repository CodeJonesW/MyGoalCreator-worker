import { Env } from '../types';
import OpenAI from 'openai';
import { verifyToken } from '../utils/auth';

export const createSubGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	console.log('Create SubGoal Route');
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	// Extract the required fields from the request body
	const { goal_id, sub_goal_name, line_number }: any = await request.json();
	console.log('goal_id', goal_id, 'SubGoalName', sub_goal_name, 'LineNumber', line_number);

	// Check if the goal exists
	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	console.log('Goal found', goal);

	const subGoal = await env.DB.prepare(`SELECT * FROM SubGoals WHERE goal_id = ? AND sub_goal_name = ?`)
		.bind(goal_id, sub_goal_name)
		.first();
	if (subGoal) {
		return new Response(JSON.stringify({ message: 'success', subGoal }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	console.log('Goal found', goal);
	const { goal_name, plan } = goal;
	const completion = await openai.chat.completions.create({
		stream: false,
		messages: [
			{
				role: 'system',
				content: `You are an expert in the field of ${goal_name} and are helping the user achieve their goal.`,
			},
			{ role: 'user', content: `I need to ${sub_goal_name}.` },
			{ role: 'system', content: `Explain the steps to achieve this goal and provide resources.` },
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
		const result = await env.DB.prepare(`INSERT INTO SubGoals (goal_id, sub_goal_name, plan, line_number) VALUES (?, ?, ?, ?)`)
			// @ts-ignore
			.bind(goal_id, sub_goal_name, completion.choices[0].message.content, line_number)
			.run();
		console.log('SubGoal created successfully', result);

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
			console.log('Failed to insert subgoal');
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
