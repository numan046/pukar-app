"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";

interface Dept {
  id: string; name: string; slug: string; description: string | null; officer_id: string | null;
  is_active: number; officer_name?: string; employee_count?: number; complaint_count?: number;
}
interface Officer { id: string; name: string; email: string; department_id: string | null; }

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState<Dept | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [assignOfficerId, setAssignOfficerId] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? []));
    fetch("/api/admin/users?role=DEPARTMENT_OFFICER").then(r => r.json()).then(d => setOfficers(d.users ?? []));
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditDept(null); setName(""); setSlug(""); setDesc(""); setAssignOfficerId(""); setShowModal(true);
  }
  function openEdit(d: Dept) {
    setEditDept(d); setName(d.name); setSlug(d.slug); setDesc(d.description ?? "");
    setAssignOfficerId(d.officer_id ?? ""); setShowModal(true);
  }

  async function save() {
    setBusy(true);
    try {
      if (editDept) {
        await fetch(`/api/departments/${editDept.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug, description: desc }),
        });
        if (assignOfficerId !== (editDept.officer_id ?? "")) {
          await fetch(`/api/departments/${editDept.id}/assign-officer`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ officerId: assignOfficerId || null }),
          });
        }
      } else {
        const res = await fetch("/api/departments", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), description: desc }),
        });
        const data = await res.json();
        if (res.ok && assignOfficerId && data.department) {
          await fetch(`/api/departments/${data.department.id}/assign-officer`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ officerId: assignOfficerId }),
          });
        }
      }
      setShowModal(false); load();
    } finally { setBusy(false); }
  }

  async function toggleActive(d: Dept) {
    await fetch(`/api/departments/${d.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deactivate: !d.is_active }),
    });
    load();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Departments</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Manage government departments and assign officers</p>
        </div>
        <Button onClick={openCreate} className="whitespace-nowrap">+ New Department</Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {departments.map(d => (
          <Card key={d.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">{d.name}</div>
                <div className="text-xs text-slate-400">{d.slug}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {d.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {d.description && <p className="mt-2 text-xs text-slate-500">{d.description}</p>}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-slate-50 p-2"><div className="text-lg font-bold text-slate-800">{d.officer_name ?? "—"}</div><div className="text-[10px] text-slate-500">Officer</div></div>
              <div className="rounded bg-slate-50 p-2"><div className="text-lg font-bold text-blue-600">{d.employee_count ?? 0}</div><div className="text-[10px] text-slate-500">Employees</div></div>
              <div className="rounded bg-slate-50 p-2"><div className="text-lg font-bold text-indigo-600">{d.complaint_count ?? 0}</div><div className="text-[10px] text-slate-500">Complaints</div></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(d)} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Edit</button>
              <button onClick={() => toggleActive(d)} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${d.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                {d.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-0">
          <Card className="mx-2 sm:mx-0 w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">{editDept ? "Edit Department" : "New Department"}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <input placeholder="Department Name" value={name} onChange={e => setName(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <input placeholder="Slug (e.g. gas)" value={slug} onChange={e => setSlug(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <div>
                <label className="text-xs font-medium text-slate-500">Assign Officer</label>
                <select value={assignOfficerId} onChange={e => setAssignOfficerId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">— No officer —</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)}
                </select>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" disabled={busy || !name.trim()} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
