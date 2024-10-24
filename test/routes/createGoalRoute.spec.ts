import { describe, it, expect, vi, Mock } from 'vitest';
import { createGoalRoute } from '../../src/routes/goal/createGoalRoute';
import { Env } from '../../src/types';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

vi.mock('openai', async (importOriginal) => {
	const actual = await importOriginal(); // Get the actual module

	return {
		// @ts-ignore
		...actual,
		default: vi.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: vi.fn().mockResolvedValue({
						[Symbol.asyncIterator]: async function* () {
							yield { choices: [{ delta: { content: 'Test chunk part 1' } }] };
							yield { choices: [{ delta: { content: 'Test chunk part 2' } }] };
						},
					}),
				},
			},
		})),
	};
});

vi.mock('../../src/utils/db/db_queries', () => ({
	checkIfUserHasAnalyzeRequests: vi.fn(),
}));

describe('Analyze Route', () => {
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

	it('should return 400 if there are no analyze requests left', async () => {
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({ goal: 'Test goal' }), // Include a valid goal in the request body
		});

		const { verifyToken } = await import('../../src/utils/auth');
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1 },
		});

		const { checkIfUserHasAnalyzeRequests } = await import('../../src/utils/db/db_queries');
		// @ts-ignore
		checkIfUserHasAnalyzeRequests.mockResolvedValue(false); // Simulate no analyze requests left

		const response = await createGoalRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(400);
		// @ts-ignore
		expect(result.error).toBe('No analyze requests left');
	});

	it('should return 200, stream the response, and properly update the database', async () => {
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({ goal: 'Test goal', timeline: '1 week' }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		const { checkIfUserHasAnalyzeRequests } = await import('../../src/utils/db/db_queries');
		(checkIfUserHasAnalyzeRequests as Mock).mockResolvedValue(true); // Simulate that the user has analyze requests
		mockPreparedStatement.first.mockResolvedValueOnce({
			analyze_requests: 5,
		});

		const response = await createGoalRoute(request, mockEnv);
		const text = await response.text();
		console.log(text);

		expect(response.status).toBe(200);
		expect(text).toContain('Test chunk part 1');
		expect(text).toContain('Test chunk part 2');

		// Verify that the goal got inserted into the database with the correct values
		expect(mockEnv.DB.prepare).toHaveBeenCalledWith('INSERT INTO Goals (user_id, goal_name, plan, timeline, aof) VALUES (?, ?, ?, ?, ?)');
		expect(mockPreparedStatement.bind).toHaveBeenCalledWith(1, 'Test goal', expect.any(String), '1 week', expect.any(String));
		expect(mockPreparedStatement.run).toHaveBeenCalledTimes(2); // One for inserting the goal and one for updating analyze requests
		expect(mockEnv.DB.prepare).toHaveBeenCalledWith('UPDATE Users SET analyze_requests = analyze_requests - 1 WHERE user_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenCalledWith(1); // user_id
	});
});
