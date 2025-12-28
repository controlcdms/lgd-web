import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ProjectsClient from "./ProjectsClient";

type M2O = false | [number, string];

type Project = {
  id: number;
  repo_name: string;
  progress_status?: string;
  active?: boolean;
  base_version?: string;
  branch_version?: string;
  user_id?: M2O;
  owner_id?: M2O;
  html_url?: string;
  ssh_url?: string;
};

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");

  const githubId =
    (session as any)?.user?.githubId ?? (session as any)?.githubId;

  if (!githubId) {
    return (
      <main className="min-h-screen p-6 text-white">
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify({ ok: false, error: "No githubId en session", session }, null, 2)}
        </pre>
      </main>
    );
  }

  const origin =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  const r = await fetch(`${origin}/api/odoo/projects`, {
    cache: "no-store",
    headers: { "x-github-id": String(githubId) },
  });

  const data = await r.json();

  if (!r.ok || data?.ok === false) {
    return (
      <main className="min-h-screen p-6 text-white">
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify({ status: r.status, data }, null, 2)}
        </pre>
      </main>
    );
  }

  const projects: Project[] = data.projects ?? [];

  return (
    <main className="min-h-screen p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">LGD Dashboard</h1>
          <Link className="text-sm underline text-white/80" href="/">Home</Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-sm text-white/70">No hay proyectos.</div>
        ) : (
          <ProjectsClient projects={projects} />
        )}
      </div>
    </main>
  );
}
