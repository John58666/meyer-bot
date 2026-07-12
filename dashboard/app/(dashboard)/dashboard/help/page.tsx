import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HelpCircle, Calendar, BarChart2, Users, Settings, UserCog, ClipboardList, ShieldAlert, MessageCircle } from "lucide-react";

const faqs = [
  {
    icon: Calendar,
    title: "¿Cómo agendo una cita?",
    content:
      "Ve a Agenda y selecciona un día en el calendario. Elige un horario disponible, selecciona el servicio y profesional, y confirma. También puedes agendar desde WhatsApp conversando con el bot del negocio.",
  },
  {
    icon: MessageCircle,
    title: "¿Cómo agendo desde WhatsApp?",
    content:
      "Envía un mensaje al número de WhatsApp del negocio. El bot te guiará para seleccionar servicio, profesional, fecha y hora. Al final recibirás una confirmación.",
  },
  {
    icon: Calendar,
    title: "¿Cómo cancelo o reagendo una cita?",
    content:
      "Desde WhatsApp: envía 'cancelar cita' o 'reagendar cita' y el bot te mostrará tus citas próximas para seleccionar. Desde el dashboard: ve a Agenda, busca la cita y usa las opciones de cancelar o reagendar.",
  },
  {
    icon: BarChart2,
    title: "¿Qué datos veo en Métricas?",
    content:
      "Métricas muestra ingresos, total de citas, tasa de cancelación, hora pico y servicios más vendidos. Puedes filtrar por Hoy, Semana o Mes. Si tienes rol de profesional, solo ves tus propias métricas.",
  },
  {
    icon: Users,
    title: "¿Cómo se registran los clientes?",
    content:
      "Los clientes se registran automáticamente al agendar una cita (tanto por WhatsApp como por el dashboard). Puedes ver la lista completa en Clientes, con historial de citas y datos de contacto.",
  },
  {
    icon: Settings,
    title: "¿Cómo configuro los servicios y horarios?",
    content:
      "Ve a Configuración → Servicios para agregar, editar o eliminar servicios con sus precios. En Horarios puedes definir los días y horas de atención. Estos cambios se reflejan automáticamente en el bot de WhatsApp.",
  },
  {
    icon: UserCog,
    title: "¿Cómo gestiono el equipo?",
    content:
      "Ve a Equipo para crear nuevos usuarios (profesionales o administradores), asignar roles y gestionar accesos. Cada profesional ve solo sus propias citas y métricas. Solo el dueño puede gestionar el equipo.",
  },
  {
    icon: ClipboardList,
    title: "¿Para qué sirve Auditoría?",
    content:
      "Auditoría registra todas las acciones importantes del sistema: creación, cancelación y reagendamiento de citas, cambios de configuración, gestión de usuarios, etc. Útil para rastrear quién hizo qué y cuándo.",
  },
  {
    icon: ShieldAlert,
    title: "¿Quién puede ver cada sección?",
    content:
      "Dueño: todo (Inicio, Agenda, Métricas, Clientes, Configuración, Equipo, Auditoría). Administrador: igual que dueño excepto Equipo. Profesional: solo sus citas, métricas y clientes. El acceso está controlado por rol.",
  },
  {
    icon: HelpCircle,
    title: "¿Qué hago si tengo un problema?",
    content:
      "Si encuentras un error o comportamiento inesperado, verifica que los datos de configuración sean correctos (servicios, horarios). Si el problema persiste, contacta al administrador del sistema.",
  },
];

export default async function HelpPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;

  const visibleFaqs = faqs.filter((faq) => {
    if (faq.title === "¿Cómo gestiono el equipo?" && role !== "owner") return false;
    if (faq.title === "¿Para qué sirve Auditoría?" && role === "profesional") return false;
    if (faq.title === "¿Cómo configuro los servicios y horarios?" && role === "profesional") return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Ayuda</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Preguntas frecuentes sobre el uso del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFaqs.map((faq) => (
          <details
            key={faq.title}
            className="group bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
          >
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors list-none [&::-webkit-details-marker]:hidden">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] shrink-0">
                <faq.icon size={18} />
              </div>
              <span className="text-sm font-medium text-white flex-1">{faq.title}</span>
              <svg
                className="w-4 h-4 text-[var(--text-secondary)] transition-transform group-open:rotate-180 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-0">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.content}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
