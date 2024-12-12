-- User table
CREATE TABLE IF NOT EXISTS "myuser" (
  userid SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  phone_num TEXT UNIQUE,
  is_paid BOOLEAN DEFAULT false,
  valid_date DATE DEFAULT NULL
);
