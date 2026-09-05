import { cn } from "@/lib/utils";
import { useState, useEffect, type ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl2 border border-white/60 bg-white/80 shadow-card backdrop-blur-sm transition-shadow duration-300 hover:shadow-lift",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary:
      "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow hover:from-brand-400 hover:to-brand-600 hover:shadow-lift active:scale-[.98] disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none",
    secondary:
      "border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:border-brand-300 hover:bg-brand-50 active:scale-[.98]",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-900/5 active:scale-[.98]",
    danger:
      "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm hover:from-red-400 hover:to-red-600 active:scale-[.98]",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed",
        styles,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function KpiCard({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "default" | "danger" | "warning" | "success" }) {
  const toneClass = {
    default: "text-slate-900",
    danger: "text-red-600",
    warning: "text-amber-600",
    success: "text-brand-700",
  }[tone ?? "default"];
  const accentClass = {
    default: "from-slate-300 to-slate-400",
    danger: "from-red-400 to-red-600",
    warning: "from-amber-300 to-amber-500",
    success: "from-brand-400 to-brand-600",
  }[tone ?? "default"];
  return (
    <Card className="group relative overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70 transition-opacity group-hover:opacity-100", accentClass)} />
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("mt-2 text-3xl font-bold", toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-1 p-10 text-center">
      <div className="text-base font-semibold text-slate-700">{title}</div>
      {body && <div className="text-sm text-slate-500">{body}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-700" />
        {children}
      </h2>
      {action}
    </div>
  );
}

// Detect media type and render appropriate element
export function MediaItem({ url, className, onClick }: { url: string; className?: string; onClick?: () => void }) {
  // Check data URL MIME type first (most reliable for base64 data)
  const isDataVideo = url.startsWith("data:video");
  const isDataAudio = url.startsWith("data:audio");
  
  // Fallback to file extension check for regular URLs
  const isExtVideo = !isDataVideo && !isDataAudio && url.match(/\.(mp4|mov)$/i);
  const isExtAudio = !isDataVideo && !isDataAudio && url.match(/\.(mp3|wav|ogg|aac|m4a)$/i);
  
  const isVideo = isDataVideo || isExtVideo;
  const isAudio = isDataAudio || isExtAudio;

  if (isAudio) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 cursor-pointer hover:bg-slate-100 transition", className)} onClick={onClick}>
        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <audio src={url} controls className="flex-1 h-8 min-w-0" onClick={(e) => e.stopPropagation()} />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden cursor-pointer group", className)} onClick={onClick}>
        <video src={url} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden cursor-pointer group", className)} onClick={onClick}>
      <img src={url} alt="Evidence" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </div>
    </div>
  );
}

// Media viewer modal for full-screen viewing
export function MediaViewer({ urls, initialIndex, onClose }: { urls: string[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const url = urls[currentIndex];

  const isVideo = url.startsWith("data:video") || url.match(/\.(mp4|mov)$/i);
  const isAudio = url.startsWith("data:audio") || url.match(/\.(mp3|wav|ogg|aac|m4a)$/i);

  const goNext = () => setCurrentIndex(i => (i + 1) % urls.length);
  const goPrev = () => setCurrentIndex(i => (i - 1 + urls.length) % urls.length);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white hover:text-slate-300 transition">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Navigation buttons */}
        {urls.length > 1 && (
          <>
            <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-slate-300 transition bg-black/50 rounded-full p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-slate-300 transition bg-black/50 rounded-full p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Media content */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {isAudio ? (
            <div className="flex flex-col items-center gap-6 text-white">
              <svg className="w-32 h-32 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <audio src={url} controls autoPlay className="w-full max-w-md" />
            </div>
          ) : isVideo ? (
            <video src={url} controls autoPlay className="max-w-full max-h-full object-contain" />
          ) : (
            <img src={url} alt="Evidence" className="max-w-full max-h-full object-contain" />
          )}
        </div>

        {/* Counter */}
        {urls.length > 1 && (
          <div className="text-center text-white text-sm mt-4">
            {currentIndex + 1} / {urls.length}
          </div>
        )}
      </div>
    </div>
  );
}
