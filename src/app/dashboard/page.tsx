import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

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
    headers: {
      "x-github-id": String(githubId), // ✅ identidad explícita
    },
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
          <Link className="text-sm underline text-white/80" href="/">
            Home
          </Link>
        </div>

        {projects.length === 0 && (
          <div className="text-sm text-white/70">No hay proyectos.</div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-white/20 p-4 bg-white/5"
            >
              <div className="font-semibold text-lg">{p.repo_name}</div>

              <div className="text-xs text-white/60 mt-1">
                {p.owner_id ? `Owner: ${p.owner_id[1]}` : "Owner: -"}
                {p.user_id ? ` • User: ${p.user_id[1]}` : ""}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {typeof p.active === "boolean" && (
                  <span className="text-xs rounded-full border border-white/30 px-2 py-1 text-white/80">
                    {p.active ? "active" : "inactive"}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                {p.html_url && (
                  <a
                    className="underline text-white/80"
                    href={p.html_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    repo
                  </a>
                )}
                {p.ssh_url && (
                  <span className="text-white/50 truncate" title={p.ssh_url}>
                    ssh: {p.ssh_url}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
