import { getGoalById } from './db_queries';
import { Env } from '../types';
import { errorResponse } from './response_utils';

export const parseGoalPlanHeaders = async (goal_id: any, env: Env) => {
	const goal = await getGoalById(env, goal_id);
	if (!goal) {
		console.log('Goal not found in parseGoalForPlan');
		return errorResponse('Goal not found', 404);
	}
	const plan = goal.plan;
	const planLines = (plan as string).split('\n');

	const headers: string[] = [];
	(planLines as []).forEach((line: string) => {
		if (/^#/m.test(line) || /^##/m.test(line)) {
			headers.push(line);
		}
	});
	return headers;
};

export const parseGoalPlanHeadersAndContent = async (goal_id: any, env: Env) => {
	const goal = await getGoalById(env, goal_id);
	if (!goal) {
		console.log('Goal not found in parseGoalPlanHeadersAndContent');
		return errorResponse('Goal not found', 404);
	}
	const plan = goal.plan;
	const planLines = (plan as string).split('\n');

	const sections: { [key: string]: string[] } = {};
	let currentHeading: string | null = null;
	let currentContent: string[] = [];

	planLines.forEach((line: string) => {
		if (/^#\s+/.test(line)) {
			if (currentHeading) {
				sections[removeMarkdownSyntax(currentHeading)] = currentContent.map(removeMarkdownSyntax);
			}
			currentHeading = line;
			currentContent = [];
		} else if (currentHeading) {
			if (line.trim() === '') {
				return;
			}
			currentContent.push(line);
		}
	});

	if (currentHeading) {
		sections[removeMarkdownSyntax(currentHeading)] = currentContent.map(removeMarkdownSyntax);
	}

	return sections;
};

export const parseMarkdownPlan = async (goal_id: number, env: Env) => {
	const goal = await getGoalById(env, goal_id);
	if (!goal) {
		console.log('Goal not found in parseMarkdownPlan');
		return errorResponse('Goal not found', 404);
	}
	const plan = goal.plan;

	// Split the continuous string into sections based on level 1 headings (#)
	const parts = (plan as string).split(/(?=#\s+)/);
	const parsedData: { [key: string]: any[] } = {};
	let currentHeading: string | null = null;
	let currentContent: any[] = [];

	parts.forEach((part) => {
		// Match level 1 heading
		const level1Match = /^#\s+(.*)/.exec(part);
		const isLevel1Heading = level1Match && level1Match[1];

		if (isLevel1Heading) {
			// If there is a current heading, store the accumulated content
			if (currentHeading) {
				parsedData[removeMarkdownSyntax(currentHeading)] = currentContent.map(removeMarkdownSyntax);
			}
			// Set the new heading and reset the content
			currentHeading = level1Match[1].trim();
			currentContent = [];

			// Split the remaining content by lines, excluding the heading
			const remainingContent = part.replace(/^#\s+.*\n?/, '');
			currentContent = remainingContent
				.split(/(?=##|\n)/)
				.map((line) => removeMarkdownSyntax(line.trim()))
				.filter(Boolean);
		}
	});

	// Add the last section if it exists
	if (currentHeading) {
		parsedData[removeMarkdownSyntax(currentHeading)] = currentContent.map(removeMarkdownSyntax);
	}

	return parsedData;
};

// Function to remove Markdown syntax from a line
const removeMarkdownSyntax = (text: string) => {
	return text
		.replace(/^#+\s*/, '') // Remove Markdown headers (e.g., #, ##, ###)
		.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold syntax (**text**)
		.replace(/\*(.*?)\*/g, '$1') // Remove italic syntax (*text*)
		.replace(/~~(.*?)~~/g, '$1') // Remove strikethrough syntax (~~text~~)
		.replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove link syntax [text](url)
		.replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove inline code/backticks (`text` or ```text```)
		.replace(/!\[.*?\]\(.*?\)/g, '') // Remove image syntax ![alt text](url)
		.replace(/^\s*>+\s?/gm, '') // Remove blockquote syntax
		.replace(/^-+\s?/gm, '') // Remove list item syntax
		.trim(); // Trim any remaining whitespace
};
