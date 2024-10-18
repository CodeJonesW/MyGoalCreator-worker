DROP TABLE IF EXISTS TrackedGoals;
DROP TABLE IF EXISTS SubGoals;
DROP TABLE IF EXISTS Goals;
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
    FOREIGN KEY(user_id) REFERENCES Users(user_id)
);
CREATE TABLE IF NOT EXISTS SubGoals (
    sub_goal_id INTEGER PRIMARY KEY,
    goal_id INTEGER,
    sub_goal_name TEXT,
    plan TEXT,
    line_number INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(goal_id) REFERENCES Goals(goal_id)
);

CREATE TABLE IF NOT EXISTS TrackedGoals (
    tracked_goal_id INTEGER PRIMARY KEY,
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
    id SERIAL PRIMARY KEY, 
    title VARCHAR(255) NOT NULL, 
    timeline_type ENUM('day', 'week', 'month', 'year', 'topic') NOT NULL, 
    parent_id INTEGER, -- Optional parent ID for nested timelines
    FOREIGN KEY (parent_id) REFERENCES Timelines(id) 
);

CREATE TABLE PlanItems (
    id SERIAL PRIMARY KEY, 
    timeline_id INTEGER NOT NULL, 
    description TEXT NOT NULL,
    FOREIGN KEY (timeline_id) REFERENCES Timelines(id) 
);
