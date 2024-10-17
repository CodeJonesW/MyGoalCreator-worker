import { describe, it, expect, vi, afterEach } from 'vitest';
import { profileRoute } from '../../src/routes/profileRoute';
import { Env } from '../../src/types';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

afterEach(() => {
	vi.clearAllMocks();
});

describe('Profile Route', () => {
	const mockPreparedStatement = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn(),
		all: vi.fn(),
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

	it('should return 404 if user is not found in the database', async () => {
		const request = new Request('http://localhost/api/profile', { method: 'GET' });

		// Access the mocked verifyToken and mock its resolved value
		const { verifyToken } = await import('../../src/utils/auth'); // Updated path to auth
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		// Mock the database to return no user
		mockPreparedStatement.first.mockResolvedValue(null);

		const response = await profileRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(404);
		// @ts-ignore
		expect(result.error).toBe('User not found');
	});

	it('should return a 403 error if the token is invalid', async () => {
		const request = new Request('http://localhost/api/profile', { method: 'GET' });

		// Access the mocked verifyToken and mock its return value to simulate invalid token
		const { verifyToken } = await import('../../src/utils/auth'); // Updated path to auth
		// @ts-ignore
		verifyToken.mockResolvedValue(
			new Response(JSON.stringify({ error: 'Invalid token' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const response = await profileRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(403);
		// @ts-ignore
		expect(result.error).toBe('Invalid token');
	});

	it('should return 200 and user data to include tracked goal', async () => {
		const request = new Request('http://localhost/api/profile', { method: 'GET' });
		const { verifyToken } = await import('../../src/utils/auth');
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});
		// mock user client data query
		mockPreparedStatement.first.mockResolvedValueOnce({
			email: 'test@example.com',
			analyze_requests: 10,
		});
		// mock goals query
		mockPreparedStatement.all.mockResolvedValueOnce({
			results: [{ goal_name: 'Learn React', goal_id: 1 }],
		});
		// mock recent goal query
		mockPreparedStatement.first.mockResolvedValueOnce({
			goal_name: 'Learn React',
			goal_id: 1,
			plan: 'go to the docs',
			aof: 'details',
			timeline: '1 week',
		});
		// mock tracked goal query
		mockPreparedStatement.first.mockResolvedValueOnce({
			goal_id: 1,
			user_id: 1,
		});
		mockPreparedStatement.all.mockResolvedValueOnce({
			results: [
				{
					auth_id: 1,
					user_id: 1,
					login_attempt_time: '2021-09-01 12:00:00',
				},
			],
		});

		const response = await profileRoute(request, mockEnv);
		const result = await response.json();
		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.user.email).toBe('test@example.com');
		// @ts-ignore
		expect(result.goals[0].goal_name).toBe('Learn React');
		// @ts-ignore
		expect(result.trackedGoal.goal_id).toBe(1);
		// @ts-ignore
		expect(result.trackedGoal.user_id).toBe(1);
	});
});
