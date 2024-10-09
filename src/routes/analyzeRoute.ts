import { Env } from '../types';
import OpenAI from 'openai';
import { verifyToken } from '../utils/auth'; // Assuming verifyToken is abstracted in auth
import { checkIfUserHasAnalyzeRequests } from '../utils/db_queries'; // Assuming this is already abstracted

export const analyzeRoute = async (request: Request, env: Env): Promise<Response> => {
	try {
		const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
		const authResponse = await verifyToken(request, env);
		if (authResponse instanceof Response) return authResponse;

		const user = authResponse.user;
		const hasAnalyzeRequests = await checkIfUserHasAnalyzeRequests(user.userId, env);
		if (!hasAnalyzeRequests) {
			return new Response(JSON.stringify({ error: 'No analyze requests left' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { goal, prompt: areaOfFocus, timeline }: any = await request.json();
		const overAllTimeLine = timeline ? timeline : '1 year';
		const planIncrements = overAllTimeLine === '1 day' ? '' : timeline === '1 week' ? 'daily' : 'weekly';

		if (!goal) {
			return new Response(JSON.stringify({ error: 'URL is required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const completion = await openai.chat.completions.create({
			stream: true,
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant. You are an expert in goal setting and time management.',
				},
				{ role: 'user', content: `My goal is to ${goal}. ${areaOfFocus ? `My areas of focus are ${areaOfFocus}` : ''}` },
				{ role: 'system', content: `Outline a ${planIncrements} plan to achieve the goal in ${timeline}` },
				{ role: 'system', content: 'Format your response using Markdown syntax.' },
			],
			model: 'gpt-4o-mini',
		});

		let buffer = '';
		let rawTotalResponse = '';

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
								controller.enqueue(encoder.encode(line + '\n'));
							}
						});
					}
				}

				if (buffer) {
					controller.enqueue(encoder.encode(buffer));
				}

				controller.enqueue(encoder.encode(`event: done\n\n`));

				try {
					await env.DB.prepare(`UPDATE Users SET analyze_requests = analyze_requests - 1 WHERE UserId = ?`).bind(user.userId).run();
					await env.DB.prepare(`INSERT INTO Goals (UserId, goal_name, plan, time_line, aof) VALUES (?, ?, ?, ?, ?)`)
						.bind(user.userId, goal, rawTotalResponse, overAllTimeLine, areaOfFocus ? `My areas of focus are ${areaOfFocus}` : '')
						.run();
				} catch (error) {
					console.log('Error saving goal:', error);
				}

				controller.close();
			},
		});

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
