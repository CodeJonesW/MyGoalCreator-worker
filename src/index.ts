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
} from './routes';
import { updatePlanItemRoute } from './routes/goal/updatePlanItemRoute';
import { streamSubGoalRoute } from './routes/goal/subGoalRoute';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.post('/api/createGoal', createGoalRoute);
app.post('/api/streamGoal', streamGoalRoute);
app.get('/api/goal', goalByIdRoute);
app.delete('/api/goal', deleteGoalByIdRoute);

app.post('/api/createSubGoal', createSubGoalRoute);
app.post('/api/streamSubGoal', streamSubGoalRoute);

app.post('/api/login', loginRoute);
app.get('/api/profile', profileRoute);
app.post('/api/register', registerRoute);

app.post('/api/trackGoal', trackGoalRoute);
app.get('/api/trackGoal', trackedGoalByIdRoute);

app.put('/api/planItem', updatePlanItemRoute);

export default app;
