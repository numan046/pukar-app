"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Building2, UserCheck, Users, UserCircle } from "lucide-react";
import type { SessionUser } from "@/types";

export default function AdminDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users ?? []));
  }, []);

  const stats = useMemo(() => {
    const officers = users.filter((u: any) => u.role === "DEPARTMENT_OFFICER");
    const employees = users.filter((u: any) => u.role === "EMPLOYEE");
    const citizens = users.filter((u: any) => u.role === "CITIZEN");
    return { total: users.length, officers: officers.length, employees: employees.length, citizens: citizens.length };
  }, [users]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Manage departments, users, and system settings</p>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Link href="/admin/departments">
          <div className="cursor-pointer hover:shadow-md transition-shadow">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><Building2 size={18} className="text-blue-600" /></div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{departments.length}</div>
                  <div className="text-xs font-medium text-slate-500">Departments</div>
                </div>
              </div>
            </Card>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="cursor-pointer hover:shadow-md transition-shadow">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2"><UserCheck size={18} className="text-indigo-600" /></div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.officers}</div>
                  <div className="text-xs font-medium text-slate-500">Officers</div>
                </div>
              </div>
            </Card>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="cursor-pointer hover:shadow-md transition-shadow">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2"><Users size={18} className="text-emerald-600" /></div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.employees}</div>
                  <div className="text-xs font-medium text-slate-500">Employees</div>
                </div>
              </div>
            </Card>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="cursor-pointer hover:shadow-md transition-shadow">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2"><UserCircle size={18} className="text-purple-600" /></div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.citizens}</div>
                  <div className="text-xs font-medium text-slate-500">Citizens</div>
                </div>
              </div>
            </Card>
          </div>
        </Link>
      </div>

      {/* Departments Table */}
      <div className="mt-8">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">Departments</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="pb-2 pr-4">Department</th>
                <th className="pb-2 pr-4">Officer</th>
                <th className="pb-2 pr-4">Employees</th>
                <th className="pb-2 pr-4">Complaints</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d: any) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-900">{d.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{d.officer_name ?? "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">{d.employee_count}</td>
                  <td className="py-3 pr-4 text-slate-600">{d.complaint_count}</td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
