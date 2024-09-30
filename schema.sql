DROP TABLE IF EXISTS Users;
CREATE TABLE IF NOT EXISTS Users (UserId INTEGER PRIMARY KEY, email TEXT, transcription_minutes INTEGER, user_password TEXT);
INSERT INTO Users (email, transcription_minutes, user_password) VALUES ('test@test.com', 0, 'password');