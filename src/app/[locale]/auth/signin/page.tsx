"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">LGD Panel</h1>
          <p className="text-sm text-zinc-600">
            <b>ES:</b> Despliega y administra tus entornos Odoo con trazabilidad (builds, releases,
            webhooks y monitoreo) en un solo lugar.
          </p>
          <p className="text-sm text-zinc-600">
            <b>EN:</b> Deploy and manage your Odoo environments with full traceability (builds,
            releases, webhooks, and monitoring) in one place.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => signIn("github")}
            className="w-full rounded-lg bg-black px-4 py-2 text-white hover:bg-zinc-800"
          >
            Continue with GitHub
          </button>

          <div className="text-xs text-zinc-500">
            By continuing you agree to authenticate with GitHub. This app will create/update your
            user in Odoo automatically.
          </div>

          <div className="text-xs text-zinc-500">
            <Link className="underline" href="/">
              Back
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
