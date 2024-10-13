DROP TABLE IF EXISTS SubGoals;
DROP TABLE IF EXISTS Goals;
DROP TABLE IF EXISTS Users;


CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY,
    email TEXT,
    analyze_requests TEXT,
    user_password TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS Goals (
    GoalId INTEGER PRIMARY KEY,
    user_id INTEGER,
    goal_name TEXT,
    plan TEXT,
    time_line TEXT,
    aof TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);
CREATE TABLE IF NOT EXISTS SubGoals (
    SubGoalId INTEGER PRIMARY KEY,
    GoalId INTEGER,
    sub_goal_name TEXT,
    plan TEXT,
    line_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(GoalId) REFERENCES Goals(GoalId),
    FOREIGN KEY(SubGoalId) REFERENCES SubGoals(SubGoalId)
);

CREATE TABLE IF NOT EXISTS TrackedGoals (
    TrackedGoalId INTEGER PRIMARY KEY,
    GoalId INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(GoalId) REFERENCES Goals(GoalId),
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);
