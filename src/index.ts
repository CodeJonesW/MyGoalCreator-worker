import { verifyToken } from './utils/auth';
import OpenAI from 'openai';
import { Env } from './types';
import { loginRoute } from './routes/loginRoute';
import { profileRoute } from './routes/profileRoute';
import { checkIfUserHasAnalyzeRequests } from './utils/db_queries';

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);
		console.log('pathname', pathname);

		if (pathname === '/api/register') {
			const { registerRoute } = await import('./routes/registerRoute');
			return await registerRoute(request, env);
		}

		if (pathname === '/api/login') {
			return await loginRoute(request, env);
		}

		if (pathname === '/api/profile') {
			return await profileRoute(request, env);
		}

		if (pathname === '/api/analyze') {
			try {
				const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
				const authResponse = await verifyToken(request, env);
				if (authResponse instanceof Response) return authResponse;
				const user = authResponse.user;
				const hasAnalyzeRequests = checkIfUserHasAnalyzeRequests(user.userId, env);
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
							content:
								'You are a helpful assistant. You are an expert in the subject of goal setting time management. You are eager to help define a path for people to acieve their goals',
						},
						{ role: 'user', content: `My goal is to ${goal}. ${areaOfFocus ? `My areas of focus are ${areaOfFocus}` : ''}` },
						{
							role: 'system',
							content: `Outline a ${planIncrements} plan to achieve the goal in ${timeline}`,
						},
						{ role: 'system', content: 'Format your response in using Markdown syntax.' },
					],
					model: 'gpt-4o-mini',
				});

				let buffer = '';
				let rawTotalResponse = '';

				// Step 3: Use a ReadableStream to send data incrementally to the client
				const stream = new ReadableStream({
					async start(controller) {
						const encoder = new TextEncoder();

						// Process the streamed chunks from OpenAI
						for await (const chunk of completion) {
							let content = chunk.choices[0]?.delta?.content;

							if (content) {
								console.log('Received chunk:', content);

								rawTotalResponse += content;

								// Append current chunk to buffer
								buffer += content;

								// Detect markdown breaks: split by line or markdown syntax
								let lines = buffer.split(/(?=\n|^#{1,4}|\s-\s|\n\s\*\s|\n\d+\.\s)/); // Split by newline, heading markers (#), and bullet points (-, *)

								buffer = ''; // Clear buffer after processing

								lines.forEach((line, index) => {
									if (index === lines.length - 1 && !line.endsWith('\n')) {
										// Keep incomplete line in buffer
										buffer = line;
									} else {
										// Send complete lines
										controller.enqueue(encoder.encode(line + '\n'));
									}
								});
							}
						}

						if (buffer) {
							// Send any remaining buffer content
							controller.enqueue(encoder.encode(buffer));
						}

						// Close the stream once all chunks are processed
						controller.enqueue(encoder.encode(`event: done\n\n`));

						// Decrement analyze requests and save the goal plan to the database
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
		}
		if (pathname.startsWith('/api/goal')) {
			const authResponse = await verifyToken(request, env);
			if (authResponse instanceof Response) return authResponse;
			const { goalId }: any = await request.json();

			const goal = await env.DB.prepare(`SELECT * FROM Goals WHERE GoalId = ?`).bind(goalId).first();
			if (!goal) {
				return new Response(JSON.stringify({ error: 'Goal not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ goal }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response('TubeScriptAiWorker');
	},
} satisfies ExportedHandler<Env>;
