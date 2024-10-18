export interface Env {
	DB: D1Database;
	JWT_SECRET: string;
	OPENAI_API_KEY: string;
}

export interface User {
	user_id?: number;
	email?: string;
	user_password?: string;
	analyze_requests?: number;
}

export type Goal = {
	goal_id: number;
	goal_name: string;
	plan: string;
	time_line: string;
	aof: string;
	subgoals: SubGoal[];
};

export type SubGoal = {
	sub_goal_id: number;
	goal_id: number;
	sub_goal_name: string;
	line_number?: number;
	sub_goal_plan?: string;
};
