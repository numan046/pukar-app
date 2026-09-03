"use client";
import { useEffect, useState } from "react";
import { Card, Button } from "@/components/ui";
import type { SessionUser } from "@/types";

interface Employee {
  id: string; name: string; email: string; phone: string | null;
  designation: string | null; is_active: number; department_id: string | null;
}

export default function OfficerEmployeesPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", designation: "" });
  const [busy, setBusy] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [districtName, setDistrictName] = useState("");

  function load() {
    fetch("/api/employees").then(r => r.json()).then(d => setEmployees(d.employees ?? []));
  }
  useEffect(() => {
    load();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setUser(d.user);
      if (d.user?.districtId) {
        fetch("/api/districts").then((r) => r.json()).then((dd) => {
          const district = dd.districts?.find((x: any) => x.id === d.user.districtId);
          if (district) setDistrictName(district.name);
        }).catch(() => {});
      }
    });
  }, []);

  function openCreate() {
    setEditEmp(null); setForm({ name: "", email: "", phone: "", designation: "" });
    setCreatedCreds(null); setShowModal(true);
  }
  function openEdit(e: Employee) {
    setEditEmp(e); setForm({ name: e.name, email: e.email, phone: e.phone ?? "", designation: e.designation ?? "" });
    setCreatedCreds(null); setShowModal(true);
  }

  async function save() {
    setBusy(true);
    try {
      if (editEmp) {
        await fetch(`/api/employees/${editEmp.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setShowModal(false);
      } else {
        const res = await fetch("/api/employees", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok && data.tempPassword) {
          setCreatedCreds({ email: form.email, password: data.tempPassword });
          load(); setBusy(false); return;
        }
      }
      load();
    } finally { setBusy(false); }
  }

  async function toggleActive(e: Employee) {
    await fetch(`/api/employees/${e.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deactivate: !e.is_active }),
    });
    load();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Employees{districtName ? ` — ${districtName}` : ""}</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Manage employees{districtName ? ` in ${districtName}` : ""}</p>
        </div>
        <Button onClick={openCreate} className="whitespace-nowrap">+ Add Employee</Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {employees.map(e => (
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold text-slate-900">{e.name}</div>
                <div className="text-xs text-slate-500">{e.designation || "No designation"}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {e.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="text-slate-600">{e.email}</div>
              {e.phone && <div className="text-slate-500">{e.phone}</div>}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(e)} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Edit</button>
              <button onClick={() => toggleActive(e)} className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${e.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                {e.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </Card>
        ))}
        {employees.length === 0 && <div className="col-span-full py-8 text-center text-slate-400">No employees yet. Add your first employee.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-0">
          <Card className="mx-2 sm:mx-0 w-full max-w-md p-4 sm:p-6">
            {createdCreds ? (
              <>
                <h2 className="text-lg font-bold text-emerald-700">Employee Created!</h2>
                <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm">
                  <p className="font-medium text-slate-700">Share these credentials with the employee:</p>
                  <div className="mt-2 space-y-1">
                    <div><span className="text-slate-500">Email:</span> <span className="font-mono font-bold text-slate-900">{createdCreds.email}</span></div>
                    <div><span className="text-slate-500">Password:</span> <span className="font-mono font-bold text-slate-900">{createdCreds.password}</span></div>
                  </div>
                </div>
                <Button className="mt-4 w-full" onClick={() => setShowModal(false)}>Done</Button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900">{editEmp ? "Edit Employee" : "Add Employee"}</h2>
                <div className="mt-4 flex flex-col gap-3">
                  <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  <input placeholder="Designation (e.g. Field Technician)" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                </div>
                <div className="mt-5 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button className="flex-1" disabled={busy || !form.name.trim() || !form.email.trim()} onClick={save}>
                    {busy ? "Saving…" : editEmp ? "Update" : "Create & Generate Password"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
