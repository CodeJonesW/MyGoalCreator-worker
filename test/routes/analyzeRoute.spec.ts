import { describe, it, expect, vi } from 'vitest';
import { analyzeRoute } from '../../src/routes/goal/analyzeRoute';
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

// Mock the checkIfUserHasAnalyzeRequests function from db_queries
vi.mock('../../src/utils/db_queries', () => ({
	checkIfUserHasAnalyzeRequests: vi.fn(),
}));

describe('Analyze Route', () => {
	const mockEnv: Env = {
		DB: {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn(),
			first: vi.fn(),
			run: vi.fn(),
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

		const { checkIfUserHasAnalyzeRequests } = await import('../../src/utils/db_queries');
		// @ts-ignore
		checkIfUserHasAnalyzeRequests.mockResolvedValue(false); // Simulate no analyze requests left

		const response = await analyzeRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(400);
		// @ts-ignore
		expect(result.error).toBe('No analyze requests left');
	});

	it('should return 200, stream the response, and properly update the database', async () => {
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({ goal: 'Test goal', timeline: '1 week' }), // Include goal and timeline
		});

		const { verifyToken } = await import('../../src/utils/auth');
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1 },
		});

		const { checkIfUserHasAnalyzeRequests } = await import('../../src/utils/db_queries');
		// @ts-ignore
		checkIfUserHasAnalyzeRequests.mockResolvedValue(true); // Simulate that the user has analyze requests
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValueOnce({
			analyze_requests: 5, // Initial value of analyze requests
		});

		const response = await analyzeRoute(request, mockEnv);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(text).toContain('Test chunk part 1'); // Check for streamed content
		expect(text).toContain('Test chunk part 2'); // Check for second chunk

		// Verify that the goal got inserted into the database with the correct values
		expect(mockEnv.DB.prepare).toHaveBeenCalledWith('INSERT INTO Goals (user_id, goal_name, plan, time_line, aof) VALUES (?, ?, ?, ?, ?)');
		// @ts-ignore
		expect(mockEnv.DB.bind).toHaveBeenCalledWith(
			1, // user_id
			'Test goal', // Goal name
			expect.any(String), // The full response content as the plan
			'1 week', // Timeline
			expect.any(String) // Area of focus (if provided)
		);
		// @ts-ignore
		expect(mockEnv.DB.run).toHaveBeenCalledTimes(2); // One for inserting the goal and one for updating analyze requests

		// Verify that the user's analyze requests were decremented
		expect(mockEnv.DB.prepare).toHaveBeenCalledWith('UPDATE Users SET analyze_requests = analyze_requests - 1 WHERE user_id = ?');
		// @ts-ignore
		expect(mockEnv.DB.bind).toHaveBeenCalledWith(1); // user_id
	});
});
