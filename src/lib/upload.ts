import { supabase } from "./supabase";

const BUCKET = "event-images";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 1600; // px del lado mas largo
const QUALITIES = [0.85, 0.7, 0.55];

export type UploadResult = { url: string } | { error: string };

// Reescala y recomprime a JPEG hasta que quepa en MAX_SIZE. Las fotos de celular
// pasan de 2MB casi siempre, asi que sin esto la mayoria de las imagenes no se
// podrian subir.
async function compressImage(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  for (const quality of QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (blob && blob.size <= MAX_SIZE) return blob;
  }
  return null;
}

export async function uploadEventImage(
  file: File,
  eventId: string
): Promise<UploadResult> {
  let body: Blob = file;
  let ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  let contentType = file.type || "image/jpeg";

  if (file.size > MAX_SIZE) {
    let compressed: Blob | null = null;
    try {
      compressed = await compressImage(file);
    } catch {
      // createImageBitmap no pudo decodificar el archivo (p. ej. un HEIC en un
      // navegador que no lo soporta).
      return {
        error: "No se pudo leer la imagen. Intenta con un JPG o PNG.",
      };
    }
    if (!compressed) {
      return {
        error: "La imagen es demasiado pesada incluso comprimida. Usa una mas ligera.",
      };
    }
    body = compressed;
    ext = "jpg";
    contentType = "image/jpeg";
  }

  const path = `${eventId}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    contentType,
  });

  if (error) {
    return { error: `No se pudo subir la imagen: ${error.message}` };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
