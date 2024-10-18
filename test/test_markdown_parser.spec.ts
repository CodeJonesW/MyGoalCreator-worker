import { describe, it, vi, expect } from 'vitest';
import { Env } from '../src/types';
import { parseGoalPlanHeaders } from '../src/utils/md_parser';
import { markdownPlan } from './testUtils.ts/mockData';

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

describe('markdown parser', () => {
	it('parseGoalPlanHeaders', async () => {
		const user_id = 1;
		const goal_id = 1;
		mockPreparedStatement.first.mockResolvedValue({
			goal_id: goal_id,
			goal_name: 'test goal',
			plan: markdownPlan,
			time_line: '1 week',
			aof: '',
		});
		const data = await parseGoalPlanHeaders(goal_id, mockEnv);
		expect(data).toEqual([
			'# Week 1: Introduction to Rust',
			'## Understanding the Basics',
			'## Basic Programming Concepts',
			'## Practice',
			'# Week 2: Intermediate Rust',
			'## Control Flow and Structs',
			'## Error Handling',
			'## Practice',
			'# Week 3: Advanced Topics in Rust',
			'## Modules and Packages',
			'## Concurrency',
			'## Practice',
			'# Week 4: Real-world Applications and Projects',
			'## Building a Complete Project',
			'## Code Review and Optimization',
			'## Final Touches',
			'## Continued Learning',
		]);
	});
});
