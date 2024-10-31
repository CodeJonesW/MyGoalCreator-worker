import { describe, it, expect, vi, Mock } from 'vitest';
import { goalByIdRoute } from '../../src/routes/goal/goalByIdRoute'; // Adjust path as needed
import { Env, ErrorResponse } from '../../src/types';
import { createMockContext, HonoEnv } from '../testUtils.ts/testTypes';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

vi.mock('../../src/utils/db/db_queries', () => ({
	checkIfUserHasAnalyzeRequests: vi.fn(),
}));

describe('Goal By Id Route', () => {
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

	it('should return 401 if the authorization is invalid', async () => {
		const request = new Request('http://localhost/api/goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
		const mockContext = createMockContext(request, mockEnv);
		const response = await goalByIdRoute(mockContext);
		const result: ErrorResponse = await response.json();

		expect(response.status).toBe(401);
		expect(result.error).toBe('Unauthorized');
	});

	it('should return 404 if the goal is not found', async () => {
		const request = new Request('http://localhost/api/goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 123 }), // Goal that doesn't exist
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});
		mockPreparedStatement.first.mockResolvedValueOnce(null); // Simulate no goal found

		const mockContext = createMockContext(request, mockEnv);
		const response = await goalByIdRoute(mockContext);
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
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		const mockGoal = {
			goal_name: 'Learn TypeScript',
			plan: 'Step 1: Understand basics. Step 2: Write code.',
			timeline: '3 months',
		};
		mockPreparedStatement.first.mockResolvedValueOnce(mockGoal);

		const mockContext = createMockContext(request, mockEnv);
		const response = await goalByIdRoute(mockContext);
		const result = await response.json();

		expect(response.status).toBe(200);
		// @ts-ignore
		expect(result.goal).toEqual(mockGoal);
	});
});
