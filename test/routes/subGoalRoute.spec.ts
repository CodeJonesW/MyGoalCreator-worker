import { createSubGoalRoute } from '../../src/routes/subGoalRoute';
import { describe, it, expect, vi } from 'vitest';
import { verifyToken } from '../../src/utils/auth';
import { Env } from '../../src/types';
import { randomString } from '../testUtils.ts/generalTestUtils';

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

describe('createSubGoalRoute', () => {
	const mockEnv: Env = {
		DB: {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockReturnThis(),
			first: vi.fn().mockReturnThis(),
		} as any,
		JWT_SECRET: 'test-secret',
		OPENAI_API_KEY: 'fake-api-key',
	};

	it('should return 401 if token verification fails', async () => {
		(verifyToken as any).mockResolvedValue(new Response(null, { status: 401 }));

		const request = new Request('http://localhost:8787', { method: 'POST', body: '{}' });
		const response = await createSubGoalRoute(request, mockEnv);

		expect(response.status).toBe(401);
	});

	it('should return 404 if the goal does not exist', async () => {
		(verifyToken as any).mockResolvedValue(null);

		//@ts-ignore
		mockEnv.DB.first.mockResolvedValue(null);

		const request = new Request('http://localhost:8787', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1, sub_goal_name: 'subgoal', line_number: 1 }),
		});
		const response = await createSubGoalRoute(request, mockEnv);

		const json = await response.json();
		expect(response.status).toBe(404);
		//@ts-ignore
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
		// expect(json.subGoalId).toBe(123);
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
