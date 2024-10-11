import { describe, it, expect, vi } from 'vitest';
import { registerRoute } from '../../src/routes/registerRoute';
import { Env } from '../../src/types';
import bcrypt from 'bcryptjs';

const mockEnv: Env = {
	DB: {
		prepare: vi.fn().mockReturnThis(),
		bind: vi.fn().mockReturnThis(),
		run: vi.fn(),
	} as any,
	JWT_SECRET: 'test-secret',
	OPENAI_API_KEY: 'fake-api-key',
};

describe('Register Route', () => {
	it('should return 400 for missing email or password', async () => {
		const request = new Request('http://localhost/api/register', { method: 'POST' });
		const response = await registerRoute(request, mockEnv);
		const result: any = await response.json();

		expect(response.status).toBe(400);
		expect(result.error).toBe('Missing email or password');
	});

	it('should return 400 if user already exists', async () => {
		const request = new Request('http://localhost/api/register', {
			method: 'POST',
			headers: new Headers({
				'x-email': 'tester@example.com',
				'x-password': 'password123',
			}),
		});

		// @ts-ignore
		mockEnv.DB.first = vi.fn().mockResolvedValue({ email: 'tester@example.com' });

		const response: Response = await registerRoute(request, mockEnv);
		const result: any = await response.json();

		expect(response.status).toBe(400);
		expect(result.error).toBe('User already exists');
	});

	it('should return 200 if the user is successfully registered', async () => {
		const request = new Request('http://localhost/api/register', {
			method: 'POST',
			headers: new Headers({
				'x-email': 'newuser@example.com',
				'x-password': 'password123',
			}),
		});

		// @ts-ignore
		mockEnv.DB.first = vi.fn().mockResolvedValue(null);
		// @ts-ignore
		mockEnv.DB.run = vi.fn().mockResolvedValue({ success: true });

		// @ts-ignore
		vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword');

		const response = await registerRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.message).toBe('User added successfully');
	});

	it('should return 500 if there is a DB error during registration', async () => {
		const request = new Request('http://localhost/api/register', {
			method: 'POST',
			headers: new Headers({
				'x-email': 'newuser@example.com',
				'x-password': 'password123',
			}),
		});

		// @ts-ignore
		vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword');

		// @ts-ignore
		mockEnv.DB.run = vi.fn().mockResolvedValue({ success: false });

		const response = await registerRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(500);
		// @ts-ignore
		expect(result.error).toBe('Failed to insert user');
	});
});
