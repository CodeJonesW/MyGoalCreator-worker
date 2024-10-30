import { describe, it, expect, vi, Mock } from 'vitest';
import { loginRoute } from '../../src/routes/account/loginRoute'; // Adjust the path as needed
import { Env, ErrorResponse } from '../../src/types';
import { createMockContext, HonoEnv, mockPreparedStatement } from '../testUtils.ts/testTypes';

// Mock the bcryptjs and jsonwebtoken modules globally
vi.mock('bcryptjs', () => ({
	compare: vi.fn(), // Mock the compare function
}));

vi.mock('jsonwebtoken', () => ({
	sign: vi.fn(), // Mock the sign function
}));

describe('Login Route', () => {
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
	const mockHonoEnv: HonoEnv = { Bindings: { env: mockEnv } };

	it('should return 401 if password is invalid', async () => {
		const request = new Request('http://localhost/api/login', {
			method: 'POST',
			headers: new Headers({
				'x-email': 'test@example.com',
				'x-password': 'wrongpassword',
			}),
		});

		mockPreparedStatement.first.mockResolvedValue({
			email: 'test@example.com',
			user_password: 'hashedpassword',
		});

		const bcrypt = await import('bcryptjs');
		(bcrypt.compare as Mock).mockResolvedValue(false);

		const mockContext = createMockContext(request, mockHonoEnv);
		const response = await loginRoute(mockContext);
		const result: ErrorResponse = await response.json();

		expect(response.status).toBe(401);
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

		mockPreparedStatement.first.mockResolvedValue({
			email: 'test@example.com',
			user_password: 'hashedpassword',
		});

		const bcrypt = await import('bcryptjs');
		(bcrypt.compare as Mock).mockResolvedValue(true);

		const jwt = await import('jsonwebtoken');
		(jwt.sign as Mock).mockReturnValue('fake-jwt-token');

		const mockContext = createMockContext(request, mockHonoEnv);
		const response = await loginRoute(mockContext);
		const result = await response.json();
		console.log('result', result);

		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.message).toBe('Login successful');
		// @ts-ignore
		expect(result.access_token).toBe('fake-jwt-token');
	});
});
