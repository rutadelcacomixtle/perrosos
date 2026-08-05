# PerroSOS MTB — Calendario de rodadas

## Qué es
Mini web para un grupo de MTB en México (Puebla). Reemplaza la práctica de compartir
eventos como imagen suelta en WhatsApp con un calendario compartible por enlace. Dos
tipos de evento conviven en el mismo calendario:

- **Comunidad**: alguien comparte una imagen de un evento externo (carrera, rodada
  de otro grupo, etc.). Campos mínimos: título, imagen, lugar, hora, enlace al post
  original.
- **Equipo**: rodadas que organiza el propio equipo. Llevan título, lugar, hora,
  imagen opcional, y además distancia (km), desnivel (m) y dificultad
  (Facil/Moderada/Dificil). No llevan enlace al post original.

Los dos tipos se distinguen por color en toda la interfaz (acento **rojo** =
comunidad, acento **azul** = equipo) en vez de estar separados en pestañas.

En ambos tipos cualquiera puede confirmar asistencia con el botón "Asistiré", ligado
a su cuenta real (no texto libre).

## Estado actual
App completa en producción funcional: **Vite + React 19 + TypeScript estricto +
Tailwind v4 + Supabase** (auth por email/contraseña, Postgres con RLS, Storage para
imágenes y Realtime para sincronizar entre dispositivos).

`npm run dev` levanta en el puerto 5173. `npm run build` corre `tsc -b && vite build`;
ambos pasan limpios. No hay tests ni ESLint configurado.

### Estructura
```
src/
  main.tsx              entry
  App.tsx               estado global, fetch, realtime, lista de próximas rodadas
  index.css             @theme de Tailwind v4 + overrides de Leaflet
  lib/supabase.ts       cliente
  lib/upload.ts         compresión y subida de imágenes a Storage
  lib/format.ts         todayKey, formatLongDate, formatTime12
  lib/poster.ts         dibuja el cartel compartible en un canvas
  types/index.ts        Event, EventAttendee, EventWithAttendees, Profile
  components/
    AuthScreen.tsx      login / registro
    Header.tsx          logo, título, avatar + ElevationDivider
    Calendar.tsx        grid mensual, swipe para cambiar de mes
    EventCard.tsx       Sticker (miniatura rotada) y TipoBadge
    EventModal.tsx      alta de evento al tocar un día
    EventDetail.tsx     pantalla de detalle + edición + asistencia
    MapPicker.tsx       buscador Nominatim + mapa Leaflet compacto y fullscreen
    SharePoster.tsx     vista previa del cartel + compartir / descargar
    ProfileScreen.tsx   perfil y cerrar sesión
supabase/*.sql          migración inicial + parches sueltos (ver abajo)
```

El prototipo original de un solo archivo (`rodadas-calendario.jsx`) y el componente
huérfano `AttendeeList.tsx` se borraron; están en el historial de git si hicieran
falta.

## Stack y decisiones técnicas
- **React 19** con hooks nativos, sin librerías de estado externas.
- **TypeScript estricto**, incluido `noUncheckedIndexedAccess` — de ahí los `!` y
  `??` al indexar arreglos.
- **Tailwind v4** vía `@tailwindcss/vite` (sin archivo de config; el tema va en
  `@theme` dentro de `src/index.css`).
- **Convención de color heredada del prototipo**: todos los colores van en
  `style={{}}` inline con el hex literal. Las variables de `@theme` en `index.css`
  están definidas pero **ningún componente las usa todavía**. Al tocar un componente,
  respeta el estilo inline existente salvo que se decida migrar todo de una vez.
- **Leaflet** por npm (`leaflet` + `leaflet-rotate` para rotar con dos dedos en
  fullscreen), importado dinámicamente (`await import("leaflet")`) para que quede en
  su propio chunk. El CSS se importa desde el paquete en `index.css`.
- **Teselas**: Stadia Maps Alidade Smooth Dark si hay `VITE_STADIA_API_KEY`, con
  fallback automático a CARTO Dark Matter (gratis, sin key).
- **Geocodificación**: Nominatim (OpenStreetMap), sin key. Su política es de 1 req/s,
  así que ambas llamadas van con debounce: 450 ms el buscador, 700 ms la
  geocodificación inversa al mover el mapa. No quitarlos.
