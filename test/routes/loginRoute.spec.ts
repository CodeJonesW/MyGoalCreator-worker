import { describe, it, expect, vi } from 'vitest';
import { loginRoute } from '../../src/routes/loginRoute'; // Adjust the path as needed
import { Env } from '../../src/types';

// Mock the bcryptjs and jsonwebtoken modules globally
vi.mock('bcryptjs', () => ({
	compare: vi.fn(), // Mock the compare function
}));

vi.mock('jsonwebtoken', () => ({
	sign: vi.fn(), // Mock the sign function
}));

describe('Login Route', () => {
	const mockEnv: Env = {
		DB: {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			first: vi.fn(),
			run: vi.fn(),
		} as any,
		JWT_SECRET: 'test-secret',
		OPENAI_API_KEY: 'fake-api-key',
	};

	it('should return 401 if password is invalid', async () => {
		const request = new Request('http://localhost/api/login', {
			method: 'POST',
			headers: new Headers({
				'x-email': 'test@example.com',
				'x-password': 'wrongpassword',
			}),
		});

		// Simulate user found in DB
		// @ts-ignore
		mockEnv.DB.first = vi.fn().mockResolvedValue({
			email: 'test@example.com',
			user_password: 'hashedpassword',
		});

		// Simulate bcrypt.compare returning false (invalid password)
		const bcrypt = await import('bcryptjs');
		// @ts-ignore
		bcrypt.compare.mockResolvedValue(false); // Mock the comparison result

		const response = await loginRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(401);
		// @ts-ignore
		expect(result.error).toBe('Invalid password');
	});

	it('should return 200 and a token if login is successful', async () => {
		const request = new Request('http://localhost/api/login', {
			method: 'POST',
			headers: new Headers({
				'x-email': 'test@example.com',
				'x-password': 'correctpassword',
			}),
		});

		// Mock user found in DB
		// @ts-ignore
		mockEnv.DB.first = vi.fn().mockResolvedValue({
			email: 'test@example.com',
			user_password: 'hashedpassword',
			user_id: 1,
		});

		// Mock bcrypt.compare returning true (valid password)
		const bcrypt = await import('bcryptjs');
		// @ts-ignore
		bcrypt.compare.mockResolvedValue(true);

		// Mock jwt.sign returning a fake token
		const jwt = await import('jsonwebtoken');
		// @ts-ignore
		jwt.sign.mockReturnValue('fake-jwt-token');

		const response = await loginRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.message).toBe('Login successful');
		// @ts-ignore
		expect(result.access_token).toBe('fake-jwt-token');
	});
});
