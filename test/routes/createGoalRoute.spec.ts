import { describe, it, expect, vi, Mock } from 'vitest';
import { createGoalRoute } from '../../src/routes/goal/createGoalRoute';
import { Env, ErrorResponse } from '../../src/types';
import { createMockContext, HonoEnv } from '../testUtils.ts/testTypes';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

vi.mock('openai', async (importOriginal) => {
	const actual = await importOriginal();

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

describe('Create Goal Route', () => {
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
			body: JSON.stringify({ goal: 'Test goal' }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		const { checkIfUserHasAnalyzeRequests } = await import('../../src/utils/db/db_queries');
		(checkIfUserHasAnalyzeRequests as Mock).mockResolvedValue(false);
		const mockContext = createMockContext(request, mockEnv);
		const response = await createGoalRoute(mockContext);
		const result: ErrorResponse = await response.json();

		expect(response.status).toBe(400);
		expect(result.error).toBe('No analyze requests left');
	});

	it('should insert a new goal into db and return a 200', async () => {
		const request = new Request('http://localhost/api/analyze', {
			method: 'POST',
			body: JSON.stringify({ goal_name: 'Learn algebra', area_of_focus: 'Learn division', timeline: '1 week' }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		const { checkIfUserHasAnalyzeRequests } = await import('../../src/utils/db/db_queries');
		(checkIfUserHasAnalyzeRequests as Mock).mockResolvedValue(true);
		mockPreparedStatement.first.mockResolvedValueOnce({
			analyze_requests: 5,
		});

		mockPreparedStatement.run.mockResolvedValue({ success: true, results: [{ goal_id: '1' }] });
		const mockContext = createMockContext(request, mockEnv);
		const response = await createGoalRoute(mockContext);
		const text = await response.text();
		console.log(text);

		expect(response.status).toBe(200);

		expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
			'INSERT INTO Goals (user_id, goal_name, aof, timeline) VALUES (?, ?, ?, ?) RETURNING goal_id'
		);
		expect(mockPreparedStatement.bind).toHaveBeenCalledWith(1, 'Learn algebra', 'Learn division', '1 week');
	});
});
