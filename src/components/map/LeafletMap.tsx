"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Use CDN-hosted marker icons so bundling never breaks (Leaflet's
// default icon paths don't survive webpack bundling).
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: "red" | "orange" | "yellow" | "green" | "blue" | "cyan" | "brand";
}

const COLOR_HEX: Record<string, string> = {
  red: "#dc2626",
  orange: "#ea580c",
  yellow: "#ca8a04",
  green: "#16a34a",
  blue: "#2563eb",
  cyan: "#0891b2",
  brand: "#0f9069",
};

function coloredIcon(color?: string) {
  const hex = COLOR_HEX[color ?? "brand"];
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${hex};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  height?: number | string;
  markers?: MapMarker[];
  interactive?: boolean;
  onPick?: (lat: number, lng: number) => void;
  pickedPosition?: [number, number] | null;
  circles?: { lat: number; lng: number; radiusMeters: number; color?: string }[];
  maxBounds?: L.LatLngBoundsExpression;
  minZoom?: number;
  boundaryGeoJSON?: GeoJSON.FeatureCollection;
}

export default function LeafletMap({
  center,
  zoom = 14,
  height = 300,
  markers = [],
  interactive = false,
  onPick,
  pickedPosition,
  circles = [],
  maxBounds,
  minZoom,
  boundaryGeoJSON,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      ...(maxBounds ? { maxBounds, minZoom: minZoom ?? 4, maxBoundsViscosity: 1.0 } : {}),
    });
    if (maxBounds) {
      map.fitBounds(maxBounds as L.LatLngBoundsExpression, { padding: [0, 0] });
    } else {
      map.setView(center, zoom);
    }
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      noWrap: maxBounds ? true : false,
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setReady(true);

    // Add boundary outline if provided
    if (boundaryGeoJSON) {
      L.geoJSON(boundaryGeoJSON, {
        style: {
          color: "#16a34a",
          weight: 3,
          opacity: 1,
          fillColor: "#16a34a",
          fillOpacity: 0.08,
        },
      }).addTo(map);
    }

    // Fix map rendering in modals — invalidate size after a tick
    requestAnimationFrame(() => map.invalidateSize());
    const timer = setTimeout(() => map.invalidateSize(), 200);

    if (interactive && onPick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onPick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when center prop changes materially (e.g. geolocation resolved).
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  // Redraw markers/circles/picked position.
  useEffect(() => {
    if (!ready || !layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], { icon: m.color ? coloredIcon(m.color) : defaultIcon });
      if (m.label) marker.bindPopup(m.label);
      marker.addTo(layerGroupRef.current);
    }

    for (const c of circles) {
      L.circle([c.lat, c.lng], {
        radius: c.radiusMeters,
        color: COLOR_HEX[c.color ?? "brand"],
        fillColor: COLOR_HEX[c.color ?? "brand"],
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(layerGroupRef.current);
    }

    if (pickedPosition) {
      L.marker(pickedPosition, { icon: defaultIcon }).addTo(layerGroupRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(markers), JSON.stringify(circles), pickedPosition?.[0], pickedPosition?.[1]]);

  return <div ref={containerRef} style={{ height, width: "100%" }} className="overflow-hidden rounded-xl2 border border-slate-200" />;
}
