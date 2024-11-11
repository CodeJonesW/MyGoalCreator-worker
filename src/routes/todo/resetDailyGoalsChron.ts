import { Context } from 'hono';

export const resetDailyGoalsChron = async (context: Context): Promise<void> => {
	try {
		const { env } = context;
		const currentDate = new Date();
		console.log(`Recording completions and resetting todos at ${currentDate.toISOString()}`);

		// Record completion if all todos were completed and user has at least one todo
		await env.DB.prepare(
			`
		  INSERT INTO DailyTodoCompletions (user_id, completed_at)
		  SELECT user_id, CURRENT_TIMESTAMP
		  FROM DailyTodos
		  WHERE completed = true
		  GROUP BY user_id
		  HAVING COUNT(*) = (
			SELECT COUNT(*) FROM DailyTodos WHERE user_id = DailyTodos.user_id
		  ) AND COUNT(*) > 0
		`
		).run();

		// Reset all todos for the new day
		await env.DB.prepare(`UPDATE DailyTodos SET completed = false WHERE completed = true`).run();

		console.log(`Daily goals reset successfully and completions marked`);
	} catch (error) {
		console.error('Error recording completions and resetting daily goals:', error);
	}
};
