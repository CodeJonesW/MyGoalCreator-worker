import OpenAI from 'openai';
import { Env } from '../types';

export const createSubGoal = async (env: Env, goal: any, sub_goal_name: string, line_number: number) => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

	const { goal_name, plan, goal_id } = goal;

	await env.DB.prepare(`INSERT INTO SubGoals (goal_id, sub_goal_name, line_number) VALUES (?, ?, ?)`)
		.bind(goal_id, sub_goal_name, line_number)
		.run();

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
				- Do not use bullet points or numbered lists.
				Ensure the Markdown is clean and easy to copy into any Markdown editor.`,
			},
		],
		model: 'gpt-4o-mini',
	});
	let buffer = '';
	let rawTotalResponse = '';
	try {
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				for await (const chunk of completion) {
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
								controller.enqueue(encoder.encode(line));
							}
						});
					}
				}

				if (buffer) {
					controller.enqueue(encoder.encode(buffer));
				}

				controller.enqueue(encoder.encode(`event: done\n\n`));
				const updateResult = await env.DB.prepare(`UPDATE SubGoals SET plan = ? WHERE sub_goal_id = ?`)
					// @ts-ignore
					.bind(rawTotalResponse, result.meta.last_row_id)
					.run();
				controller.close();
			},
		});
		return stream;
	} catch (error) {
		console.error(error);
		throw error;
	}
};
