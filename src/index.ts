import bcrypt from 'bcryptjs';
export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);

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
			const { success } = await env.DB.prepare(`INSERT INTO Users (email, user_password) VALUES (?, ?)`).bind(email, hashedPassword).run();
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
			return new Response(JSON.stringify({ message: 'Login successful' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response('Call /api/users to see everyone who works at Bs Beverages');
	},
} satisfies ExportedHandler<Env>;
