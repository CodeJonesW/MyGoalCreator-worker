import { Env } from '../types';
import OpenAI from 'openai';
import { verifyToken } from '../utils/auth';

export const createSubGoalRoute = async (request: Request, env: Env): Promise<Response> => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	// Extract the required fields from the request body
	const { goal_id, sub_goal_name, line_number }: any = await request.json();

	if (!goal_id || !sub_goal_name || !line_number) {
		console.log('Missing required fields', { goal_id, sub_goal_name, line_number });
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Check if the goal exists
	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const subGoal = await env.DB.prepare(`SELECT * FROM SubGoals WHERE goal_id = ? AND sub_goal_name = ?`)
		.bind(goal_id, sub_goal_name)
		.first();
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
			{ role: 'system', content: `You are aware the user is trying to achieve ${goal_name} via this plan: ${plan}` },
			{ role: 'user', content: `My goal is ${sub_goal_name}.` },
			{ role: 'system', content: `Explain the steps to achieve this goal and provide resources.` },
			{
				role: 'system',
				content: `Please format your response in valid Markdown, adhering to the following:
				- Use headings with "#" for levels (e.g., "#", "##").
				- Use "- " for bullet points
				- Do not use bullets with headings.
				- Line breaks should use two trailing spaces.
				- Enclose code blocks with triple backticks (\`\`\`).
				- Avoid empty lines in bullet points or lists.
				- Use a divider (---) between sections.
				- Use 4 spaces prior to nested bullet points.
			  
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

		if (result.success) {
			return new Response(
				JSON.stringify({
					message: 'SubGoal created successfully',
					subGoal: {
						sub_goal_name,
						plan: completion.choices[0].message.content,
						line_number,
						// @ts-ignore
						sub_goal_id: result.lastInsertRowid,
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

export const createSubGoalRouteV2 = async (request: Request, env: Env): Promise<Response> => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	const authResponse = await verifyToken(request, env);
	if (authResponse instanceof Response) return authResponse;

	// Extract the required fields from the request body
	const { goal_id, sub_goal_name, line_number }: any = await request.json();
	console.log('params', goal_id, sub_goal_name, line_number);

	if (!goal_id || !sub_goal_name || !line_number) {
		console.log('Missing required fields', { goal_id, sub_goal_name, line_number });
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Check if the goal exists
	const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE goal_id = ?`).bind(goal_id).first();
	if (!goal) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const subGoal = await env.DB.prepare(`SELECT * FROM SubGoals WHERE goal_id = ? AND sub_goal_name = ?`)
		.bind(goal_id, sub_goal_name)
		.first();
	if (subGoal) {
		return new Response(JSON.stringify({ message: 'success', subGoal }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const { goal_name, plan } = goal;
	const result = await env.DB.prepare(`INSERT INTO SubGoals (goal_id, sub_goal_name, line_number) VALUES (?, ?, ?)`)
		.bind(goal_id, sub_goal_name, line_number)
		.run();

	console.log('result from subgoal insert', result);

	const completion = await openai.chat.completions.create({
		stream: true,
		messages: [
			{
				role: 'system',
				content: `You are an expert in the field of ${goal_name} and are helping the user achieve their goal.`,
			},
			{ role: 'system', content: `You are aware the user is trying to achieve ${goal_name} via this plan: ${plan}` },
			{ role: 'user', content: `My goal is ${sub_goal_name}.` },
			{ role: 'system', content: `Explain the steps to achieve this goal and provide resources.` },
			{
				role: 'system',
				content: `Please format your response in valid Markdown, adhering to the following:
				- Use headings with "#" for levels (e.g., "#", "##").
				- Use "- " for bullet points
				- Do not use bullets with headings.
				- Line breaks should use two trailing spaces.
				- Enclose code blocks with triple backticks (\`\`\`).
				- Avoid empty lines in bullet points or lists.
				- Use a divider (---) between sections.
				- Use 4 spaces prior to nested bullet points.
			  
				Ensure the Markdown is clean and easy to copy into any Markdown editor.`,
			},
		],
		model: 'gpt-4o-mini',
	});
	let buffer = '';
	let rawTotalResponse = '';
	console.log('starting stream');
	try {
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				for await (const chunk of completion) {
					console.log('chunk', chunk);
					let content = chunk.choices[0]?.delta?.content;

					if (content) {
						rawTotalResponse += content;
						buffer += content;

						let lines = buffer.split(/(?=\n|^#{1,4}|\s-\s|\n\s\*\s|\n\d+\.\s)/);
						buffer = '';

						lines.forEach((line, index) => {
							if (index === lines.length - 1 && !line.endsWith('\n')) {
								buffer = line;
							} else {
								controller.enqueue(encoder.encode(line + '\n'));
							}
						});
					}
				}

				if (buffer) {
					controller.enqueue(encoder.encode(buffer));
				}

				controller.enqueue(encoder.encode(`event: done\n\n`));

				controller.close();
			},
		});
		console.log('stream created');
		const updateResult = await env.DB.prepare(`UPDATE SubGoals SET plan = ? WHERE sub_goal_id = ?`)
			// @ts-ignore
			.bind(rawTotalResponse, result.meta.last_row_id)
			.run();

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
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
