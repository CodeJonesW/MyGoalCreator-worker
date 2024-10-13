import { Env } from '../types';
import { checkIfUserExistsByEmail } from '../utils/db_queries';

export const loginRoute = async (request: Request, env: Env): Promise<Response> => {
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

	// Dynamically import bcrypt to avoid circular dependencies
	const bcrypt = await import('bcryptjs');
	const match = await bcrypt.compare(password, user.user_password as string);
	if (!match) {
		return new Response(JSON.stringify({ error: 'Invalid password' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Dynamically import jsonwebtoken to avoid circular dependencies
	const jwt = await import('jsonwebtoken');
	const token = jwt.sign({ email: user.email, user_id: user.user_id }, env.JWT_SECRET, { expiresIn: '1h' });

	return new Response(JSON.stringify({ message: 'Login successful', access_token: token }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
