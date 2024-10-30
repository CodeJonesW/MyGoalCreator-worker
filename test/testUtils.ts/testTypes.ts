import { describe, it, expect, vi, Mock } from 'vitest';
import { Env } from '../../src/types';
import { Context } from 'hono';
import { JSONValue } from 'hono/utils/types';
import { StatusCode } from 'hono/utils/http-status';

export const mockPreparedStatement = {
	bind: vi.fn().mockReturnThis(),
	first: vi.fn(),
	all: vi.fn(),
	run: vi.fn(),
};

export const mockWorkerEnv: Env = {
	DB: {
		prepare: vi.fn(() => mockPreparedStatement),
		dump: vi.fn(),
		batch: vi.fn(),
		exec: vi.fn(),
	} as any,
	JWT_SECRET: 'test-secret',
	OPENAI_API_KEY: 'fake-api-key',
};
export type HonoEnv = { Bindings: Record<string, any> };
const mockHonoEnv: HonoEnv = { Bindings: { env: mockWorkerEnv } };

export function createMockContext(request: Request, env: HonoEnv = mockHonoEnv): Context<HonoEnv> {
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
	} as unknown as Context<HonoEnv>;
}