- **Imágenes**: si pasan de 2 MB se reescalan a 1600 px del lado largo y se
  recomprimen a JPEG en el cliente (canvas) antes de subirlas. `uploadEventImage`
  devuelve `{ url }` o `{ error }` — siempre hay que mostrar el error.
- **Iconos**: `lucide-react`.
- **Fuentes**: Google Fonts por `<link>` en `index.html` — Barlow Condensed (display),
  Work Sans (body), Space Mono (mono/datos).

### Cartel compartible
Desde el detalle del evento, el botón de compartir abre `SharePoster`, que dibuja un
cartel con `lib/poster.ts` y lo manda a la hoja nativa de compartir
(`navigator.share` con archivo), con descarga como respaldo donde no exista.

- **Se dibuja a mano con la API de canvas**, no con `html2canvas` ni
  `html-to-image`: son ~50 kB de dependencia, soportan CSS a medias, dan resultados
  distintos entre navegadores y fallan con imágenes cross-origin justo en el caso que
  importa (Safari en iPhone compartiendo a WhatsApp). No cambiar esto sin una razón
  fuerte.
- **Composición**: encabezado con logo y trazo de montañas, imagen enmarcada, panel de
  datos abajo. La altura del panel se mide primero y el marco de la imagen se queda con
  lo que sobra, para que los dos formatos se adapten solos.
- **El marco toma la proporción de la imagen** y se centra. Si fuera fijo, una imagen
  vertical dentro del formato cuadrado dejaría dos franjas negras enormes a los lados.
  Nada se recorta nunca.
- **Formatos**: 9:16 (1080×1920) para historias y estados, y 1:1 (1080×1080). El
  usuario elige en la vista previa.
- **Sin imagen** (rodadas de equipo, y cualquier evento sin foto) se dibuja un perfil
  de elevación con el color de acento en lugar de la imagen.
- Tres cosas frágiles que ya están resueltas y conviene no romper: hay que esperar
  `document.fonts.load()` antes de dibujar o el cartel sale en Arial; la imagen se
  carga con `crossOrigin="anonymous"` o el canvas se contamina y no se puede exportar
  (Supabase Storage manda `access-control-allow-origin: *`, ya verificado); y el
  cartel se dibuja **antes** de que el usuario toque "Compartir", porque iOS exige que
  el gesto siga vivo al llamar a `navigator.share`.

### Variables de entorno
`.env` (ignorado por git, ver `.env.example`):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STADIA_API_KEY`.
Las tres viajan en el bundle del cliente por diseño; la de Stadia debe tener el
dominio restringido en su panel.

## Base de datos (Supabase)
Tres tablas en `public`, todas con RLS activo:
- **`profiles`** — se llena sola con el trigger `on_auth_user_created` sobre
  `auth.users`. Lectura pública; cada quien actualiza e inserta la suya.
- **`eventos`** — lectura pública; insertar requiere `auth.uid() = created_by`;
  actualizar y borrar solo el creador.
- **`event_attendees`** — PK `(event_id, user_id)`, con `display_name` y `avatar_url`
  desnormalizados. Lectura pública; cada quien inserta y borra su propia fila.

Bucket público `event-images` para las imágenes; el archivo se nombra con el id del
evento.

Realtime está habilitado en `eventos` y `event_attendees`; `App.tsx` se suscribe a
ambas. Alta y edición además aplican el cambio de forma optimista con `upsertEvent`,
que deduplica por id — así la app no depende de que el canal esté vivo.

> **Cuidado con las migraciones.** No se usa el CLI de Supabase; los `.sql` se
> corrieron a mano en el SQL Editor. `migration.sql` por sí solo **no** reproduce la
> base actual: le faltan las columnas de `fix-attendees-columns.sql`, la policy de
> `fix-profiles-insert.sql` y los `GRANT` de `fix-grants.sql` (sin esos GRANT, RLS no
> deja hacer nada). Para levantar un proyecto nuevo hay que correr los seis archivos
> en orden. Consolidarlos en un solo `schema.sql` idempotente es tarea pendiente.

## Paleta de colores
| Uso | Hex |
|---|---|
| Fondo base | `#0e0f11` |
| Superficie | `#17181B` |
| Superficie clara / modal | `#1D1F23` |
| Borde sutil | `#24272B` |
| Borde marcado / inputs | `#34383D` |
| **Acento comunidad (rojo)** | `#F3443F` |
| **Acento equipo (azul)** | `#80C6FF` |
| Texto principal | `#EDEFF2` |
| Texto secundario | `#9BA3AC` |
| Texto apagado | `#6B747C` |
| Texto muy apagado | `#454B52` |
| Resalte "hoy" en calendario | `#182530` |
| Botón deshabilitado | `#2A2D31` |

