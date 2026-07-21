import { useEffect, useRef, useState, useCallback } from "react";
import { Search, Navigation } from "lucide-react";
import type L from "leaflet";

const DEFAULT_LAT = 19.0413;
const DEFAULT_LNG = -98.2062;

interface MapPickerProps {
  place: string;
  placeLat: number | null;
  placeLng: number | null;
  onPlaceChange: (place: string, lat: number | null, lng: number | null) => void;
}

export function MapPicker({
  place,
  placeLat,
  placeLng,
  onPlaceChange,
}: MapPickerProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ place_id: number; display_name: string; lat: string; lon: string }>
  >([]);
  const [searching, setSearching] = useState(false);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      onPlaceChange(place, lat, lng);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`
        );
        const data = await res.json();
        if (data?.display_name) {
          onPlaceChange(data.display_name, lat, lng);
        }
      } catch {
        // sin conexion; se conservan las coordenadas
      }
    },
    [onPlaceChange, place]
  );

  useEffect(() => {
    if (!mapDivRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapDivRef.current) return;

      const lat = placeLat ?? DEFAULT_LAT;
      const lng = placeLng ?? DEFAULT_LNG;

      const map = L.map(mapDivRef.current, { zoomControl: false })
        .setView([lat, lng], placeLat ? 15 : 12);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap, &copy; CARTO",
          maxZoom: 19,
          subdomains: "abcd",
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#80C6FF;border:2px solid #0e0f11;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      });

      const marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        reverseGeocode(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      setTimeout(() => map.invalidateSize(), 150);
    });

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, [placeLat, placeLng, reverseGeocode]);

  function handleSearchInput(value: string) {
    onPlaceChange(value, null, null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&viewbox=${DEFAULT_LNG - 1},${DEFAULT_LAT + 1},${DEFAULT_LNG + 1},${DEFAULT_LAT - 1}`
        );
        const data = await res.json();
        setSuggestions(data ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  }

  function selectSuggestion(s: {
    display_name: string;
    lat: string;
    lon: string;
  }) {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    onPlaceChange(s.display_name, lat, lng);
    setSuggestions([]);
    mapInstanceRef.current?.setView([lat, lng], 15);
    markerInstanceRef.current?.setLatLng([lat, lng]);
  }

  return (
    <>
      <div className="relative">
        <div className="relative">
          <Search
            size={14}
            color="#6B747C"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={place}
            onChange={(ev) => handleSearchInput(ev.target.value)}
            placeholder="Buscar punto de reunion o direccion"
            style={{
              background: "#0e0f11",
              border: "1px solid #34383D",
              color: "#EDEFF2",
            }}
            className="rounded-md pl-9 pr-3 py-2 text-sm outline-none w-full"
          />
        </div>
        {suggestions.length > 0 && (
          <div
            style={{
              background: "#1D1F23",
              border: "1px solid #34383D",
            }}
            className="absolute z-10 w-full mt-1 rounded-md overflow-hidden"
          >
            {suggestions.map((s) => (
              <button
                key={s.place_id}
                onClick={() => selectSuggestion(s)}
                style={{
                  color: "#EDEFF2",
                  borderBottom: "1px solid #24272B",
                }}
                className="w-full text-left px-3 py-2 text-xs flex items-start gap-2 last:border-b-0 cursor-pointer"
              >
                <Navigation size={12} className="mt-0.5 shrink-0" color="#80C6FF" />
                <span className="truncate">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
        {searching && (
          <p className="text-xs mt-1" style={{ color: "#6B747C" }}>
            Buscando...
          </p>
        )}
      </div>

      <div>
        <div
          ref={mapDivRef}
          style={{
            height: 160,
            background: "#1D1F23",
            border: "1px solid #34383D",
          }}
          className="rounded-md overflow-hidden"
        />
        <p
          className="text-xs mt-1.5 flex items-center gap-1"
          style={{ color: "#6B747C" }}
        >
          <Navigation size={11} /> Arrastra el pin para ajustar el punto exacto
        </p>
      </div>
    </>
  );
}
