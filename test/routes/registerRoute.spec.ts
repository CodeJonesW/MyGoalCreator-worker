import { describe, it, expect, vi } from 'vitest';
import { registerRoute } from '../../src/routes/account/registerRoute';
import { Env } from '../../src/types';
import bcrypt from 'bcryptjs';
import { createMockContext, HonoEnv } from '../testUtils.ts/testTypes';

const mockPreparedStatement = {
	bind: vi.fn().mockReturnThis(),
	first: vi.fn(),
	all: vi.fn(),
	run: vi.fn(),
};

const mockEnv: Env = {
	DB: {
		prepare: vi.fn(() => mockPreparedStatement),
		dump: vi.fn(),
		batch: vi.fn(),
		exec: vi.fn(),
	} as any,
	JWT_SECRET: 'test-secret',
	OPENAI_API_KEY: 'fake-api-key',
};

describe('Register Route', () => {
	it('should return 400 for missing email or password', async () => {
		const request = new Request('http://localhost/api/register', { method: 'POST' });
		const mockContext = createMockContext(request, mockEnv);
		const response = await registerRoute(mockContext);
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

		mockPreparedStatement.first.mockResolvedValue({ email: 'tester@example.com' });

		const mockContext = createMockContext(request, mockEnv);
		const response = await registerRoute(mockContext);
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

		mockPreparedStatement.first.mockResolvedValue(null);
		mockPreparedStatement.run.mockResolvedValue({ success: true });

		// @ts-ignore
		vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword');

		const mockContext = createMockContext(request, mockEnv);
		const response = await registerRoute(mockContext);
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

		mockPreparedStatement.run.mockResolvedValue({ success: false });

		const mockContext = createMockContext(request, mockEnv);
		const response = await registerRoute(mockContext);
		const result = await response.json();

		expect(response.status).toBe(500);
		// @ts-ignore
		expect(result.error).toBe('Failed to insert user');
	});
});
