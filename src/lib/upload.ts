import { supabase } from "./supabase";

const BUCKET = "event-images";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function uploadEventImage(
  file: File,
  eventId: string
): Promise<string | null> {
  if (file.size > MAX_SIZE) {
    console.warn("Imagen excede 2MB, no se sube");
    return null;
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${eventId}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    console.error("Error subiendo imagen:", error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
