import { describe, it, expect, vi, Mock } from 'vitest';
import { deleteGoalByIdRoute } from '../../src/routes';
import { Env, ErrorResponse, SuccessResponse } from '../../src/types';
import { createMockContext, HonoEnv } from '../testUtils.ts/testTypes';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

describe('Delete Goal Route', () => {
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

	it('should delete the goal', async () => {
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({ goal: 'Test goal' }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		mockPreparedStatement.first.mockResolvedValueOnce({ goal_id: 1 });
		mockPreparedStatement.all.mockResolvedValueOnce({ results: [] });
		mockPreparedStatement.run.mockResolvedValue({ result: 'success' });
		const mockContext = createMockContext(request, mockEnv);
		const response = await deleteGoalByIdRoute(mockContext);
		const result: SuccessResponse = await (response as Response).json();
		expect(response.status).toBe(200);
		expect(result.message).toBe('success');
	});

	it('should return goal not found if it does not exist', async () => {
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		const mockContext = createMockContext(request, mockEnv);
		const response = await deleteGoalByIdRoute(mockContext);
		const result: ErrorResponse = await (response as Response).json();

		expect(result.error).toBe('Goal not found');
		expect(response.status).toBe(404);
	});
});
