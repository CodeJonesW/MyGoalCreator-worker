import { describe, it, expect, vi, Mock } from 'vitest';
import { Env } from '../../src/types';
import { createMockContext, HonoEnv } from '../testUtils.ts/testTypes';
import { streamSubGoalRoute } from '../../src/routes';

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

// vi.mock('../../src/utils/db/db_queries', () => ({
// 	checkIfUserHasAnalyzeRequests: vi.fn(),
// }));

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

describe('Stream Sub Goal Route', () => {
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
	const mockHonoEnv: HonoEnv = { Bindings: { env: mockEnv } };

	it('should return 200, stream the response, and properly update the database', async () => {
		const request = new Request('http://localhost/api/streamGoal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 2 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		mockPreparedStatement.first.mockResolvedValueOnce({
			goal_id: 2,
			goal_name: 'Test sub goal',
			aof: null,
			timeline: null,
			parent_goal_id: 1,
		});

		mockPreparedStatement.first.mockResolvedValueOnce({
			goal_id: 1,
			goal_name: 'Test',
			aof: 'focus',
			timeline: '1 week',
			parent_goal_id: null,
		});

		const mockContext = createMockContext(request, mockHonoEnv);
		const response = await streamSubGoalRoute(mockContext);
		const text = await response.text();
		console.log(text);

		expect(response.status).toBe(200);
		expect(text).toContain('Test chunk part 1');
		expect(text).toContain('Test chunk part 2');

		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(1, 'SELECT * FROM Goals WHERE goal_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(1, 2);

		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(2, 'SELECT * FROM Goals WHERE goal_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(2, 1);

		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(3, 'UPDATE Goals SET plan = ? WHERE goal_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(3, 'Test chunk part 1Test chunk part 2', 2);
	});
});
