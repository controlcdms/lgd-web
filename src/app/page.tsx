"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data, status } = useSession();

  return (
    <main className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-3xl font-bold">LGD Web listo 🚀</h1>

      {status === "loading" && <div className="text-sm opacity-70">...</div>}

      {status !== "loading" && !data && (
        <button className="rounded-xl border px-4 py-2" onClick={() => signIn("github")}>
          Login con GitHub
        </button>
      )}

      {status !== "loading" && data && (
        <>
          <div className="text-sm opacity-70">
            {data.user?.name} ({data.user?.email})
          </div>

          <div className="flex gap-3">
            <Link className="rounded-xl border px-4 py-2" href="/dashboard">
              Ir al Dashboard
            </Link>
            <button className="rounded-xl border px-4 py-2" onClick={() => signOut()}>
              Logout
            </button>
          </div>
        </>
      )}
    </main>
  );
}
