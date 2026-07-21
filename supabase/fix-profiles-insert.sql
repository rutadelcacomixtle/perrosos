-- Agregar policy de INSERT en profiles para que los usuarios autenticados
-- puedan crear su perfil si no existe (upsert desde el cliente)

-- Eliminar si ya existe para evitar duplicados
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;

CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
