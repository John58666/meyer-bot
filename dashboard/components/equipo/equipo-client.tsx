"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  createMiembroEquipo,
  toggleMiembroActivo,
  updateMiembroRole,
  type MiembroEquipo,
} from "@/lib/actions";

interface Props {
  miembros: MiembroEquipo[];
  businessId: number;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  barbero: "Barbero",
};

export function EquipoClient({ miembros: initialMiembros, businessId }: Props) {
  const [miembros, setMiembros] = useState(initialMiembros);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "barbero">("barbero");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const result = await createMiembroEquipo({ businessId, email, password, name, role });

    setSubmitting(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setEmail("");
    setPassword("");
    setName("");
    setRole("barbero");
    setShowForm(false);
    window.location.reload();
  }

  async function handleToggleActive(userId: number, current: boolean) {
    await toggleMiembroActivo(userId, businessId, !current);
    setMiembros((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, active: !current } : m))
    );
  }

  async function handleRoleChange(userId: number, newRole: "admin" | "barbero") {
    await updateMiembroRole(userId, businessId, newRole);
    setMiembros((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {showForm ? "Cancelar" : "+ Agregar miembro"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3 max-w-md"
        >
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">
              Contraseña (mín. 8 caracteres)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 pr-10 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Compártela directamente con la persona — no se puede recuperar desde aquí.
            </p>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "barbero")}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            >
              <option value="barbero">Barbero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {formError && <p className="text-red-400 text-xs">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium hidden sm:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Role</th>
              <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {miembros.map((m, i) => (
              <tr
                key={m.id}
                className={i !== miembros.length - 1 ? "border-b border-[var(--border-subtle)]" : ""}
              >
                <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">{m.email}</td>
                <td className="px-4 py-3">
                  {m.role === "owner" ? (
                    <span className="text-[var(--text-secondary)]">{ROLE_LABELS[m.role]}</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as "admin" | "barbero")}
                      className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-white text-xs"
                    >
                      <option value="barbero">Barbero</option>
                      <option value="admin">Administrador</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.role === "owner" ? (
                    <span className="text-green-400 text-xs">Activo</span>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(m.id, m.active)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        m.active
                          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      }`}
                    >
                      {m.active ? "Activo" : "Inactivo"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
