import { describe, it, expect, vi } from 'vitest';
import { profileRoute } from '../../src/routes/profileRoute'; // Adjusted path
import { Env } from '../../src/types'; // Adjusted path

// Mocking the dynamically imported verifyToken from auth module
vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

describe('Profile Route', () => {
	const mockEnv: Env = {
		DB: {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn(),
			first: vi.fn(),
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
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValue(null);

		const response = await profileRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(404);
		// @ts-ignore
		expect(result.error).toBe('User not found');
	});

	it('should return 200 and user data if profile is successfully retrieved', async () => {
		const request = new Request('http://localhost/api/profile', { method: 'GET' });

		// Access the mocked verifyToken and mock its resolved value
		const { verifyToken } = await import('../../src/utils/auth'); // Updated path to auth
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		// Mock user data and goals from the database
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValueOnce({
			email: 'test@example.com',
			analyze_requests: 10,
		});
		// @ts-ignore
		mockEnv.DB.all.mockResolvedValueOnce({
			results: [{ goal_name: 'Learn React', goal_id: 1 }],
		});

		const response = await profileRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.user.email).toBe('test@example.com');
		// @ts-ignore
		expect(result.goals[0].goal_name).toBe('Learn React');
		// @ts-ignore
		expect(result.trackedGoal).toBeNull();
	});

	it('should return 200 and user data to include tracked goal', async () => {
		const request = new Request('http://localhost/api/profile', { method: 'GET' });

		// Access the mocked verifyToken and mock its resolved value
		const { verifyToken } = await import('../../src/utils/auth'); // Updated path to auth
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		// Mock user query
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValueOnce({
			email: 'test@example.com',
			analyze_requests: 10,
		});
		// mock all goals query
		// @ts-ignore
		mockEnv.DB.all.mockResolvedValueOnce({
			results: [{ goal_name: 'Learn React', goal_id: 1 }],
		});
		// mock recent goal query
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValueOnce({
			goal_id: 1,
			plan: 'Learn React',
			aof: 'React is a JavaScript library for building user interfaces',
			timeline: '1 month',
		});

		// mock tracked goal query
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValueOnce({
			goal_id: 1,
			user_id: 1,
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
});
