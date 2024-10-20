import { Env } from '../../types';
import { checkIfUserExistsByEmail, checkUserFirstLogin, insertAuthEntry } from '../../utils/db/db_queries';
import { errorResponse } from '../../utils/response_utils';

export const loginRoute = async (request: Request, env: Env): Promise<Response> => {
	const email = request.headers.get('x-email');
	const password = request.headers.get('x-password');

	if (!email || !password) {
		return errorResponse('Missing email or password', 400);
	}

	const user = await checkIfUserExistsByEmail(email, env);
	if (!user) {
		return errorResponse('User not found', 404);
	}

	const bcrypt = await import('bcryptjs');
	const match = await bcrypt.compare(password, user.user_password as string);
	if (!match) {
		return errorResponse('Invalid password', 401);
	}

	await insertAuthEntry(env, user.user_id);

	const jwt = await import('jsonwebtoken');
	const token = jwt.sign({ email: user.email, user_id: user.user_id }, env.JWT_SECRET, { expiresIn: '7d' });

	return new Response(JSON.stringify({ message: 'Login successful', access_token: token }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
