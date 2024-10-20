import { describe, it, expect, vi, afterEach, Mock } from 'vitest';
import { Env, ErrorResponse, SuccessResponse } from '../../src/types';
import { markdown_plan_1 } from '../testUtils.ts/mockData';
import { trackGoalRoute } from '../../src/routes/goal/trackGoalRoute';

vi.mock('../../src/utils/db/db_queries', () => ({
	getGoalById: vi.fn(),
	getLatestPlanItemId: vi.fn(),
	getLatestTimelineId: vi.fn(),
}));

vi.mock('../../src/utils/md_parser', () => ({
	parseGoalPlanHeadersAndContent: vi.fn(),
}));

vi.mock('../../src/utils/db/query_gen', () => ({
	generatePreparedStatementsForTimelinesAndPlanItems: vi.fn(),
}));

vi.mock('../../src/utils/auth', () => ({
	verifyToken: vi.fn(),
}));

afterEach(() => {
	vi.clearAllMocks();
});

describe('Track Goal Route', () => {
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

	it('should return 400 if goal_id is missing in the request', async () => {
		const request = new Request('http://localhost/api/track-goal', {
			method: 'POST',
			body: JSON.stringify({}),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		const response = await trackGoalRoute(request, mockEnv);
		const result: ErrorResponse = await response.json();

		expect(response.status).toBe(400);
		expect(result.error).toBe('Missing goal_id');
	});

	it('should return 404 if the goal does not exist', async () => {
		const request = new Request('http://localhost/api/track-goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		const { getGoalById } = await import('../../src/utils/db/db_queries');

		(getGoalById as Mock).mockResolvedValue(null);

		const response = await trackGoalRoute(request, mockEnv);
		const result: ErrorResponse = await response.json();

		expect(response.status).toBe(404);
		expect(result.error).toBe('Goal not found');
	});

	it('should return 500 if inserting tracked goal fails', async () => {
		const request = new Request('http://localhost/api/track-goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		const { getGoalById } = await import('../../src/utils/db/db_queries');

		(getGoalById as Mock).mockResolvedValue({
			goal_id: 1,
			user_id: 1,
			goal_name: 'Learn Rust',
			plan: markdown_plan_1,
		});

		mockPreparedStatement.first.mockResolvedValue(null);

		mockPreparedStatement.run.mockResolvedValueOnce({ success: false });
		const response = await trackGoalRoute(request, mockEnv);
		const result: ErrorResponse = await response.json();
		console.log(result);

		expect(response.status).toBe(500);
		expect(result.error).toBe('Failed to insert trackedgoal');
	});

	it('should successfully track a goal', async () => {
		const request = new Request('http://localhost/api/track-goal', {
			method: 'POST',
			body: JSON.stringify({ goal_id: 1 }),
		});

		const { verifyToken } = await import('../../src/utils/auth');
		(verifyToken as Mock).mockResolvedValue({
			user: { user_id: 1, email: 'test@example.com' },
		});

		const { getGoalById, getLatestPlanItemId, getLatestTimelineId } = await import('../../src/utils/db/db_queries');
		const { parseGoalPlanHeadersAndContent } = await import('../../src/utils/md_parser');
		const { generatePreparedStatementsForTimelinesAndPlanItems } = await import('../../src/utils/db/query_gen');

		(getGoalById as Mock).mockResolvedValue({
			goal_id: 1,
			user_id: 1,
			goal_name: 'Learn Rust',
			plan: 'Read the Rust Book',
		});
		mockPreparedStatement.run.mockResolvedValueOnce({ success: true }); // Inserting tracked goal
		(parseGoalPlanHeadersAndContent as Mock).mockReturnValue({});
		(getLatestTimelineId as Mock).mockResolvedValue(100);
		(getLatestPlanItemId as Mock).mockResolvedValue(200);
		(generatePreparedStatementsForTimelinesAndPlanItems as Mock).mockReturnValue([
			'INSERT INTO Timelines ...',
			'INSERT INTO PlanItems ...',
		]);

		const response = await trackGoalRoute(request, mockEnv);
		const result: SuccessResponse = await response.json();

		expect(response.status).toBe(200);
		expect(result.message).toBe('User added successfully');
	});
});
