export type EventType = "comunidad" | "equipo";
export type Difficulty = "Facil" | "Moderada" | "Dificil";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  created_by: string | null;
  date: string;
  type: EventType;
  title: string;
  place: string | null;
  place_lat: number | null;
  place_lng: number | null;
  time: string | null;
  image_url: string | null;
  source_url: string | null;
  distance: string | null;
  elevation: string | null;
  difficulty: string | null;
  created_at: string;
}

export interface EventAttendee {
  event_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface EventWithAttendees extends Event {
  attendees: EventAttendee[];
}
