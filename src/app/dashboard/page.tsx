import Link from "next/link";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ProjectsClient from "./ProjectsClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");

  const githubId = (session as any)?.user?.githubId ?? (session as any)?.githubId;
  if (!githubId) {
    return (
      <main className="min-h-screen p-6 text-white">
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify({ ok: false, error: "No githubId en session", session }, null, 2)}
        </pre>
      </main>
    );
  }

  // Render immediately, and let the client fetch projects so we can show a
  // visible "Cargando…" state (especially on back navigation).
  return (
    <main className="min-h-screen p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">LGD Dashboard</h1>
        </div>

        <ProjectsClient githubId={String(githubId)} />
      </div>
    </main>
  );
}

