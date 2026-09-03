"use client";
import { useState } from "react";
import { X, Lock, Eye, EyeOff } from "lucide-react";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPw.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPw !== confirm) { setError("New passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to change password."); return; }
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100"><X size={18} className="text-slate-500" /></button>
        </div>

        {success ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-sm font-medium text-green-700">
            Password changed successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Enter new password (min 6 chars)"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="Re-enter new password"
              />
            </div>
            {error && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
