import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

export interface Env {
	DB: D1Database;
	JWT_SECRET: string;
	OPENAI_API_KEY: string;
}

export interface User {
	UserId?: number;
	email?: string;
	user_password?: string;
	analyze_requests?: number;
}

const verifyToken = async (request: Request, env: Env): Promise<{ user: any } | Response> => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const token = authHeader.split(' ')[1];
	try {
		const decoded = jwt.verify(token, env.JWT_SECRET);
		return { user: decoded };
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Invalid token' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

const checkIfUserExistsByEmail = async (email: string, env: Env): Promise<null | User> => {
	return await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
};

const checkIfUserHasAnalyzeRequests = async (userId: number, env: Env): Promise<boolean> => {
	const user = (await env.DB.prepare(`SELECT analyze_requests FROM Users WHERE UserId = ?`).bind(userId).first()) as User;
	if (!user) return false;
	return (user.analyze_requests as number) > 0;
};

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);
		console.log('pathname', pathname);

		if (pathname === '/api/register') {
			const email = request.headers.get('x-email');
			const password = request.headers.get('x-password');
			if (!email || !password) {
				return new Response(JSON.stringify({ error: 'Missing email or password' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const user = await checkIfUserExistsByEmail(email, env);
			if (user) {
				return new Response(JSON.stringify({ error: 'User already exists' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const saltRounds = 10;
			const hashedPassword = await bcrypt.hash(password, saltRounds);
			const { success } = await env.DB.prepare(`INSERT INTO Users (email, user_password, analyze_requests) VALUES (?, ?, ?)`)
				.bind(email, hashedPassword, 25)
				.run();
			if (success) {
				return new Response(JSON.stringify({ message: 'User added successfully' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} else {
				return new Response(JSON.stringify({ error: 'Failed to insert user' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		if (pathname === '/api/login') {
			const email = request.headers.get('x-email');
			const password = request.headers.get('x-password');
			if (!email || !password) {
				return new Response(JSON.stringify({ error: 'Missing email or password' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const user = await checkIfUserExistsByEmail(email, env);
			if (!user) {
				return new Response(JSON.stringify({ error: 'User not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const match = await bcrypt.compare(password, user.user_password as string);
			if (!match) {
				return new Response(JSON.stringify({ error: 'Invalid password' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const token = jwt.sign({ email: user.email, userId: user.UserId }, env.JWT_SECRET, { expiresIn: '1h' });

			return new Response(JSON.stringify({ message: 'Login successful', access_token: token }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (pathname === '/api/profile') {
			const authResponse = await verifyToken(request, env);
			if (authResponse instanceof Response) return authResponse;

			const user = authResponse.user;
			console.log('Authenticated user:', user);

			const goals = await env.DB.prepare(`SELECT goal_name, GoalId FROM Goals WHERE UserId = ?`).bind(user.userId).all();
			const userFromDb = await env.DB.prepare(`SELECT email, analyze_requests FROM Users WHERE UserId = ?`).bind(user.userId).first();
			if (!userFromDb) {
				return new Response(JSON.stringify({ error: 'User not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ user: userFromDb, goals: goals.results }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (pathname === '/api/analyze') {
			try {
				const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
				const authResponse = await verifyToken(request, env);
				if (authResponse instanceof Response) return authResponse;
				const hasAnalyzeRequests = checkIfUserHasAnalyzeRequests(authResponse.user.userId, env);
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

				const user = authResponse.user;
				await env.DB.prepare(`UPDATE Users SET analyze_requests = analyze_requests - 1 WHERE UserId = ?`).bind(user.userId).run();
				await env.DB.prepare(`INSERT INTO Goals (UserId, goal_name, plan, time_line, aof) VALUES (?, ?, ?, ?, ?)`)
					.bind(user.userId, goal, completion.choices[0].message.content, overAllTimeLine, areaOfFocus)
					.run();

				return new Response(
					JSON.stringify({
						plan: completion.choices[0].message.content,
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					}
				);
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
