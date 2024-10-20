type PlanStructure = {
	[level1Heading: string]: { [level2Heading: string]: string[] } | string[];
};

export const generatePreparedStatementsForTimelinesAndPlanItems = (
	db: D1Database,
	plan: PlanStructure,
	startingTimelineId: number,
	startingPlanItemId: number,
	goalId: number
): D1PreparedStatement[] => {
	const statements: D1PreparedStatement[] = [];
	let timelineId = startingTimelineId + 1; // Start with the given timeline ID
	let planItemId = startingPlanItemId + 1; // Start with the given plan item ID
	const timelineMap: { [key: string]: number } = {}; // Map for timeline ID lookups

	// Iterate through level 1 headings (e.g., "Week 1: Introduction to Rust")
	Object.entries(plan).forEach(([level1Heading, level2Contents]) => {
		// Insert level 1 timeline
		const timelineType = determineTimelineType(level1Heading);
		timelineMap[level1Heading] = timelineId;
		statements.push(
			db
				.prepare(`INSERT INTO Timelines (id, title, timeline_type, goal_id, parent_id) VALUES (?, ?, ?, ?, NULL)`)
				.bind(timelineId, level1Heading, timelineType, goalId)
		);
		const parentTimelineId = timelineId; // Store the parent timeline ID
		timelineId++;

		if (Array.isArray(level2Contents)) {
			// If level2Contents is an array, insert directly under the level 1 timeline
			level2Contents.forEach((item) => {
				statements.push(
					db
						.prepare(`INSERT INTO PlanItems (id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)`)
						.bind(planItemId, parentTimelineId, item, goalId)
				);
				planItemId++;
			});
		} else {
			// Otherwise, iterate through level 2 headings (e.g., "Understanding the Basics")
			Object.entries(level2Contents).forEach(([level2Heading, items]) => {
				// Insert level 2 timeline with level 1 as the parent
				const level2TimelineType = determineTimelineType(level2Heading);
				timelineMap[level2Heading] = timelineId;
				statements.push(
					db
						.prepare(`INSERT INTO Timelines (id, title, timeline_type, parent_id, goal_id) VALUES (?, ?, ?, ?, ?)`)
						.bind(timelineId, level2Heading, level2TimelineType, parentTimelineId, goalId)
				);
				const currentTimelineId = timelineId; // Store the current timeline ID for plan items
				timelineId++;

				// Insert each plan item under this level 2 timeline
				items.forEach((item) => {
					statements.push(
						db
							.prepare(`INSERT INTO PlanItems (id, timeline_id, description, goal_id) VALUES (?, ?, ?, ?)`)
							.bind(planItemId, currentTimelineId, item, goalId)
					);
					planItemId++;
				});
			});
		}
	});

	return statements;
};

// Determine the timeline type based on the heading content
export const determineTimelineType = (heading: string): 'day' | 'week' | 'month' | 'year' | 'topic' => {
	const normalizedHeading = heading.toLowerCase();

	if (normalizedHeading.includes('day')) {
		return 'day';
	} else if (normalizedHeading.includes('week')) {
		return 'week';
	} else if (normalizedHeading.includes('month')) {
		return 'month';
	} else if (normalizedHeading.includes('year')) {
		return 'year';
	} else {
		return 'topic';
	}
};
