-- Seed data for development — run after schema.sql

-- Users (password_hash is bcrypt of 'password123')
INSERT INTO users (full_name, email, password_hash, role, is_authorized) VALUES
  ('Admin User',       'admin@simba.au',      '$2b$10$goNqCAPFaUq66uIozDSwp.aKyIaSuh/ygO1J8V13n.P26HsAVKYrK', 'admin',      true),
  ('Instructor One',   'instructor@simba.au', '$2b$10$goNqCAPFaUq66uIozDSwp.aKyIaSuh/ygO1J8V13n.P26HsAVKYrK', 'instructor', true),
  ('Student One',      'student@simba.au',    '$2b$10$goNqCAPFaUq66uIozDSwp.aKyIaSuh/ygO1J8V13n.P26HsAVKYrK', 'student',    true);

-- Courses
INSERT INTO courses (course_name, course_code, credits) VALUES
  ('Introduction to Programming', 'CS101', 3),
  ('Calculus I',                  'MA101', 3);

-- Timeframes (2-week blocks)
INSERT INTO timeframes (label, start_date, end_date) VALUES
  ('Block 1 — 2026', '2026-06-22', '2026-07-03'),
  ('Block 2 — 2026', '2026-07-06', '2026-07-17');

-- Sections
INSERT INTO sections (course_id, section_number, instructor_id, room, timeframe_id) VALUES
  (1, 'SEC-01', 2, 'Room A72', 1),
  (2, 'SEC-01', 2, 'Room B10', 2);

-- Enrollments
INSERT INTO enrollments (section_id, student_id) VALUES
  (1, 3),
  (2, 3);

-- Bookings (existing booking for conflict testing)
INSERT INTO bookings (section_id, date, start_time, end_time, room) VALUES
  (1, '2026-06-16', '09:00', '10:30', 'Room A72');
