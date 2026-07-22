-- Учёт времени начала/окончания работы вместо простого "часов"
ALTER TABLE staff_reports
  ADD COLUMN IF NOT EXISTS time_start TIME,
  ADD COLUMN IF NOT EXISTS time_end TIME;
