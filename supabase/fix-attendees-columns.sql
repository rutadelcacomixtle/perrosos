-- Agregar columnas display_name y avatar_url a event_attendees
-- La tabla original solo tenia event_id, user_id, created_at

ALTER TABLE public.event_attendees
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;
