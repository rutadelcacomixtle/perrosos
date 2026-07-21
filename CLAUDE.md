# PerroSOS MTB — Calendario de rodadas

## Qué es
Mini web para un grupo de MTB en México. Reemplaza la práctica de compartir eventos
como imagen suelta en WhatsApp con un calendario compartible por enlace. Dos tipos
de evento conviven en el mismo calendario:

- **Comunidad**: alguien comparte una imagen de un evento externo (carrera, rodada
  de otro grupo, etc.). Campos mínimos: título, imagen, lugar, hora.
- **Equipo**: rodadas que organiza el propio equipo. Además de lo anterior, llevan
  distancia (km), desnivel (m), dificultad (Fácil/Moderada/Difícil) y lista de
  quién confirma asistencia.

Los dos tipos se distinguen por color en toda la interfaz (acento amarillo =
comunidad, acento azul = equipo) en vez de estar separados en pestañas.

## Estado actual
Todo vive en **un solo archivo**: `rodadas-calendario.jsx`, un componente React
autocontenido (sin backend, sin persistencia). Es el prototipo funcional tal cual
se probó en el chat; el siguiente trabajo es llevarlo a un proyecto real (Vite +
Supabase, como en el proyecto Véloci) y no rehacer el diseño ni la lógica desde cero.

**Limitación conocida y esperada**: los eventos se guardan solo en el estado de
React de la sesión del navegador. Al recargar la página se pierden. Esto es
intencional en el prototipo — el siguiente paso es Supabase (ver abajo).

## Stack usado en el prototipo
- React (hooks: useState, useMemo, useRef, useEffect) — sin librerías de estado externas.
- Tailwind solo con clases core (sin compilador JIT disponible en el entorno del
  prototipo) — **todos los colores personalizados van en `style={{}}` inline**,
  Tailwind se usa solo para layout/spacing/tipografía. Si migras a un proyecto real
  con Tailwind + JIT, se pueden convertir esos inline styles a clases con los hex
  como variables de tema si se prefiere.
- `lucide-react` para iconos.
- **Mapa**: Leaflet, cargado por `<script>`/`<link>` inyectados dinámicamente desde
  cdnjs (no viene como import porque el entorno del prototipo no lo tenía
  disponible). En un proyecto real con npm, esto se vuelve `npm install leaflet`
  + `import` normal — quitar la inyección manual de script/CSS.
- **Teselas del mapa**: CARTO Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/...`),
  gratis y sin API key, para que combine con el tema oscuro.
- **Geocodificación y autocompletado**: Nominatim (OpenStreetMap), gratis y sin
  API key. Límite de uso razonable (no es para volumen alto); si el proyecto
  crece mucho, considerar un proxy propio con caché o pasar a Google Places
  (ver conversación previa: implica facturación y cuidado con exponer la key
  en el cliente).
- Fuentes vía Google Fonts `@import` dentro de un `<style>` en el propio
  componente: Barlow Condensed (display), Work Sans (body), Space Mono (mono/datos).

## Paleta de colores
| Uso | Hex |
|---|---|
| Fondo base | `#0e0f11` |
| Superficie | `#17181B` |
| Superficie clara / modal | `#1D1F23` |
| Borde sutil | `#24272B` |
| Borde marcado / inputs | `#34383D` |
| Acento comunidad (amarillo) | `#F5C842` |
| Acento equipo (azul) | `#80C6FF` |
| Texto principal | `#EDEFF2` |
| Texto secundario | `#9BA3AC` |
| Texto apagado | `#6B747C` |
| Texto muy apagado | `#454B52` |
| Resalte "hoy" en calendario | `#182530` (derivado del azul) |

## Decisiones de producto ya tomadas (no reabrir sin pedirlo)
- Semana inicia en **lunes**, termina en domingo.
- Un solo calendario con ambos tipos de evento (no pestañas separadas).
- Nombre de la app: **PerroSOS MTB** (con esa capitalización exacta, no todo
  mayúsculas).
- Punto de reunión: autocompletado de texto + mapa con pin arrastrable
  (no solo uno de los dos).

## Próximos pasos sugeridos (pendientes, no hechos)
1. **Persistencia real con Supabase**: tabla `eventos` con columnas equivalentes
   al objeto `event` actual (type, title, place, placeLat, placeLng, time, image,
   distance, elevation, difficulty, attendees, date). Las imágenes hoy se guardan
   como base64 en memoria — para producción conviene subirlas a Supabase Storage
   y guardar solo la URL.
2. **Hosting** para que el enlace sea estable y compartible en WhatsApp (Vercel o
   Netlify son las opciones naturales dado el stack).
3. Decidir si "quién confirma asistencia" pasa de texto libre a algo ligado a
   identidad real de usuario (para que cualquiera desde el link pueda tocar
   "voy" sin escribir su nombre cada vez) — pendiente de decisión de producto.
4. Si el volumen de búsquedas de dirección crece mucho, revisar límites de uso
   de Nominatim o considerar alternativas.

## Contexto del autor
Proyecto personal/de equipo en México (Puebla), fuera del trabajo de FactoR[i]zando
(la plataforma educativa) y de Véloci (la PWA de la tienda de bicis de Charls) —
son tres proyectos distintos aunque comparten stack (React/Vite/Supabase).
