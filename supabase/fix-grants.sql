-- Verificar y otorgar permisos GRANT en todas las tablas
-- Las policies RLS no funcionan sin los GRANT de PostgreSQL

-- Profiles
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Eventos
GRANT SELECT ON public.eventos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;

-- Event attendees
GRANT SELECT ON public.event_attendees TO anon;
GRANT SELECT, INSERT, DELETE ON public.event_attendees TO authenticated;

-- Sequence (para gen_random_uuid, no necesita sequence pero por si acaso)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
