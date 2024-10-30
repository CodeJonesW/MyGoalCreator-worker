import { describe, it, expect, vi, Mock } from 'vitest';
import { createGoalRoute } from '../../src/routes/goal/createGoalRoute';
import { Env, ErrorResponse } from '../../src/types';
import { Context, HonoRequest } from 'hono';
import { JSONValue } from 'hono/utils/types';
import { StatusCode } from 'hono/utils/http-status';

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

vi.mock('../../src/utils/db/db_queries', () => ({
	checkIfUserHasAnalyzeRequests: vi.fn(),
}));

describe('Analyze Route', () => {
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
	type MockEnv = { Bindings: Record<string, any> };
	const mockEnv2: MockEnv = { Bindings: { env: mockEnv } };

	function createMockContext(request: Request, env: MockEnv): Context<MockEnv> {
		return {
			req: request,
			env,
			finalized: false,
			error: undefined,

			json: <T extends JSONValue>(obj: T, status: StatusCode = 200) =>
				new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }),

			text: (text: string, status: StatusCode = 200) => new Response(text, { status, headers: { 'Content-Type': 'text/plain' } }),

			body: (data: string | ArrayBuffer | ReadableStream, status: StatusCode = 200) => new Response(data, { status }),

			header: vi.fn(),
			status: vi.fn(),

			set: vi.fn(),
			get: vi.fn(),
			var: {} as any,

			newResponse: (data: string | ArrayBuffer | ReadableStream | null, status: StatusCode = 200) => new Response(data, { status }),

			html: (html: string, status: StatusCode = 200) => new Response(html, { status, headers: { 'Content-Type': 'text/html' } }),

			redirect: (location: string, status: StatusCode = 302) => new Response(null, { status, headers: { Location: location } }),

			notFound: () => new Response('Not Found', { status: 404 }),
		} as unknown as Context<MockEnv>;
	}

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
		const mockContext = createMockContext(request, mockEnv2);
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
		const mockContext = createMockContext(request, mockEnv2);
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
