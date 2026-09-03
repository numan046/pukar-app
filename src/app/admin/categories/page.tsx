"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";

interface Category { id: string; department_id: string; name: string; description: string | null; is_active: number; department_name?: string; }
interface Dept { id: string; name: string; }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", department_id: "", description: "" });
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.categories ?? []));
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? []));
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditCat(null); setForm({ name: "", department_id: "", description: "" }); setShowModal(true); }
  function openEdit(c: Category) { setEditCat(c); setForm({ name: c.name, department_id: c.department_id, description: c.description ?? "" }); setShowModal(true); }

  async function save() {
    setBusy(true);
    try {
      if (editCat) {
        await fetch(`/api/categories/${editCat.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else {
        await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      }
      setShowModal(false); load();
    } finally { setBusy(false); }
  }

  async function toggleActive(c: Category) {
    await fetch(`/api/categories/${c.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deactivate: !c.is_active }) });
    load();
  }

  // Group by department
  const grouped = departments.map(d => ({ ...d, categories: categories.filter(c => c.department_id === d.id) }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Issue Categories</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Manage issue categories per department</p>
        </div>
        <Button onClick={openCreate} className="whitespace-nowrap">+ New Category</Button>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {grouped.map(g => (
          <Card key={g.id} className="p-4">
            <h2 className="text-base font-bold text-slate-900">{g.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.categories.map(c => (
                <div key={c.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${c.is_active ? "border-slate-200 bg-white" : "border-red-200 bg-red-50 opacity-60"}`}>
                  <span className="font-medium text-slate-700">{c.name}</span>
                  <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:underline">edit</button>
                  <button onClick={() => toggleActive(c)} className="text-xs text-red-500 hover:underline">{c.is_active ? "deactivate" : "activate"}</button>
                </div>
              ))}
              {g.categories.length === 0 && <span className="text-sm text-slate-400">No categories yet</span>}
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-0">
          <Card className="mx-2 sm:mx-0 w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">{editCat ? "Edit Category" : "New Category"}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <input placeholder="Category Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" disabled={busy || !form.name.trim() || !form.department_id} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
