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
