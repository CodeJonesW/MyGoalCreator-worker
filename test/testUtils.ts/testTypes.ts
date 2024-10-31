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

export function createMockContext(request: Request, env: Env): Context<HonoEnv> {
	return {
		req: createMockHonoRequest(request, request.url),
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

import { HonoRequest } from 'hono';
import type { Result } from 'hono/router';
import type { RouterRoute } from 'hono/types';

function createMockHonoRequest(request: Request, path: string = '/', matchResult?: Result<[unknown, RouterRoute]>): HonoRequest {
	const honoRequest = Object.create(request, {
		raw: { value: request },
		path: { value: path, writable: true },
		routeIndex: { value: 0, writable: true },
		bodyCache: { value: {}, writable: true },

		param: {
			//@ts-ignore
			value: (key: string) => matchResult?.params?.[key] || undefined,
		},
		query: {
			value: (key?: string) => {
				const urlParams = new URLSearchParams(request.url.split('?')[1]);
				return key ? urlParams.get(key) : Object.fromEntries(urlParams);
			},
		},
		queries: {
			value: (key?: string) => {
				const urlParams = new URLSearchParams(request.url.split('?')[1]);
				if (!key) {
					return Array.from(urlParams.entries()).reduce((acc, [k, v]) => {
						if (!acc[k]) acc[k] = [];
						acc[k].push(v);
						return acc;
					}, {} as Record<string, string[]>);
				}
				return urlParams.getAll(key) || undefined;
			},
		},
		header: {
			value: (name: string) => request.headers.get(name) || undefined,
		},
		parseBody: {
			value: async () => {
				const contentType = request.headers.get('Content-Type') || '';
				if (contentType.includes('application/json')) {
					return await request.json();
				}
				if (contentType.includes('application/x-www-form-urlencoded')) {
					const text = await request.text();
					return new URLSearchParams(text);
				}
				return await request.text();
			},
		},
		json: {
			value: async () => await request.json(),
		},
		text: {
			value: async () => await request.text(),
		},
		arrayBuffer: {
			value: async () => await request.arrayBuffer(),
		},
		blob: {
			value: async () => await request.blob(),
		},
		formData: {
			value: async () => await request.formData(),
		},
		url: {
			get: () => request.url,
		},
		method: {
			get: () => request.method,
		},
		matchedRoutes: {
			//@ts-ignore
			get: () => matchResult?.routes || [],
		},
		routePath: {
			get: () => path,
		},
	});

	return honoRequest as HonoRequest;
}
