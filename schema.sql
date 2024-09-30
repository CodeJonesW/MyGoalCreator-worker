DROP TABLE IF EXISTS Users;
CREATE TABLE IF NOT EXISTS Users (UserId INTEGER PRIMARY KEY, email TEXT, transcription_minutes INTEGER, password TEXT);
INSERT INTO Users (email, transcription_minutes, password) VALUES ('test@test.com', 0, 'password');