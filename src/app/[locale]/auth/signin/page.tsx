"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-5 w-5 flex-none text-emerald-300"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.296a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414l2.793 2.793 6.793-6.793a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function SignInPage() {
  const params = useParams<{ locale?: string }>();
  const locale = String(params?.locale || "en").toLowerCase();
  const isEs = locale.startsWith("es");

  const copy = isEs
    ? {
        kicker: "Odoo deployments, bien hechos",
        title: "LGD Panel",
        subtitle:
          "Despliega y administra tus entornos de Odoo con trazabilidad: builds, releases, webhooks y monitoreo en un solo lugar.",
        cta: "Continuar con GitHub",
        note:
          "Al continuar, iniciarás sesión con GitHub. LGD creará/actualizará tu usuario en Odoo automáticamente.",
        back: "Volver",
        features: [
          "Timeline de despliegues y builds (qué pasó y cuándo)",
          "Gestión de imágenes/plantillas y releases",
          "Webhooks + satélites para automatizar acciones",
          "Conexión con Odoo: usuarios, proyectos y ramas",
        ],
      }
    : {
        kicker: "Odoo deployments, done right",
        title: "LGD Panel",
        subtitle:
          "Deploy and manage your Odoo environments with full traceability: builds, releases, webhooks, and monitoring in one place.",
        cta: "Continue with GitHub",
        note:
          "By continuing you will authenticate with GitHub. LGD will create/update your user in Odoo automatically.",
        back: "Back",
        features: [
          "Deploy & build timeline (what happened, when)",
          "Images/templates and release management",
          "Webhooks + satellites to automate actions",
          "Odoo integration: users, projects, and branches",
        ],
      };

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 py-16">
        <div className="w-full">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {copy.kicker}
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
            {copy.subtitle}
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-medium text-zinc-100">{isEs ? "Qué incluye" : "What you get"}</div>
            <ul className="mt-4 space-y-3">
              {copy.features.map((f) => (
                <li key={f} className="flex gap-3 text-sm text-zinc-200">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-medium text-zinc-100">
              {isEs ? "Acceso" : "Access"}
            </div>

            <button
              onClick={() => signIn("github")}
              className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              {copy.cta}
            </button>

            <p className="mt-4 text-xs leading-relaxed text-zinc-400">{copy.note}</p>

            <div className="mt-6 flex items-center justify-between text-xs">
              <Link className="text-zinc-300 underline underline-offset-4" href={`/${isEs ? "es" : "en"}`}>
                {copy.back}
              </Link>

              <div className="flex gap-2">
                <Link
                  className={`rounded-full px-2.5 py-1 ${isEs ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                  href="/es/auth/signin"
                >
                  ES
                </Link>
                <Link
                  className={`rounded-full px-2.5 py-1 ${!isEs ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                  href="/en/auth/signin"
                >
                  EN
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
