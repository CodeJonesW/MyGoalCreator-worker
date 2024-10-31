import { describe, it, expect, vi, Mock } from 'vitest';
import { streamGoalRoute } from '../../src/routes/goal/createGoalRoute';
import { Env } from '../../src/types';
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

describe('Stream Goal Route', () => {
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
		const request = new Request('http://localhost/api/streamSubGoal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1 },
		});

		mockPreparedStatement.first.mockResolvedValueOnce({ analyze_requests: 1 });

		mockPreparedStatement.first.mockResolvedValueOnce({ goal_id: 1, goal_name: 'Test', aof: 'focus', timeline: '1 week' });

		const mockContext = createMockContext(request, mockHonoEnv);
		const response = await streamGoalRoute(mockContext);
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(text).toContain('Test chunk part 1');
		expect(text).toContain('Test chunk part 2');

		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(1, 'SELECT analyze_requests FROM Users WHERE user_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(1, 1);

		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(2, 'SELECT * FROM Goals WHERE goal_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(2, 1);

		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(2, 'SELECT * FROM Goals WHERE goal_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(2, 1);

		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(3, 'UPDATE Users SET analyze_requests = analyze_requests - 1 WHERE user_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(3, 1);

		expect(mockPreparedStatement.run).toHaveBeenCalledTimes(2);
		expect(mockEnv.DB.prepare).toHaveBeenNthCalledWith(4, 'UPDATE Goals SET plan = ?, timeline = ?, aof = ? WHERE goal_id = ?');
		expect(mockPreparedStatement.bind).toHaveBeenNthCalledWith(
			4,
			'Test chunk part 1Test chunk part 2',
			'1 week',
			'My areas of focus are focus',
			1
		);
	});
});
