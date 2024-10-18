export const parseGoalPlanHeadersAndContent = (goal: any) => {
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
