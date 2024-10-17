import OpenAI from 'openai';
import { Env } from '../types';

const markdownPrompt = `Please format your response in valid Markdown, adhering to the following:
				- Use headings with "#" for levels (e.g., "#", "##", "###").
				- Mark the end of lists with a new line.
				- Mark headings and subheadings with a new line.
				- Do not use numbers in headings.
				- Do not bold or italicize text.
				Ensure the Markdown is clean and easy to copy into any Markdown editor.`;

export const createGoal = async (env: Env, goal: any, areaOfFocus: any, timeline: any, user: any) => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	const completion = await openai.chat.completions.create({
		stream: true,
		messages: [
			{
				role: 'system',
				content: `You are an expert in the field of ${goal}`,
			},
			{ role: 'user', content: `My goal is to ${goal}. ${areaOfFocus ? `My areas of focus are ${areaOfFocus}` : ''}` },
			{
				role: 'system',
				content: `You are passionate about explaining sub points of the goal in detail`,
			},
			{ role: 'system', content: `Outline detailed plan to achieve the goal in ${timeline}.` },
			{ role: 'system', content: `Expand or contract the plan relative to the length of the goal's timeline.` },
			{
				role: 'system',
				content: markdownPrompt,
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

				try {
					await env.DB.prepare(`UPDATE Users SET analyze_requests = analyze_requests - 1 WHERE user_id = ?`).bind(user.user_id).run();
					await env.DB.prepare(`INSERT INTO Goals (user_id, goal_name, plan, time_line, aof) VALUES (?, ?, ?, ?, ?)`)
						.bind(user.user_id, goal, rawTotalResponse, timeline, areaOfFocus ? `My areas of focus are ${areaOfFocus}` : '')
						.run();
				} catch (error) {
					console.log('Error saving goal:', error);
				}

				controller.close();
			},
		});
		return stream;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const createSubGoal = async (env: Env, goal: any, sub_goal_name: string, line_number: number) => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

	const { goal_name, plan, goal_id } = goal;

	const result = await env.DB.prepare(`INSERT INTO SubGoals (goal_id, sub_goal_name, line_number) VALUES (?, ?, ?)`)
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
				content: markdownPrompt,
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
