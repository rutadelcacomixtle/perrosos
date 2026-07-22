-- Habilitar Supabase Realtime en las tablas necesarias
-- Ejecutar en Dashboard > SQL Editor

ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendees;
