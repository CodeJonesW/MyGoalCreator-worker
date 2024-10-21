DROP TABLE IF EXISTS PlanItems;
DROP TABLE IF EXISTS Timelines;
DROP TABLE IF EXISTS TrackedGoals;
DROP TABLE IF EXISTS Goals;
-- DROP TABLE IF EXISTS Auth;
-- DROP TABLE IF EXISTS Users;


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
    parent_goal_id INTEGER,
    FOREIGN KEY(parent_goal_id) REFERENCES Goals(goal_id),
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS TrackedGoals (
    goal_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(goal_id) REFERENCES Goals(goal_id),
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Auth (
    auth_id INTEGER PRIMARY KEY,
    user_id INTEGER,
    login_attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);

CREATE TABLE Timelines (
    timeline_id INTEGER PRIMARY KEY, 
    title VARCHAR(255) NOT NULL, 
    timeline_type TEXT NOT NULL, 
    parent_id INTEGER, -- Optional parent ID for nested timelines
    goal_id INTEGER, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES Timelines(timeline_id) 
    FOREIGN KEY (goal_id) REFERENCES Goals(goal_id)
);

CREATE TABLE PlanItems (
    plan_item_id INTEGER PRIMARY KEY, 
    timeline_id INTEGER NOT NULL, 
    goal_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timeline_id) REFERENCES Timelines(timeline_id) 
    FOREIGN KEY (goal_id) REFERENCES Goals(goal_id)
);
