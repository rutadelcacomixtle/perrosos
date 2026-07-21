import { useEffect, useRef, useState, useCallback } from "react";
import { Search, Navigation, MapPin } from "lucide-react";
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
  const compactMapRef = useRef<HTMLDivElement>(null);
  const fullMapRef = useRef<HTMLDivElement>(null);
  const compactMapInstanceRef = useRef<L.Map | null>(null);
  const fullMapInstanceRef = useRef<L.Map | null>(null);
  const compactMarkerRef = useRef<L.Marker | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [suggestions, setSuggestions] = useState<
    Array<{ place_id: number; display_name: string; lat: string; lon: string }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [searchValue, setSearchValue] = useState(place);

  useEffect(() => {
    setSearchValue(place);
  }, [place]);

  // Use refs for callbacks so map useEffects don't re-run on every change
  const onPlaceChangeRef = useRef(onPlaceChange);
  onPlaceChangeRef.current = onPlaceChange;
  const placeRef = useRef(place);
  placeRef.current = place;

  const reverseGeocodeCompact = useCallback(async (lat: number, lng: number) => {
    onPlaceChangeRef.current(placeRef.current, lat, lng);
  }, []);

  const reverseGeocodeFullScreen = useCallback(async (lat: number, lng: number) => {
    onPlaceChangeRef.current(placeRef.current, lat, lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`
      );
      const data = await res.json();
      if (data?.display_name) {
        onPlaceChangeRef.current(data.display_name, lat, lng);
        setSearchValue(data.display_name);
      }
    } catch {
      // sin conexion
    }
  }, []);

  const reverseGeocodeCompactRef = useRef(reverseGeocodeCompact);
  reverseGeocodeCompactRef.current = reverseGeocodeCompact;
  const reverseGeocodeFullScreenRef = useRef(reverseGeocodeFullScreen);
  reverseGeocodeFullScreenRef.current = reverseGeocodeFullScreen;

  const pinIcon = useCallback(async () => {
    const L = await import("leaflet");
    return L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center">
        <div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#80C6FF;border:3px solid #0e0f11;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.6)"></div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  }, []);

  // Compact map — only depends on ref to the DOM element
  useEffect(() => {
    if (!compactMapRef.current || isFullScreen) return;
    let cancelled = false;

    import("leaflet").then(async (L) => {
      if (cancelled || !compactMapRef.current) return;

      const lat = placeLat ?? DEFAULT_LAT;
      const lng = placeLng ?? DEFAULT_LNG;

      const map = L.map(compactMapRef.current, {
        zoomControl: false,
        touchZoom: true,
        dragging: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        maxZoom: 19,
      }).setView([lat, lng], placeLat ? 15 : 12);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap, &copy; CARTO",
          maxZoom: 19,
          subdomains: "abcd",
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const icon = await pinIcon();
      const marker = L.marker([lat, lng], { draggable: false, icon }).addTo(map);

      map.on("moveend", () => {
        const center = map.getCenter();
        marker.setLatLng(center);
        reverseGeocodeCompactRef.current(center.lat, center.lng);
      });

      compactMapInstanceRef.current = map;
      compactMarkerRef.current = marker;

      setTimeout(() => map.invalidateSize(), 150);
    });

    return () => {
      cancelled = true;
      compactMapInstanceRef.current?.remove();
      compactMapInstanceRef.current = null;
      compactMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullScreen]);

  // Full screen map
  useEffect(() => {
    if (!isFullScreen || !fullMapRef.current) return;
    let cancelled = false;

    import("leaflet").then(async (L) => {
      if (cancelled || !fullMapRef.current) return;

      const lat = placeLat ?? DEFAULT_LAT;
      const lng = placeLng ?? DEFAULT_LNG;

      const map = L.map(fullMapRef.current, {
        zoomControl: false,
        touchZoom: true,
        dragging: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        maxZoom: 19,
      }).setView([lat, lng], placeLat ? 16 : 13);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap, &copy; CARTO",
          maxZoom: 19,
          subdomains: "abcd",
        }
      ).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const icon = await pinIcon();
      L.marker([lat, lng], { draggable: false, icon }).addTo(map);

      map.on("moveend", () => {
        const center = map.getCenter();
        reverseGeocodeFullScreenRef.current(center.lat, center.lng);
      });

      fullMapInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => {
      cancelled = true;
      fullMapInstanceRef.current?.remove();
      fullMapInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullScreen]);

  function handleSearchInput(value: string) {
    setSearchValue(value);
    onPlaceChangeRef.current(value, null, null);
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
    onPlaceChangeRef.current(s.display_name, lat, lng);
    setSearchValue(s.display_name);
    setSuggestions([]);
    compactMapInstanceRef.current?.setView([lat, lng], 15);
    fullMapInstanceRef.current?.setView([lat, lng], 16);
  }

  function closeFullScreen() {
    setIsFullScreen(false);
    setSuggestions([]);
  }

  return (
    <>
      {/* Compact mode */}
      <div>
        <div className="relative">
          <Search
            size={14}
            color="#6B747C"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={searchValue}
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

      <div
        ref={compactMapRef}
        onClick={() => setIsFullScreen(true)}
        style={{
          height: 160,
          background: "#1D1F23",
          border: "1px solid #34383D",
          cursor: "pointer",
        }}
        className="rounded-md overflow-hidden relative"
      />
      <p
        className="text-xs mt-1.5 flex items-center gap-1"
        style={{ color: "#6B747C" }}
      >
        <MapPin size={11} /> Toca el mapa para buscar el punto exacto
      </p>

      {/* Full screen */}
      {isFullScreen && (
        <div
          style={{ background: "#0e0f11" }}
          className="fixed inset-0 z-50 flex flex-col"
        >
          {/* Search bar */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0" style={{ background: "#17181B" }}>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  color="#6B747C"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  value={searchValue}
                  onChange={(ev) => handleSearchInput(ev.target.value)}
                  placeholder="Buscar direccion"
                  style={{
                    background: "#0e0f11",
                    border: "1px solid #34383D",
                    color: "#EDEFF2",
                  }}
                  className="rounded-md pl-9 pr-3 py-2.5 text-sm outline-none w-full"
                />
              </div>
              <button
                onClick={closeFullScreen}
                className="px-4 py-2.5 rounded-md text-sm font-[family-name:var(--font-display)] uppercase tracking-wide shrink-0 cursor-pointer"
                style={{
                  background: "#80C6FF",
                  color: "#0e0f11",
                }}
              >
                Listo
              </button>
            </div>
            {suggestions.length > 0 && (
              <div
                style={{
                  background: "#1D1F23",
                  border: "1px solid #34383D",
                }}
                className="mt-2 rounded-md overflow-hidden max-h-48 overflow-y-auto"
              >
                {suggestions.map((s) => (
                  <button
                    key={s.place_id}
                    onClick={() => selectSuggestion(s)}
                    style={{
                      color: "#EDEFF2",
                      borderBottom: "1px solid #24272B",
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs flex items-start gap-2 last:border-b-0 cursor-pointer"
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

          {/* Map */}
          <div ref={fullMapRef} className="flex-1" />

          {/* Bottom hint */}
          <div
            className="px-4 py-3 flex-shrink-0 flex items-center justify-center gap-2"
            style={{ background: "#17181B", borderTop: "1px solid #34383D" }}
          >
            <MapPin size={14} color="#80C6FF" />
            <p className="text-xs" style={{ color: "#9BA3AC" }}>
              Mueve el mapa para colocar el pin en el punto exacto
            </p>
          </div>
        </div>
      )}
    </>
  );
}
