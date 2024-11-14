import { describe, it, expect, vi, afterEach, Mock } from 'vitest';
import { profileRoute } from '../../src/routes/account/profileRoute';
import { Env, ErrorResponse } from '../../src/types';
import { createMockContext, HonoEnv } from '../testUtils.ts/testTypes';

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

	it('should return 404 if user is not found in the database', async () => {
		console.log('test');
		const request = new Request('http://localhost/api/profile', { method: 'GET' });

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		mockPreparedStatement.first.mockResolvedValue(null);
		const mockContext = createMockContext(request, mockEnv);
		const response = await profileRoute(mockContext);
		const result: ErrorResponse = await response.json();

		expect(response.status).toBe(404);
		expect(result.error).toBe('User not found');
	});

	it('should return a 403 error if the token is invalid', async () => {
		const request = new Request('http://localhost/api/profile', { method: 'GET' });

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue(
			new Response(JSON.stringify({ error: 'Invalid token' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const mockContext = createMockContext(request, mockEnv);
		const response = await profileRoute(mockContext);
		const result: ErrorResponse = await response.json();

		expect(response.status).toBe(403);
		expect(result.error).toBe('Invalid token');
	});

	it('should return 200 and user data to include tracked goal', async () => {
		const request = new Request('http://localhost/api/profile', { method: 'GET' });
		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		// user data from db
		mockPreparedStatement.first.mockResolvedValueOnce({
			email: 'test@example.com',
			analyze_requests: 10,
		});

		// mock user goals
		mockPreparedStatement.all.mockResolvedValueOnce({
			results: [{ goal_name: 'Learn React', goal_id: 1, plan: 'go to the docs', aof: 'details', timeline: '1 week' }],
		});
		// mock goal subgoals
		mockPreparedStatement.all.mockResolvedValueOnce({
			results: [],
		});
		// mock recent goal
		mockPreparedStatement.first.mockResolvedValueOnce({
			goal_name: 'Learn React',
			goal_id: 1,
			plan: 'go to the docs',
			aof: 'details',
			timeline: '1 week',
		});

		// mock tracked goals
		mockPreparedStatement.all.mockResolvedValueOnce({
			results: [
				{
					goal_id: 1,
					user_id: 1,
				},
			],
		});

		// mock daily todos
		mockPreparedStatement.all.mockResolvedValueOnce({
			results: [
				{
					daily_todo_id: 1,
					user_id: 1,
					task: 'do something',
					completed: false,
				},
			],
		});

		// mock daily todo completions
		mockPreparedStatement.all.mockResolvedValueOnce({
			results: [
				{
					daily_todo_completion_id: 1,
					user_id: 1,
					completed_at: '2024-09-01 12:00:00',
				},
			],
		});

		// mock daily todo completions for today
		mockPreparedStatement.first.mockResolvedValueOnce({
			results: [
				{
					daily_todo_completion_id: 1,
					user_id: 1,
					completed_at: new Date().toISOString(),
				},
			],
		});

		const mockContext = createMockContext(request, mockEnv);
		const response = await profileRoute(mockContext);
		const result = await response.json();

		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.user.email).toBe('test@example.com');
		// @ts-ignore
		expect(result.goals[0].goal_name).toBe('Learn React');
		// @ts-ignore
		expect(result.trackedGoals[0].goal_id).toBe(1);
		// @ts-ignore
		expect(result.trackedGoals[0].user_id).toBe(1);

		// @ts-ignore
		expect(result.dailyTodos[0].task).toBe('do something');
		// @ts-ignore
		expect(result.dailyTodosCompletions[0].daily_todo_completion_id).toBe(1);
		// @ts-ignore
		expect(result.dailyTodosCompletedToday).toBe(true);
	});
});
