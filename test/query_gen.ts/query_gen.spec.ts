import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateInsertsForTimelinesAndPlanItems, determineTimelineType } from '../../src/utils/query_gen'; // Update the path accordingly

afterEach(() => {
	vi.clearAllMocks();
});

describe('sql query generator', () => {
	it('should generate correct SQL inserts for given plan structure - level 1 and level 2 headings', () => {
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
		const sqlInserts = generateInsertsForTimelinesAndPlanItems(plan, latestTimelineId, latestPlanItemId);

		// Check that generated SQL contains expected INSERT statements for timelines and plan items
		expect(sqlInserts).toContain(
			"INSERT INTO Timelines (id, title, timeline_type, parent_id) VALUES (1, 'Week 1: Introduction to Rust', 'week', NULL);"
		);
		expect(sqlInserts).toContain(
			"INSERT INTO Timelines (id, title, timeline_type, parent_id) VALUES (2, 'Understanding the Basics', 'topic', 1);"
		);
		expect(sqlInserts).toContain(
			"INSERT INTO PlanItems (id, timeline_id, description) VALUES (1, 2, 'Familiarize yourself with Rust''s syntax and concepts.');"
		);
		expect(sqlInserts).toContain(
			'INSERT INTO PlanItems (id, timeline_id, description) VALUES (2, 2, \'Read the first few chapters of "The Rust Programming Language".\');'
		);
	});

	it('should generate correct SQL inserts for given plan structure - no level 2 headings', () => {
		const plan = {
			'Week 1: Introduction to Rust': [
				"Familiarize yourself with Rust's syntax and concepts.",
				'Read the first few chapters of "The Rust Programming Language".',
				'Install Rust using rustup and set up your development environment.',
			],
			'Week 2: Intermediate Rust': [
				'Dive deeper into control flow (if, loop, match).',
				'Explore how to define and use structs for creating custom data types.',
			],
		};

		const latestTimelineId = 0;
		const latestPlanItemId = 0;
		// add goal id to this function so it ends in the inserts for timeline
		const sqlInserts = generateInsertsForTimelinesAndPlanItems(plan, latestTimelineId, latestPlanItemId);

		// Assertions for the generated SQL inserts for timelines
		expect(sqlInserts).toContain(
			"INSERT INTO Timelines (id, title, timeline_type, parent_id) VALUES (1, 'Week 1: Introduction to Rust', 'week', NULL);"
		);
		expect(sqlInserts).toContain(
			"INSERT INTO Timelines (id, title, timeline_type, parent_id) VALUES (2, 'Week 2: Intermediate Rust', 'week', NULL);"
		);

		// Assertions for the generated SQL inserts for plan items under "Week 1: Introduction to Rust"
		expect(sqlInserts).toContain(
			"INSERT INTO PlanItems (id, timeline_id, description) VALUES (1, 1, 'Familiarize yourself with Rust''s syntax and concepts.');"
		);
		expect(sqlInserts).toContain(
			'INSERT INTO PlanItems (id, timeline_id, description) VALUES (2, 1, \'Read the first few chapters of "The Rust Programming Language".\');'
		);
		expect(sqlInserts).toContain(
			"INSERT INTO PlanItems (id, timeline_id, description) VALUES (3, 1, 'Install Rust using rustup and set up your development environment.');"
		);

		// Assertions for the generated SQL inserts for plan items under "Week 2: Intermediate Rust"
		expect(sqlInserts).toContain(
			"INSERT INTO PlanItems (id, timeline_id, description) VALUES (4, 2, 'Dive deeper into control flow (if, loop, match).');"
		);
		expect(sqlInserts).toContain(
			"INSERT INTO PlanItems (id, timeline_id, description) VALUES (5, 2, 'Explore how to define and use structs for creating custom data types.');"
		);
	});

	it('should correctly determine timeline type based on heading content', () => {
		expect(determineTimelineType('Week 1: Introduction to Rust')).toBe('week');
		expect(determineTimelineType('Day 1: Getting Started')).toBe('day');
		expect(determineTimelineType('Month 1: JavaScript Fundamentals')).toBe('month');
		expect(determineTimelineType('Year 1: Learning Software Engineering')).toBe('year');
		expect(determineTimelineType('Advanced Topics')).toBe('topic');
	});
});
