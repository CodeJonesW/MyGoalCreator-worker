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
	timeline: string;
	aof: string;
	subgoals: Goal[];
	parent_goal_id?: number;
	isGoalTracked?: boolean;
};

export type ErrorResponse = {
	error: string;
};

export type SuccessResponse = {
	message: string;
};
