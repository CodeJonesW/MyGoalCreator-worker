DROP TABLE IF EXISTS Users;
CREATE TABLE IF NOT EXISTS Users (
    UserId INTEGER PRIMARY KEY,
    email TEXT,
    analyze_requests TEXT,
    user_password TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS Goals (
    GoalId INTEGER PRIMARY KEY,
    UserId INTEGER,
    goal_name TEXT,
    plan TEXT,
    time_line TEXT,
    aof TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(UserId) REFERENCES Users(UserId)
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
