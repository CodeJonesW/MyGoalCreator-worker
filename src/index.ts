import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface Env {
	DB: D1Database;
	JWT_SECRET: string;
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
			const user = await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
			if (user) {
				console.log('User already exists');
				return new Response(JSON.stringify({ error: 'User already exists' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const saltRounds = 10;
			const hashedPassword = await bcrypt.hash(password, saltRounds);
			const { success } = await env.DB.prepare(`INSERT INTO Users (email, user_password, transcription_minutes) VALUES (?, ?, ?)`)
				.bind(email, hashedPassword, 10)
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
			const user = await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
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

			const userFromDb = await env.DB.prepare(`SELECT email, transcription_minutes FROM Users WHERE UserId = ?`).bind(user.userId).first();
			if (!userFromDb) {
				return new Response(JSON.stringify({ error: 'User not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ user: userFromDb }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response('TubeScriptAiWorker');
	},
} satisfies ExportedHandler<Env>;
