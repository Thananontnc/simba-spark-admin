-- Migration: add semesters table and link timeframes to it
-- Run: psql -U postgres -d simba_spark -f migrate_semesters.sql

CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE timeframes
  ADD COLUMN IF NOT EXISTS semester_id INT REFERENCES semesters(id);
