import { Env } from './types';
import {
	registerRoute,
	trackGoalRoute,
	createSubGoalRoute,
	goalByIdRoute,
	createGoalRoute,
	streamGoalRoute,
	profileRoute,
	loginRoute,
	deleteGoalByIdRoute,
	trackedGoalByIdRoute,
	updatePlanItemRoute,
	streamSubGoalRoute,
	createDailyTodoRoute,
	resetDailyTodosChron,
	completeDailyTodoRoute,
} from './routes';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.post('/api/createGoal', createGoalRoute);
app.post('/api/streamGoal', streamGoalRoute);

app.get('/api/goal', goalByIdRoute);
app.delete('/api/goal', deleteGoalByIdRoute);

app.post('/api/createSubGoal', createSubGoalRoute);
app.post('/api/streamSubGoal', streamSubGoalRoute);

app.post('/api/login', loginRoute);
app.post('/api/register', registerRoute);

app.get('/api/profile', profileRoute);

app.post('/api/trackGoal', trackGoalRoute);
app.get('/api/trackGoal', trackedGoalByIdRoute);

app.put('/api/planItem', updatePlanItemRoute);

app.post('/api/dailyTodo', createDailyTodoRoute);
app.post('/api/completeDailyTodo', completeDailyTodoRoute);

app.use('scheduled', resetDailyTodosChron);

export default app;
