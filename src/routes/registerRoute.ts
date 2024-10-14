import bcrypt from 'bcryptjs';
import { checkIfUserExistsByEmail } from '../utils/db_queries';
import { Env } from '../types';

export const registerRoute = async (request: Request, env: Env): Promise<Response> => {
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
};
