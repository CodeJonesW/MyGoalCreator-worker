import OpenAI from 'openai';
import { Env } from '../types';
import { raw } from 'hono/html';

const markdownPrompt = `Please format your response in valid Markdown, adhering to the following:
				- Use headings with "#" for levels (e.g., "#", "##", "###").
				- Mark the end of unordered lists with a new line.
				- Mark headings and subheadings with a new line.
				- Do not use numbers in headings.
				- Do not bold or italicize text.
				Ensure the Markdown is clean and easy to copy into any Markdown editor.`;

export const streamGoal = async (env: Env, goal_id: string, goal: any, areaOfFocus: any, timeline: any, user: any) => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
	const aof = areaOfFocus ? `My areas of focus are ${areaOfFocus}` : '';
	const completion = await openai.chat.completions.create({
		stream: true,
		messages: [
			{
				role: 'system',
				content: `You are an expert in the field of ${goal}`,
			},
			{ role: 'user', content: `My goal is to ${goal}. ${aof}` },
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
			{ role: 'system', content: 'Make level 1 markdown headings (e.g. #) relate to the timeline of the goal' },
			{ role: 'system', content: 'Make level 2 markdown heading (e.g. ##) relate to the specific tasks of the goal' },
			{ role: 'system', content: 'Make bullet points represent steps to complete tasks listed in level 2 markdown headings' },
		],
		model: 'gpt-4o-mini',
	});

	let buffer = '';
	let rawTotalResponse = '';
	let totalFormattedResponse = '';
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
								totalFormattedResponse += line;
								controller.enqueue(encoder.encode(line));
							}
						});
					}
				}

				if (buffer) {
					totalFormattedResponse += buffer;
					controller.enqueue(encoder.encode(buffer));
				}

				controller.enqueue(encoder.encode(`event: done\n\n`));

				try {
					await env.DB.prepare(`UPDATE Users SET analyze_requests = analyze_requests - 1 WHERE user_id = ?`).bind(user.user_id).run();
					await env.DB.prepare(`UPDATE Goals SET plan = ?, timeline = ?, aof = ? WHERE goal_id = ?`)
						.bind(totalFormattedResponse, timeline, aof, goal_id)
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

export const streamSubGoal = async (env: Env, parent_goal: any, sub_goal_name: string, sub_goal_id: number) => {
	const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

	const { goal_name: parent_goal_name, plan: parent_plan, goal_id: parent_goal_id } = parent_goal;

	const completion = await openai.chat.completions.create({
		stream: true,
		messages: [
			{
				role: 'system',
				content: `You are an expert in the field of ${parent_goal_name} and are helping the user achieve their goal.`,
			},
			{ role: 'system', content: `You are aware the user is trying to achieve ${parent_goal_name} via this plan: ${parent_plan}` },
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
				console.log('here', rawTotalResponse, sub_goal_id);
				const updateResult = await env.DB.prepare(`UPDATE Goals SET plan = ? WHERE goal_id = ?`).bind(rawTotalResponse, sub_goal_id).run();
				console.log('result', updateResult);
				controller.close();
			},
		});
		return stream;
	} catch (error) {
		console.error(error);
		throw error;
	}
};
