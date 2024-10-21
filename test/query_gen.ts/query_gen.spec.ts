import { describe, it, expect, vi, afterEach, Mock } from 'vitest';
import { generatePreparedStatementsForTimelinesAndPlanItems, determineTimelineType } from '../../src/utils/db/query_gen'; // Update the path accordingly
import { Env } from '../../src/types';

afterEach(() => {
	vi.clearAllMocks();
});

describe('sql query generator', () => {
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

	it('should generate correct prepared statements for given plan structure - level 1 and level 2 headings', () => {
		const plan = {
			'Week 1: Introduction to Rust': {
				'Understanding the Basics': [
					"Familiarize yourself with Rust's syntax and concepts.",
					'Read the first few chapters of "The Rust Programming Language".',
					'Install Rust using rustup and set up your development environment.',
				],
				'Basic Programming Concepts': [
					'Learn about data types, variables, and functional constructs in Rust.',
					'Understand ownership, borrowing, and lifetimes.',
				],
			},
			'Week 2: Intermediate Rust': {
				'Control Flow and Structs': [
					'Dive deeper into control flow (if, loop, match).',
					'Explore how to define and use structs for creating custom data types.',
				],
				'Error Handling': [
					'Understand the concept of results and options in Rust for error handling.',
					'Learn about Result and Option types.',
				],
			},
		};
		const latestTimelineId = 0;
		const latestPlanItemId = 0;
		const goalId = 1;

		// Call the function to generate the prepared statements
		generatePreparedStatementsForTimelinesAndPlanItems(mockEnv.DB, plan, latestTimelineId, latestPlanItemId, goalId);

		const mockedPrepares = (mockEnv.DB.prepare as Mock).mock.calls;
		console.log(mockedPrepares);

		const mockedBinds = (mockPreparedStatement.bind as Mock).mock.calls;
		console.log(mockedBinds);
		// Assertions for timeline inserts
		expect(mockedPrepares[0][0]).toEqual(
			'INSERT INTO Timelines (timeline_id, title, timeline_type, goal_id, parent_id) VALUES (?, ?, ?, ?, NULL)'
		);
		expect(mockedBinds[0]).toEqual([1, 'Week 1: Introduction to Rust', 'week', goalId]);

		expect(mockedPrepares[1][0]).toEqual(
			'INSERT INTO Timelines (timeline_id, title, timeline_type, parent_id, goal_id) VALUES (?, ?, ?, ?, ?)'
		);
		expect(mockedBinds[1]).toEqual([2, 'Understanding the Basics', 'topic', 1, goalId]);

		expect(mockedPrepares[2][0]).toEqual('INSERT INTO PlanItems (plan_item_id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)');
		expect(mockedBinds[2]).toEqual([1, 2, "Familiarize yourself with Rust's syntax and concepts.", goalId]);

		expect(mockedPrepares[3][0]).toEqual('INSERT INTO PlanItems (plan_item_id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)');
		expect(mockedBinds[3]).toEqual([2, 2, 'Read the first few chapters of "The Rust Programming Language".', goalId]);

		expect(mockedPrepares[4][0]).toEqual('INSERT INTO PlanItems (plan_item_id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)');
		expect(mockedBinds[4]).toEqual([3, 2, 'Install Rust using rustup and set up your development environment.', goalId]);

		expect(mockedPrepares[5][0]).toEqual(
			'INSERT INTO Timelines (timeline_id, title, timeline_type, parent_id, goal_id) VALUES (?, ?, ?, ?, ?)'
		);
		expect(mockedBinds[5]).toEqual([3, 'Basic Programming Concepts', 'topic', 1, goalId]);

		expect(mockedPrepares[6][0]).toEqual('INSERT INTO PlanItems (plan_item_id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)');
		expect(mockedBinds[6]).toEqual([4, 3, 'Learn about data types, variables, and functional constructs in Rust.', goalId]);

		expect(mockedPrepares[7][0]).toEqual('INSERT INTO PlanItems (plan_item_id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)');
		expect(mockedBinds[7]).toEqual([5, 3, 'Understand ownership, borrowing, and lifetimes.', goalId]);

		// expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
		// 	'INSERT INTO Timelines (id, title, timeline_type, goal_id, parent_id) VALUES (?, ?, ?, ?, ?)'
		// );
		// expect(mockEnv.DB.prepare).toHaveBeenCalledWith('INSERT INTO PlanItems (id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)');

		// // Check the parameters bound for the prepared statements
		// expect(mockPreparedStatement.bind).toHaveBeenCalledWith(1, 'Week 1: Introduction to Rust', 'week', goalId);
		// expect(mockPreparedStatement.bind).toHaveBeenCalledWith(2, 'Understanding the Basics', 'topic', 1, goalId);
		// expect(mockPreparedStatement.bind).toHaveBeenCalledWith(1, 2, "Familiarize yourself with Rust's syntax and concepts.", goalId);
	});

	// it('should generate correct prepared statements for given plan structure - no level 2 headings', () => {
	// 	const plan = {
	// 		'Week 1: Introduction to Rust': [
	// 			"Familiarize yourself with Rust's syntax and concepts.",
	// 			'Read the first few chapters of "The Rust Programming Language".',
	// 			'Install Rust using rustup and set up your development environment.',
	// 		],
	// 		'Week 2: Intermediate Rust': [
	// 			'Dive deeper into control flow (if, loop, match).',
	// 			'Explore how to define and use structs for creating custom data types.',
	// 		],
	// 	};

	// 	const latestTimelineId = 0;
	// 	const latestPlanItemId = 0;
	// 	const goalId = 1;

	// 	// Call the function to generate the prepared statements
	// 	generatePreparedStatementsForTimelinesAndPlanItems(mockEnv.DB, plan, latestTimelineId, latestPlanItemId, goalId);

	// 	// Assertions for timeline inserts
	// 	expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
	// 		'INSERT INTO Timelines (id, title, timeline_type, goal_id, parent_id) VALUES (?, ?, ?, ?, NULL)'
	// 	);
	// 	expect(mockEnv.DB.prepare).toHaveBeenCalledWith('INSERT INTO PlanItems (id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)');

	// 	// Check the parameters bound for the prepared statements
	// 	expect(mockPreparedStatement.bind).toHaveBeenCalledWith(1, 'Week 1: Introduction to Rust', 'week', goalId);
	// 	expect(mockPreparedStatement.bind).toHaveBeenCalledWith(1, 1, "Familiarize yourself with Rust's syntax and concepts.", goalId);
	// 	expect(mockPreparedStatement.bind).toHaveBeenCalledWith(2, 'Week 2: Intermediate Rust', 'week', goalId);
	// 	expect(mockPreparedStatement.bind).toHaveBeenCalledWith(2, 2, 'Dive deeper into control flow (if, loop, match).', goalId);
	// });

	it('should correctly determine timeline type based on heading content', () => {
		expect(determineTimelineType('Week 1: Introduction to Rust')).toBe('week');
		expect(determineTimelineType('Day 1: Getting Started')).toBe('day');
		expect(determineTimelineType('Month 1: JavaScript Fundamentals')).toBe('month');
		expect(determineTimelineType('Year 1: Learning Software Engineering')).toBe('year');
		expect(determineTimelineType('Advanced Topics')).toBe('topic');
	});
});
