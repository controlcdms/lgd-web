import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import UserBadge from "@/components/UserBadge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-900 md:flex">
      {/* Mobile top nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0c0c0e]/95 px-3 py-2 backdrop-blur md:hidden">
        <div className="flex items-start gap-3">
          <div className="mb-2 text-xs font-bold tracking-wide text-white">LetsGoDeploy</div>
          <UserBadge />
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          <Link href="/dashboard" className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80">
            📁 Proyectos
          </Link>
          <Link href="/dashboard/images" className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80">
            🧱 Imágenes
          </Link>
          <Link href="/dashboard/licenses" className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80">
            🪪 Licencias
          </Link>
        </nav>
      </header>

      <Sidebar />
      <main className="flex-1 p-3 md:p-6">{children}</main>
    </div>
  );
}
