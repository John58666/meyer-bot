import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { WeekViewV2 } from "@/features/agenda/components/week-viewV2";

export default async function SemanaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const businessId = session.user.businessId;
  const professionalId = session.user.professionalId;
  const isOwnerOrAdmin = session.user.role === "owner" || session.user.role === "admin";

  const { rows: bizRows } = await pool.query<{ name: string }>(
    "SELECT name FROM businesses WHERE id = $1",
    [businessId],
  );
  const businessName = bizRows[0]?.name ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zf-text">Agenda</h1>
        <p className="mt-0.5 text-sm text-zf-text-secondary">
          Gestión de citas y horarios
        </p>
      </div>

      <WeekViewV2
        businessId={businessId}
        businessName={businessName}
        isOwnerOrAdmin={isOwnerOrAdmin}
        userProfessionalId={professionalId}
      />
    </div>
  );
}
