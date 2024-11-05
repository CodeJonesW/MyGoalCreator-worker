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
	let timelineId = startingTimelineId + 1;
	let planItemId = startingPlanItemId + 1;
	const timelineMap: { [key: string]: number } = {};

	// Iterate through level 1 headings
	Object.entries(plan).forEach(([level1Heading, level2Contents]) => {
		console.log('lvl 1 headings', level1Heading);
		console.log('lvl 2 contents', level2Contents);
		// Insert level 1 timeline
		const timelineType = determineTimelineType(level1Heading);

		timelineMap[level1Heading] = timelineId;
		statements.push(
			db
				.prepare(`INSERT INTO Timelines (timeline_id, title, timeline_type, goal_id) VALUES (?, ?, ?, ?)`)
				.bind(timelineId, level1Heading, timelineType, goalId)
		);
		const parentTimelineId = timelineId; // Store the parent timeline ID
		timelineId++;

		if (Array.isArray(level2Contents)) {
			// If level2Contents is an array, insert directly under the level 1 timeline
			level2Contents.forEach((item) => {
				statements.push(
					db
						.prepare(`INSERT INTO PlanItems (plan_item_id, timeline_id, name, goal_id, item_status) VALUES (?, ?, ?, ?, ?)`)
						.bind(planItemId, parentTimelineId, item, goalId, 'todo')
				);
				planItemId++;
			});
		} else {
			console.log('lvl 2 is an object');
			// Otherwise, iterate through level 2 headings (e.g., "Understanding the Basics")
			Object.entries(level2Contents).forEach(([level2Heading, items]) => {
				console.log('lvl 2 heading', level2Heading, items);
				console.log('current timeline id', parentTimelineId);

				const description = items.join(' \n');
				console.log('description', description);
				console.log('goal id ', goalId);

				// Insert each plan item under this level 2 timeline
				statements.push(
					db
						.prepare(`INSERT INTO PlanItems (plan_item_id, timeline_id, name, description, goal_id, item_status) VALUES (?, ?, ?, ?, ?, ?)`)
						.bind(planItemId, parentTimelineId, level2Heading, description, goalId, 'todo')
				);
				planItemId++;
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
