import { describe, it, vi, expect } from 'vitest';
import { Env } from '../../src/types';
import { parseGoalPlanHeadersAndContent, parseGoalPlanHeadersAndContentV2 } from '../../src/utils/md_parser';
import { markdown_plan_1 } from '../testUtils.ts/mockData';

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
	it('parseGoalPlanHeadersAndContent', async () => {
		const goal_id = 1;
		const goal = {
			goal_id: goal_id,
			goal_name: 'learn rust',
			plan: markdown_plan_1,
			timeline: '1 month',
			aof: '',
		};
		const data = parseGoalPlanHeadersAndContent(goal);

		expect(data).toEqual({
			'Week 1: Introduction to Rust': [
				'Understanding the Basics',
				"Familiarize yourself with Rust's syntax and concepts.",
				'Read the first few chapters of "The Rust Programming Language" (often referred to as the Rust Book).',
				'Install Rust using rustup and set up your development environment.',
				'Basic Programming Concepts',
				'Learn about data types, variables, and functional constructs in Rust.',
				'Understand ownership, borrowing, and lifetimes – key concepts that differentiate Rust from other languages.',
				'Practice',
				'Complete exercises from the Rust Book.',
				'Start with simple programs, such as a basic calculator or a program that outputs "Hello, world!".',
			],
			'Week 2: Intermediate Rust': [
				'Control Flow and Structs',
				'Dive deeper into control flow (if, loop, match).',
				'Explore how to define and use structs for creating custom data types.',
				'Error Handling',
				'Understand the concept of results and options in Rust for error handling.',
				'Learn about Result and Option types and how to handle errors properly.',
				'Practice',
				'Engage in hands-on coding by creating small projects to apply what you learned.',
				'Try building a command-line tool that performs file operations and includes basic error handling.',
			],
			'Week 3: Advanced Topics in Rust': [
				'Modules and Packages',
				'Learn how to organize your code with modules and packages.',
				'Understand the Cargo package manager, how to create new projects, and manage dependencies.',
				'Concurrency',
				'Explore Rust’s concurrency model.',
				'Learn about threads, message passing, and shared state in Rust.',
				'Practice',
				'Implement a multi-threaded application, such as a concurrent web scraper.',
				'Experiment with using crates (Rust libraries) to enhance functionality.',
			],
			'Week 4: Real-world Applications and Projects': [
				'Building a Complete Project',
				'Choose a project that interests you (e.g., a simple web server, a REST API, or a CLI application).',
				"Apply all the concepts you've learned throughout the month.",
				'Code Review and Optimization',
				'Review your code for best practices, performance optimization, and idiomatic Rust.',
				'Consider using tools like clippy and rustfmt for coding style and linting.',
				'Final Touches',
				'Share your project on platforms like GitHub to receive feedback.',
				"Reflect on what you've learned and identify areas for further study.",
				'Continued Learning',
				'Explore Rust communities online (e.g., Reddit, Stack Overflow).',
				'Consider enrolling in a Rust course or looking for advanced topics to deepen your understanding.',
			],
		});
	});

	it('parseGoalPlanHeadersAndContentV2', async () => {
		const goal_id = 1;
		const goal = {
			goal_id: goal_id,
			goal_name: 'learn rust',
			plan: markdown_plan_1,
			timeline: '1 month',
			aof: '',
		};
		const data = parseGoalPlanHeadersAndContentV2(goal);
		console.log(data);
		expect(data).toEqual({
			'Week 1: Introduction to Rust': {
				'Understanding the Basics': [
					"Familiarize yourself with Rust's syntax and concepts.",
					'Read the first few chapters of "The Rust Programming Language" (often referred to as the Rust Book).',
					'Install Rust using rustup and set up your development environment.',
				],
				'Basic Programming Concepts': [
					'Learn about data types, variables, and functional constructs in Rust.',
					'Understand ownership, borrowing, and lifetimes – key concepts that differentiate Rust from other languages.',
				],
				Practice: [
					'Complete exercises from the Rust Book.',
					'Start with simple programs, such as a basic calculator or a program that outputs "Hello, world!".',
				],
			},
			'Week 2: Intermediate Rust': {
				'Control Flow and Structs': [
					'Dive deeper into control flow (if, loop, match).',
					'Explore how to define and use structs for creating custom data types.',
				],
				'Error Handling': [
					'Understand the concept of results and options in Rust for error handling.',
					'Learn about Result and Option types and how to handle errors properly.',
				],
				Practice: [
					'Engage in hands-on coding by creating small projects to apply what you learned.',
					'Try building a command-line tool that performs file operations and includes basic error handling.',
				],
			},
			'Week 3: Advanced Topics in Rust': {
				'Modules and Packages': [
					'Learn how to organize your code with modules and packages.',
					'Understand the Cargo package manager, how to create new projects, and manage dependencies.',
				],
				Concurrency: ['Explore Rust’s concurrency model.', 'Learn about threads, message passing, and shared state in Rust.'],
				Practice: [
					'Implement a multi-threaded application, such as a concurrent web scraper.',
					'Experiment with using crates (Rust libraries) to enhance functionality.',
				],
			},
			'Week 4: Real-world Applications and Projects': {
				'Building a Complete Project': [
					'Choose a project that interests you (e.g., a simple web server, a REST API, or a CLI application).',
					"Apply all the concepts you've learned throughout the month.",
				],
				'Code Review and Optimization': [
					'Review your code for best practices, performance optimization, and idiomatic Rust.',
					'Consider using tools like clippy and rustfmt for coding style and linting.',
				],
				'Final Touches': [
					'Share your project on platforms like GitHub to receive feedback.',
					"Reflect on what you've learned and identify areas for further study.",
				],
				'Continued Learning': [
					'Explore Rust communities online (e.g., Reddit, Stack Overflow).',
					'Consider enrolling in a Rust course or looking for advanced topics to deepen your understanding.',
				],
			},
		});
	});
});
