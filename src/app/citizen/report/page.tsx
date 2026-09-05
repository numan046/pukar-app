"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import MapClient from "@/components/map/MapClient";
import { Mic, MicOff, Image as ImageIcon, Video, MapPin, CheckCircle2, Loader2, Building2 } from "lucide-react";
import { PUNJAB_BOUNDARY, PUNJAB_BOUNDS } from "@/lib/punjab-boundary";

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ["Describe", "Location", "Department", "Review"];

export default function ReportProblemPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  // Step 0 — description
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recording, setRecording] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);

  // Step 1 — location
  const [mapCenter, setMapCenter] = useState<[number, number]>([32.4945, 74.5229]);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Check if a point is inside Punjab polygon (ray casting)
  function isInsidePunjab(lat: number, lng: number): boolean {
    const feature = PUNJAB_BOUNDARY.features[0];
    if (!feature) return true;
    const coords = (feature.geometry as any).coordinates?.[0] as number[][] | undefined;
    if (!coords) return true; // if no boundary, allow all
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][0], yi = coords[i][1];
      const xj = coords[j][0], yj = coords[j][1];
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Step 2 — department selection
  const [departments, setDepartments] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; department_id: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ department: string; departmentSlug: string; category: string } | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string } | null>(null);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? []));
  }, []);

  // Load categories when department is selected
  useEffect(() => {
    if (selectedDeptId) {
      fetch(`/api/categories?departmentId=${selectedDeptId}`).then(r => r.json()).then(d => {
        setCategories(d.categories ?? []);
        setSelectedCategoryId("");
      });
    }
  }, [selectedDeptId]);

  // AI suggestion based on description
  async function getAiSuggestion() {
    if (description.trim().length < 10) return;
    setAiSuggesting(true);
    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, mode: "classify" }),
      });
      const data = await res.json();
      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
        // Auto-select matching department
        const match = departments.find(d => d.slug === data.suggestion.departmentSlug || d.name.toLowerCase() === data.suggestion.department.toLowerCase());
        if (match) setSelectedDeptId(match.id);
      }
    } catch {}
    setAiSuggesting(false);
  }

  function startRecognition(lang: string) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript ?? "";
      if (t) {
        setUploadError(null);
        setDescription(p => p ? `${p} ${t}` : t);
      }
    };

    recognition.onerror = (e: any) => {
      console.error("[Voice] Error:", e.error);
      setRecording(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setUploadError("Microphone access denied. Please allow it in your browser settings, or type your complaint.");
      } else if (e.error === "no-speech") {
        setUploadError("No speech detected. Please try again and speak clearly.");
      } else if (e.error === "network") {
        setUploadError("Voice recognition needs internet. Please type your complaint instead.");
      } else if (e.error === "language-not-supported") {
        setUploadError("Trying English voice recognition…");
        startRecognition("en-US");
        return;
      } else {
        setUploadError("Voice input failed. Please type your complaint.");
      }
    };

    recognition.onend = () => {
      setRecording(false);
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setUploadError(null);

    // Auto-stop after 30 seconds
    recordingTimerRef.current = setTimeout(() => {
      try { recognition.stop(); } catch {}
      setRecording(false);
    }, 30000);
  }

  function toggleVoice() {
    // Clear any pending recording timer
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setUploadError("Voice input isn't supported in this browser. Please use Chrome or Edge.");
      return;
    }

    // If already recording, stop it
    if (recording) {
      try { recognitionRef.current?.stop(); } catch {}
      setRecording(false);
      return;
    }

    // Start SpeechRecognition directly — browser handles permission prompt automatically
    startRecognition("ur-PK");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video") {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadError(null);

    if (kind === "video") {
      // Blob URL for instant preview
      const blobUrl = URL.createObjectURL(file);
      setVideoUrl(blobUrl);
      setVideoName(file.name);
      setVideoLoading(true);
      // Also convert to base64 in background for submission
      const reader = new FileReader();
      reader.onload = () => setVideoBase64(reader.result as string);
      reader.onerror = () => setUploadError("Failed to process video. Please try a smaller file.");
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
        setImageName(file.name);
      };
      reader.onerror = () => setUploadError("Failed to read image. Please try again.");
      reader.readAsDataURL(file);
    }
  }

  function removeImage() { setImageUrl(null); setImageName(null); }
  function removeVideo() { if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl); setVideoUrl(null); setVideoBase64(null); setVideoName(null); setVideoLoading(false); }

  function useCurrentLocation() {
    setLocating(true); setLocationError(null);
    if (!navigator.geolocation) { setLocationError("Geolocation isn't available."); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        if (!isInsidePunjab(next[0], next[1])) {
          setLocationError("Your location is outside Punjab. Complaints can only be filed within Punjab.");
          setLocating(false);
          return;
        }
        setPosition(next); setMapCenter(next); setLocating(false);
      },
      () => { setLocationError("Couldn't get location. Pick on map."); setLocating(false); },
      { timeout: 8000 }
    );
  }

  function canProceed(): boolean {
    if (step === 0) return title.trim().length >= 3 && description.trim().length >= 5;
    if (step === 1) return !!position;
    if (step === 2) return !!selectedDeptId;
    return true;
  }

  async function submitComplaint() {
    if (!position || !selectedDeptId) return;
    setSubmitting(true); setSubmitError(null);
    console.log("[Report] Starting submission...");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log("[Report] Submission timed out after 30s");
        controller.abort();
      }, 30000);

      const res = await fetch("/api/complaints", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          description,
          language: /[\u0600-\u06FF]/.test(description) ? "UR" : "EN",
          hasImage: !!imageUrl, hasVideo: !!videoBase64,
          mediaUrls: [imageUrl, videoBase64].filter(Boolean),
          latitude: position[0], longitude: position[1],
          address: address || undefined, area: area || undefined,
          confirmedDepartmentId: selectedDeptId,
          categoryId: selectedCategoryId || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      console.log("[Report] Response status:", res.status);
      const data = await res.json();
      if (!res.ok) {
        console.log("[Report] Error:", data.error);
        setSubmitError(data.error || "Failed to submit.");
        setSubmitting(false);
        return;
      }
      console.log("[Report] Success:", data.complaint?.complaint_code);
      setSubmitting(false);
      setResult({ code: data.complaint.complaint_code });
    } catch (err: any) {
      console.error("[Report] Submission error:", err);
      if (err.name === "AbortError") {
        setSubmitError("Submission timed out. Please try again.");
      } else {
        setSubmitError("Network error. Please try again.");
      }
      setSubmitting(false);
    }
  }

  // ---------- Submitting screen ----------
  if (submitting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="animate-spin text-brand-600" size={40} />
        <h1 className="text-lg font-bold text-slate-900">Submitting your complaint…</h1>
      </div>
    );
  }

  // ---------- Result screen ----------
  if (result) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-6 text-center">
        <CheckCircle2 size={48} className="text-brand-600" />
        <h1 className="text-xl font-bold text-slate-900">Complaint Registered Successfully!</h1>
        <div className="text-2xl font-mono font-bold text-brand-700">{result.code}</div>
        <p className="text-sm text-slate-500">Your complaint has been sent to the department. You will be notified when it is assigned and resolved.</p>
        <div className="flex w-full gap-3">
          <Button className="flex-1" onClick={() => router.push("/citizen/complaints")}>View My Complaints</Button>
          <Button variant="secondary" className="flex-1" onClick={() => { if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl); setResult(null); setDescription(""); setTitle(""); setPosition(null); setSelectedDeptId(""); setImageUrl(null); setImageName(null); setVideoUrl(null); setVideoBase64(null); setVideoName(null); setVideoLoading(false); setStep(0); }}>
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Wizard steps ----------
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-lg sm:text-xl font-bold text-slate-900">Report a Problem</h1>

      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, idx) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full ${idx <= step ? "bg-brand-600" : "bg-slate-200"}`} />
            <span className={`text-[10px] font-medium ${idx <= step ? "text-brand-700" : "text-slate-400"}`}>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-5">
          <input placeholder="Title (e.g. Large pothole on main road)" value={title} onChange={e => setTitle(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand-500" />
          <textarea rows={5} placeholder="Describe the problem in detail… (The AI will suggest the right department)"
            value={description} onChange={e => setDescription(e.target.value)} onBlur={() => { if (description.length >= 10) getAiSuggestion(); }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleVoice}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${recording ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
              {recording ? <MicOff size={16} /> : <Mic size={16} />}
              {recording ? "Stop" : "Record voice"}
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <ImageIcon size={16} />{imageUrl ? (imageName || "Image added") : "Add photo"}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, "image")} />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Video size={16} />{videoUrl ? (videoName || "Video added") : "Add video"}
              <input type="file" accept="video/*" className="hidden" onChange={e => handleFileChange(e, "video")} />
            </label>
          </div>
          {imageUrl && (
            <div className="flex flex-col gap-1.5">
              <img src={imageUrl} alt="Evidence" className="h-40 w-full rounded-lg object-cover" />
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="truncate text-xs text-slate-600 max-w-[80%]">{imageName}</span>
                <button type="button" onClick={removeImage} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Remove
                </button>
              </div>
            </div>
          )}
          {videoUrl && (
            <div className="flex flex-col gap-1.5">
              <div className="relative h-40 w-full rounded-lg bg-slate-900 overflow-hidden">
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-white" />
                  </div>
                )}
                <video
                  src={videoUrl}
                  className="h-full w-full object-cover"
                  controls
                  onLoadedData={() => setVideoLoading(false)}
                  onError={() => { setVideoLoading(false); setUploadError("Video format not supported. Try MP4, WebM, or MOV."); }}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="truncate text-xs text-slate-600 max-w-[80%]">{videoName}</span>
                <button type="button" onClick={removeVideo} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Remove
                </button>
              </div>
            </div>
          )}
          {uploadError && <div className="text-xs text-red-600">{uploadError}</div>}
          {aiSuggesting && <div className="flex items-center gap-2 text-xs text-brand-600"><Loader2 size={14} className="animate-spin" /> AI is suggesting a department…</div>}
          {aiSuggestion && !aiSuggesting && (
            <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
              <Building2 size={14} className="inline mr-1" />
              AI suggests: <strong>{aiSuggestion.department}</strong> — {aiSuggestion.category}
            </div>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card className="flex flex-col gap-3 p-4 sm:p-5">
          <Button variant="secondary" onClick={useCurrentLocation} disabled={locating}>
            <MapPin size={16} /> {locating ? "Locating…" : "Use current location"}
          </Button>
          {locationError && <div className="text-xs text-red-600">{locationError}</div>}
          <div className="sm:hidden">
            <MapClient center={position ?? mapCenter} zoom={10} height={250} interactive
              maxBounds={PUNJAB_BOUNDS} minZoom={8} boundaryGeoJSON={PUNJAB_BOUNDARY}
              pickedPosition={position} onPick={(lat, lng) => {
                if (!isInsidePunjab(lat, lng)) {
                  setLocationError("Please select a location inside Punjab.");
                  return;
                }
                setLocationError(null);
                setPosition([lat, lng]);
              }} />
          </div>
          <div className="hidden sm:block">
            <MapClient center={position ?? mapCenter} zoom={10} height={300} interactive
              maxBounds={PUNJAB_BOUNDS} minZoom={8} boundaryGeoJSON={PUNJAB_BOUNDARY}
              pickedPosition={position} onPick={(lat, lng) => {
                if (!isInsidePunjab(lat, lng)) {
                  setLocationError("Please select a location inside Punjab.");
                  return;
                }
                setLocationError(null);
                setPosition([lat, lng]);
              }} />
          </div>
          <p className="text-xs text-slate-500">{position ? "Location set. Tap map to adjust." : "Tap on the map to set the exact location."}</p>
          <input placeholder="Area / neighborhood" value={area} onChange={e => setArea(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
          <input placeholder="Address (optional)" value={address} onChange={e => setAddress(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
        </Card>
      )}

      {step === 2 && (
        <Card className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="text-sm font-semibold text-slate-700">Select Department</div>
          <div className="flex flex-col gap-2">
            {departments.map(d => (
              <button key={d.id} onClick={() => setSelectedDeptId(d.id)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${selectedDeptId === d.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                <Building2 size={16} /> {d.name}
              </button>
            ))}
          </div>

          {categories.length > 0 && (
            <>
              <div className="mt-2 text-sm font-semibold text-slate-700">Issue Category</div>
              <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500">
                <option value="">— Select category (optional) —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card className="flex flex-col gap-3 p-4 sm:p-5 text-sm">
          <Field label="Title" value={title || "No title"} />
          <Field label="Description" value={description} />
          <Field label="Location" value={`${position?.[0].toFixed(4)}, ${position?.[1].toFixed(4)}${area ? ` — ${area}` : ""}`} />
          <Field label="Department" value={departments.find(d => d.id === selectedDeptId)?.name ?? "—"} />
          {selectedCategoryId && <Field label="Category" value={categories.find(c => c.id === selectedCategoryId)?.name ?? "—"} />}
          {imageUrl && <Field label="Photo" value={imageName || "Attached"} />}
          {videoUrl && <Field label="Video" value={videoName || "Attached"} />}
          {submitError && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{submitError}</div>}
        </Card>
      )}

      <div className="flex gap-3">
        {step > 0 && <Button variant="secondary" className="flex-1" onClick={() => setStep(s => (s - 1) as Step)}>Back</Button>}
        {step < 3 ? (
          <Button className="flex-1" disabled={!canProceed()} onClick={() => setStep(s => (s + 1) as Step)}>Next</Button>
        ) : (
          <Button className="flex-1" onClick={submitComplaint}>Submit Complaint</Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm text-slate-800">{value}</div>
    </div>
  );
}
