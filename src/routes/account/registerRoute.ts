import bcrypt from 'bcryptjs';
import { checkIfUserExistsByEmail } from '../../utils/db/db_queries';
import { Env } from '../../types';
import { errorResponse } from '../../utils/response_utils';

export const registerRoute = async (request: Request, env: Env): Promise<Response> => {
	const email = request.headers.get('x-email');
	const password = request.headers.get('x-password');

	if (!email || !password) {
		return errorResponse('Missing email or password', 400);
	}

	const user = await checkIfUserExistsByEmail(email, env);
	if (user) {
		return errorResponse('User already exists', 400);
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
		return errorResponse('Failed to insert user', 500);
	}
};
