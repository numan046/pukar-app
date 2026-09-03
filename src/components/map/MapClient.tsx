"use client";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center rounded-xl2 border border-slate-200 bg-slate-100 text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

export default LeafletMap;
export type { MapMarker } from "./LeafletMap";
