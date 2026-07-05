CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','instructor','student')),
  is_authorized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  course_name TEXT NOT NULL,
  course_code TEXT UNIQUE NOT NULL,
  credits INT
);

CREATE TABLE timeframes (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL
);

CREATE TABLE sections (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL REFERENCES courses(id),
  section_number TEXT NOT NULL,
  instructor_id INT REFERENCES users(id),
  room TEXT,
  timeframe_id INT REFERENCES timeframes(id)
);

CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES sections(id),
  student_id INT NOT NULL REFERENCES users(id),
  UNIQUE (section_id, student_id)
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES sections(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
