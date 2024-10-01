DROP TABLE IF EXISTS Users;
CREATE TABLE IF NOT EXISTS Users (UserId INTEGER PRIMARY KEY, email TEXT, analyze_requests INTEGER, user_password TEXT);
INSERT INTO Users (email, analyze_requests, user_password) VALUES ('test@test.com', 0, 'password');
CREATE TABLE IF NOT EXISTS Goals (GoalId INTEGER PRIMARY KEY, UserId INTEGER, goal_name TEXT, plan TEXT, time_line TEXT, aof TEXT, FOREIGN KEY(UserId) REFERENCES Users(UserId));