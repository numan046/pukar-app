"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import { MapPin, Plus, UserCheck, UserX } from "lucide-react";

export default function CmoDistrictsPage() {
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDistrict, setShowAddDistrict] = useState(false);
  const [newDistrictName, setNewDistrictName] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [officerName, setOfficerName] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPhone, setOfficerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function loadDistricts() {
    fetch("/api/cmo/districts")
      .then(r => r.json())
      .then(d => { setDistricts(d.districts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadDistricts(); }, []);

  async function addDistrict() {
    if (!newDistrictName.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/cmo/districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDistrictName.trim() }),
    });
    if (res.ok) {
      setNewDistrictName("");
      setShowAddDistrict(false);
      setMessage("District added successfully");
      loadDistricts();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Failed to add district");
    }
    setSubmitting(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function createAndAssignOfficer() {
    if (!officerName.trim() || !officerEmail.trim() || !selectedDistrict) return;
    setSubmitting(true);
    
    // Create new officer
    const res = await fetch("/api/cmo/officers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: officerName.trim(),
        email: officerEmail.trim(),
        phone: officerPhone.trim() || null,
        districtId: selectedDistrict.id,
        designation: `Officer - ${selectedDistrict.name}`,
      }),
    });
    
    if (res.ok) {
      setOfficerName("");
      setOfficerEmail("");
      setOfficerPhone("");
      setShowAssignModal(false);
      setMessage("Officer created and assigned successfully");
      loadDistricts();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Failed to create officer");
    }
    setSubmitting(false);
    setTimeout(() => setMessage(""), 3000);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">District Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage districts and assign officers</p>
        </div>
        <Button onClick={() => setShowAddDistrict(true)}>
          <Plus size={16} /> Add District
        </Button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-brand-50 border border-brand-200 p-3 text-sm text-brand-800">
          {message}
        </div>
      )}

      {/* Add District Modal */}
      {showAddDistrict && (
        <Card className="mb-4 p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Add New District</h3>
          <div className="flex gap-3">
            <input
              value={newDistrictName}
              onChange={e => setNewDistrictName(e.target.value)}
              placeholder="District name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Button onClick={addDistrict} disabled={submitting}>
              {submitting ? "Adding..." : "Add"}
            </Button>
            <Button onClick={() => setShowAddDistrict(false)} className="bg-slate-200 text-slate-700">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Districts Table */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">District</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Officer</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Complaints</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Pending</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Resolved</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {districts.map(d => (
              <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className={d.officer ? "text-green-600" : "text-red-500"} />
                    <span className="font-medium text-slate-900">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {d.officer ? (
                    <div>
                      <div className="font-medium text-slate-900">{d.officer.name}</div>
                      <div className="text-xs text-slate-500">{d.officer.designation}</div>
                    </div>
                  ) : (
                    <span className="text-red-600 text-xs font-medium">No Officer Assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center font-medium">{d.complaintCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-amber-600 font-medium">{d.pendingCount}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-emerald-600 font-medium">{d.resolvedCount}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    onClick={() => { setSelectedDistrict(d); setShowAssignModal(true); }}
                    className="text-xs"
                  >
                    {d.officer ? <UserX size={14} /> : <UserCheck size={14} />}
                    {d.officer ? "Change" : "Assign"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Assign Officer Modal */}
      {showAssignModal && selectedDistrict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {selectedDistrict.officer ? "Change Officer" : "Assign Officer"} — {selectedDistrict.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Officer Name</label>
                <input
                  value={officerName}
                  onChange={e => setOfficerName(e.target.value)}
                  placeholder="Full name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  value={officerEmail}
                  onChange={e => setOfficerEmail(e.target.value)}
                  placeholder="officer@example.com"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Phone (optional)</label>
                <input
                  value={officerPhone}
                  onChange={e => setOfficerPhone(e.target.value)}
                  placeholder="+923001234567"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setShowAssignModal(false)} className="bg-slate-200 text-slate-700">
                Cancel
              </Button>
              <Button onClick={createAndAssignOfficer} disabled={submitting || !officerName || !officerEmail}>
                {submitting ? "Creating..." : "Create & Assign"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