Extras: degradado rojo `linear-gradient(135deg, #F3443F, #c23a35)` para avatares y
el botón de login; banner de error `#2a1a1a` / `#ff6b6b`; banner de éxito
`#1a2a1a` / `#6bffb5`.

Sobre acento rojo el texto va **blanco** (`#EDEFF2`); sobre acento azul va **oscuro**
(`#0e0f11`).

## Decisiones de producto ya tomadas (no reabrir sin pedirlo)
- Semana inicia en **lunes**, termina en domingo.
- Un solo calendario con ambos tipos de evento (no pestañas separadas).
- Nombre de la app: **PerroSOS MTB** (esa capitalización exacta, no todo mayúsculas).
- Punto de reunión: autocompletado de texto **y** mapa con pin (no solo uno).
- Horas en formato 12 h con "a.m." / "p.m.".
- Las rodadas de equipo **pueden** llevar imagen, y es opcional: sin ella el sticker
  muestra el logo del equipo dentro de un pentágono. (El formulario de equipo no tuvo
  imagen entre `dd6c9e1` y este cambio; se reactivó a propósito.)
- El enlace al post original sigue siendo solo de comunidad.
- La asistencia va ligada a la cuenta del usuario, no a texto libre.
- El cartel compartible **no lleva enlace ni QR** por ahora: no hay hosting estable y
  la app pide cuenta, así que un QR llevaría a un muro de login. Se agrega cuando se
  resuelva si el calendario se ve sin cuenta.
- Compartir el cartel lo puede hacer cualquiera, no solo quien creó el evento.

## Problemas conocidos pendientes
Revisión completa hecha el 2026-08-04; se corrigió todo lo que salió de ella salvo lo
que sigue.

1. **Enlaces cortos de Google Maps** (`MapPicker.tsx`, `resolveGoogleMapsUrl`): el
   `fetch` a `maps.app.goo.gl` lo bloquea CORS y no hay forma de resolverlo desde el
   navegador. Hoy al menos se avisa al usuario que pegue el enlace largo; el arreglo
   de fondo es un proxy propio (una Edge Function de Supabase que siga el redirect).
2. **Sin ESLint**: no hay configuración, y quedan comentarios
   `// eslint-disable-next-line react-hooks/exhaustive-deps` en `App.tsx` y
   `MapPicker.tsx` que no hacen nada hasta que se configure.
3. **Sin tests** de ningún tipo.
4. **Las variables de `@theme` siguen sin usarse**: decidir si se migra todo el color
   inline a clases de Tailwind o si se quitan del CSS. Mientras tanto, no mezclar.
5. **`event_attendees.display_name` está desnormalizado** y no se actualiza si el
   usuario cambia su nombre en `profiles`.
6. **No se puede quitar una imagen ya subida**, solo reemplazarla por otra.

## Pendientes de producto
1. **Hosting** para que el enlace sea estable y compartible en WhatsApp (Vercel o
   Netlify son las opciones naturales).
2. **Decidir si el calendario se ve sin cuenta.** Hoy la RLS permite lectura anónima,
   pero `App.tsx` bloquea todo detrás del login: el enlace compartido por WhatsApp
   pide crear cuenta, justo lo contrario del objetivo del proyecto.
3. Editar el nombre desde el perfil y recuperación de contraseña — ninguno existe.

## Contexto del autor
Proyecto personal/de equipo en México (Puebla), fuera del trabajo de FactoR[i]zando
(la plataforma educativa) y de Véloci (la PWA de la tienda de bicis de Charls) —
son tres proyectos distintos aunque comparten stack (React/Vite/Supabase).
