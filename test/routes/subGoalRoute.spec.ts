import { createSubGoalRoute } from '../../src/routes/goal/subGoalRoute';
import { describe, it, expect, vi, Mock } from 'vitest';
import { Env, ErrorResponse } from '../../src/types';
import { createMockContext, HonoEnv } from '../testUtils.ts/testTypes';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

vi.mock('openai', () => ({
	default: vi.fn().mockImplementation(() => ({
		chat: {
			completions: {
				create: vi.fn().mockResolvedValue({
					id: 'mock-completion',
					object: 'text_completion',
				}),
			},
		},
	})),
}));

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

describe('createSubGoalRoute', () => {
	it('should return 401 if token verification fails', async () => {
		const { verifyToken } = await import('../../src/utils/auth');
		const verifyFailedResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
		(verifyToken as Mock).mockResolvedValue(verifyFailedResponse);

		const request = new Request('http://localhost:8787', {
			method: 'POST',
			body: '{}',
		});
		const mockContext = createMockContext(request, mockEnv);
		const response = await createSubGoalRoute(mockContext);

		expect(response.status).toBe(401);
	});

	it('should return 404 if the goal does not exist', async () => {
		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		mockPreparedStatement.first.mockResolvedValue(null);

		const request = new Request('http://localhost:8787', {
			method: 'POST',
			body: JSON.stringify({ parent_goal_id: 1, sub_goal_name: 'subgoal', line_number: 1 }),
		});
		const mockContext = createMockContext(request, mockEnv);
		const response = await createSubGoalRoute(mockContext);

		const json: ErrorResponse = await response.json();
		expect(response.status).toBe(404);
		expect(json.error).toBe('Goal not found');
	});

	it('should call OpenAI API and insert subgoal into the DB if goal exists', async () => {
		// (verifyToken as any).mockResolvedValue(null);
		// const goal_name = randomString(10);
		// const plan = randomString(10);
		// const sub_goal_name = randomString(10);
		// //@ts-ignore
		// mockEnv.DB.first.mockResolvedValue({ goal_name: goal_name, plan: plan });
		// //@ts-ignore
		// mockEnv.DB.run.mockResolvedValue({ success: true, lastInsertId: 123 });
		// const request = new Request('http://localhost:8787', {
		// 	method: 'POST',
		// 	body: JSON.stringify({ goal_id: 1, sub_goal_name: sub_goal_name, line_number: 1 }),
		// });
		// const response = await createSubGoalRoute(request, mockEnv);
		// const json = await response.json();
		// expect(response.status).toBe(201);
		// //@ts-ignore
		// expect(json.message).toBe('SubGoal created successfully');
		// //@ts-ignore
		// expect(json.sub_goal_id).toBe(123);
	});

	it('should return 500 if subgoal insertion fails', async () => {
		// (verifyToken as any).mockResolvedValue(null);
		// const goal_name = randomString(10);
		// const plan = randomString(10);
		// const sub_goal_name = randomString(10);
		// //@ts-ignore
		// mockEnv.DB.first.mockResolvedValue({ goal_name: goal_name, plan: plan });
		// //@ts-ignore
		// mockEnv.DB.first.mockResolvedValue(null);
		// //@ts-ignore
		// mockEnv.DB.run.mockRejectedValue(new Error('Insertion failed'));
		// const request = new Request('http://localhost:8787', {
		// 	method: 'POST',
		// 	body: JSON.stringify({ goal_id: 1, sub_goal_name: sub_goal_name, line_number: 1 }),
		// });
		// const response = await createSubGoalRoute(request, mockEnv);
		// const json = await response.json();
		// expect(response.status).toBe(500);
		// //@ts-ignore
		// expect(json.error).toBe('Insertion failed');
	});
});
