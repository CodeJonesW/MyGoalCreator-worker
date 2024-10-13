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
    goal_id INTEGER PRIMARY KEY,
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
    goal_id INTEGER,
    sub_goal_name TEXT,
    plan TEXT,
    line_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(goal_id) REFERENCES Goals(goal_id),
    FOREIGN KEY(SubGoalId) REFERENCES SubGoals(SubGoalId)
);

CREATE TABLE IF NOT EXISTS TrackedGoals (
    TrackedGoalId INTEGER PRIMARY KEY,
    goal_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(goal_id) REFERENCES Goals(goal_id),
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);
