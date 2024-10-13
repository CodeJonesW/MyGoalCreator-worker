import { describe, it, expect, vi } from 'vitest';
import { goalByIdRoute } from '../../src/routes/goalByIdRoute'; // Adjust path as needed
import { Env } from '../../src/types';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

vi.mock('../../src/utils/db_queries', () => ({
	checkIfUserHasAnalyzeRequests: vi.fn(),
}));

describe('Goal By Id Route', () => {
	const mockEnv: Env = {
		DB: {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			first: vi.fn(),
		} as any,
		JWT_SECRET: 'test-secret',
		OPENAI_API_KEY: 'fake-api-key',
	};

	it('should return 401 if the authorization is invalid', async () => {
		const request = new Request('http://localhost/api/goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		// @ts-ignore
		verifyToken.mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));

		const response = await goalByIdRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(401);
		// @ts-ignore
		expect(result.error).toBe('Unauthorized');
	});

	it('should return 404 if the goal is not found', async () => {
		const request = new Request('http://localhost/api/goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 123 }), // Goal that doesn't exist
		});

		const { verifyToken } = await import('../../src/utils/auth');
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1 },
		});
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValueOnce(null); // Simulate no goal found

		const response = await goalByIdRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(404);
		// @ts-ignore
		expect(result.error).toBe('Goal not found');
	});

	it('should return 200 and the goal if found', async () => {
		const request = new Request('http://localhost/api/goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }), // Existing goal
		});

		const { verifyToken } = await import('../../src/utils/auth');
		// @ts-ignore
		verifyToken.mockResolvedValue({
			user: { user_id: 1 },
		});

		const mockGoal = {
			goal_name: 'Learn TypeScript',
			plan: 'Step 1: Understand basics. Step 2: Write code.',
			time_line: '3 months',
		};
		// @ts-ignore
		mockEnv.DB.first.mockResolvedValueOnce(mockGoal); // Simulate goal found

		const response = await goalByIdRoute(request, mockEnv);
		const result = await response.json();

		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.goal).toEqual(mockGoal); // Verify that the goal matches
	});
});
