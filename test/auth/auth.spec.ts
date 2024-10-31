import { describe, it, expect, vi, Mock } from 'vitest';
import { verifyToken } from '../../src/utils/auth'; // Adjust path as needed
import jwt from 'jsonwebtoken';
import { Env, ErrorResponse } from '../../src/types';
import { HonoEnv } from '../testUtils.ts/testTypes';

vi.mock('jsonwebtoken');

describe('verifyToken', () => {
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

	it('should return 401 if the authorization header is missing', async () => {
		const request = new Request('http://localhost/api/protected', {
			method: 'GET',
		});

		const response = await verifyToken(request, mockEnv);
		const result: ErrorResponse = await (response as Response).json();

		expect((response as Response).status).toBe(401);
		expect(result.error).toBe('Unauthorized');
	});

	it('should return 401 if the authorization header does not start with "Bearer "', async () => {
		const request = new Request('http://localhost/api/protected', {
			method: 'GET',
			headers: {
				Authorization: 'Basic invalidtoken',
			},
		});

		const response = await verifyToken(request, mockEnv);
		const result: ErrorResponse = await (response as Response).json();

		expect((response as Response).status).toBe(401);
		expect(result.error).toBe('Unauthorized');
	});

	it('should return 403 if the token is invalid', async () => {
		const request = new Request('http://localhost/api/protected', {
			method: 'GET',
			headers: {
				Authorization: 'Bearer invalidtoken',
			},
		});

		(vi.mocked(jwt.verify) as Mock).mockImplementationOnce(() => {
			throw new Error('Invalid token');
		});

		const response = await verifyToken(request, mockEnv);
		const result: ErrorResponse = await (response as Response).json();

		expect((response as Response).status).toBe(403);
		expect(result.error).toBe('Invalid token');
	});

	it('should return the decoded user if the token is valid', async () => {
		const request = new Request('http://localhost/api/protected', {
			method: 'GET',
			headers: {
				Authorization: 'Bearer validtoken',
			},
		});

		const mockUser = { user_id: 1, username: 'testuser' };
		(vi.mocked(jwt.verify) as Mock).mockReturnValueOnce(mockUser);

		const result = await verifyToken(request, mockEnv);
		expect(result).toEqual({ user: mockUser });
	});
});
