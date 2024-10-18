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

export const parseGoalPlanHeadersAndContentV2 = (goal: any) => {
	const plan = goal.plan;
	const planLines = (plan as string).split('\n');

	const sections: { [key: string]: { [key: string]: string[] } } = {};
	let currentHeadingLevel1: string | null = null;
	let currentHeadingLevel2: string | null = null;
	let currentContent: string[] = [];

	planLines.forEach((line: string) => {
		// Check for level 1 heading (e.g., "# Heading")
		if (/^#\s+/.test(line)) {
			// Save previous level 2 content if it exists
			if (currentHeadingLevel1 && currentHeadingLevel2) {
				sections[removeMarkdownSyntax(currentHeadingLevel1)][removeMarkdownSyntax(currentHeadingLevel2)] =
					currentContent.map(removeMarkdownSyntax);
			}
			// Initialize a new object for level 1 heading if it doesn't exist
			if (currentHeadingLevel1) {
				sections[removeMarkdownSyntax(currentHeadingLevel1)] = sections[removeMarkdownSyntax(currentHeadingLevel1)] || {};
			}
			// Update current level 1 heading and reset level 2 and content
			currentHeadingLevel1 = line;
			currentHeadingLevel2 = null;
			currentContent = [];
		}
		// Check for level 2 heading (e.g., "## Subheading")
		else if (/^##\s+/.test(line)) {
			// Save previous level 2 content if it exists
			if (currentHeadingLevel1 && currentHeadingLevel2) {
				sections[removeMarkdownSyntax(currentHeadingLevel1)][removeMarkdownSyntax(currentHeadingLevel2)] =
					currentContent.map(removeMarkdownSyntax);
			}
			// Ensure the parent level 1 heading exists in the sections object
			if (currentHeadingLevel1) {
				sections[removeMarkdownSyntax(currentHeadingLevel1)] = sections[removeMarkdownSyntax(currentHeadingLevel1)] || {};
			}
			// Update current level 2 heading and reset content
			currentHeadingLevel2 = line;
			currentContent = [];
		}
		// Accumulate content under current level 2 heading
		else if (currentHeadingLevel1 && currentHeadingLevel2) {
			if (line.trim() === '') {
				return;
			}
			currentContent.push(line);
		}
	});

	// Save any remaining content for the last level 2 heading
	if (currentHeadingLevel1 && currentHeadingLevel2) {
		sections[removeMarkdownSyntax(currentHeadingLevel1)][removeMarkdownSyntax(currentHeadingLevel2)] =
			currentContent.map(removeMarkdownSyntax);
	}

	return sections;
};
