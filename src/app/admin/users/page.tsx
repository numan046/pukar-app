"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";

interface User {
  id: string; name: string; email: string; role: string; phone: string | null;
  department_id: string | null; designation: string | null; is_active: number;
  department_name?: string;
}
interface Dept { id: string; name: string; }

const ROLES = ["SUPER_ADMIN", "DEPARTMENT_OFFICER", "EMPLOYEE", "CITIZEN"] as const;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "EMPLOYEE" as string, department_id: "", designation: "" });
  const [busy, setBusy] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  function load() {
    fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users ?? []));
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(d.departments ?? []));
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditUser(null); setForm({ name: "", email: "", phone: "", role: "EMPLOYEE", department_id: "", designation: "" });
    setCreatedCreds(null); setShowModal(true);
  }
  function openEdit(u: User) {
    setEditUser(u); setForm({ name: u.name, email: u.email, phone: u.phone ?? "", role: u.role, department_id: u.department_id ?? "", designation: u.designation ?? "" });
    setCreatedCreds(null); setShowModal(true);
  }

  async function save() {
    setBusy(true);
    try {
      if (editUser) {
        await fetch(`/api/admin/users`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: editUser.id, ...form }),
        });
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok && data.tempPassword) {
          setCreatedCreds({ email: form.email, password: data.tempPassword });
          load(); setBusy(false); return; // Don't close modal, show credentials
        }
      }
      setShowModal(false); load();
    } finally { setBusy(false); }
  }

  async function toggleActive(u: User) {
    await fetch("/api/admin/users", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, deactivate: !u.is_active }),
    });
    load();
  }

  const filtered = users.filter(u => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return u.name.toLowerCase().includes(f) || u.email.toLowerCase().includes(f) || u.role.toLowerCase().includes(f);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">User Management</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Create and manage system users</p>
        </div>
        <Button onClick={openCreate} className="whitespace-nowrap">+ New User</Button>
      </div>

      <input placeholder="Search users…" value={filter} onChange={e => setFilter(e.target.value)}
        className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 md:w-80" />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
              <th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Role</th><th className="pb-2 pr-4">Department</th>
              <th className="pb-2 pr-4">Status</th><th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 pr-4 font-medium text-slate-900">{u.name}</td>
                <td className="py-2.5 pr-4 text-slate-600">{u.email}</td>
                <td className="py-2.5 pr-4"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{u.role}</span></td>
                <td className="py-2.5 pr-4 text-slate-500">{u.department_name ?? "—"}</td>
                <td className="py-2.5 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                <td className="py-2.5">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleActive(u)} className={`text-xs font-medium ${u.is_active ? "text-red-600 hover:underline" : "text-emerald-600 hover:underline"}`}>
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-0">
          <Card className="mx-2 sm:mx-0 w-full max-w-md p-4 sm:p-6">
            {createdCreds ? (
              <>
                <h2 className="text-lg font-bold text-emerald-700">User Created!</h2>
                <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm">
                  <p className="font-medium text-slate-700">Share these credentials:</p>
                  <div className="mt-2 space-y-1">
                    <div><span className="text-slate-500">Email:</span> <span className="font-mono font-bold text-slate-900">{createdCreds.email}</span></div>
                    <div><span className="text-slate-500">Password:</span> <span className="font-mono font-bold text-slate-900">{createdCreds.password}</span></div>
                  </div>
                </div>
                <Button className="mt-4 w-full" onClick={() => setShowModal(false)}>Done</Button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900">{editUser ? "Edit User" : "New User"}</h2>
                <div className="mt-4 flex flex-col gap-3">
                  <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {(form.role === "DEPARTMENT_OFFICER" || form.role === "EMPLOYEE") && (
                    <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                  {form.role === "EMPLOYEE" && (
                    <input placeholder="Designation (e.g. Field Technician)" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  )}
                </div>
                <div className="mt-5 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button className="flex-1" disabled={busy || !form.name.trim() || !form.email.trim()} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
