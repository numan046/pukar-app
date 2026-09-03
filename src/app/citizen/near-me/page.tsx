"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import MapClient, { type MapMarker } from "@/components/map/MapClient";

export default function ProblemsNearMePage() {
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/complaints").then(r => r.json()).then(d => setComplaints(d.complaints ?? []));
  }, []);

  const markers: MapMarker[] = complaints.slice(0, 60).map((c: any) => ({
    id: c.id, lat: c.latitude, lng: c.longitude,
    label: `${c.category ?? "Problem"} — ${c.status}`,
    color: c.status === "RESOLVED" ? "green" : c.status === "OFFICER_REVIEW" ? "red" : "brand",
  }));

  const center: [number, number] = complaints[0] ? [complaints[0].latitude, complaints[0].longitude] : [32.4945, 74.5229];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Problems Near Me</h1>
      <p className="text-sm text-slate-500">Problems reported by citizens near you.</p>
      <Card className="overflow-hidden p-0">
        <MapClient center={center} zoom={13} height={320} markers={markers} />
      </Card>
      <div className="flex flex-col gap-2">
        {complaints.slice(0, 20).map((c: any) => (
          <Card key={c.id} className="flex items-center justify-between p-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">{c.category ?? "Unclassified"}</div>
              <div className="text-xs text-slate-500">{c.area ?? "General area"}</div>
            </div>
            <StatusBadge status={c.status} />
          </Card>
        ))}
        {complaints.length === 0 && <div className="py-8 text-center text-slate-400">No complaints to show</div>}
      </div>
    </div>
  );
}
