-- Align classes table structure with experiences table
ALTER TABLE public.classes
  DROP COLUMN IF EXISTS duration_minutes,
  ADD COLUMN duration_hours INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN meeting_point TEXT;