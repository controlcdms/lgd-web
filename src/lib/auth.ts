// src/lib/auth.ts
import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: "read:user user:email repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token;

      // @ts-ignore
      token.githubLogin = (profile as any)?.login || token.githubLogin;
      // @ts-ignore
      token.email = (profile as any)?.email || token.email;
      if (profile) {
        // @ts-ignore
        token.githubId = (profile as any).id;
      }

      // Ensure Odoo user exists/updated from GitHub login and persist odooUserId in JWT.
      try {
        // @ts-ignore
        const github_login = String(token.githubLogin || "").trim();
        // @ts-ignore
        const github_id = token.githubId ? String(token.githubId) : "";
        // @ts-ignore
        const email = token.email ? String(token.email) : "";
        // @ts-ignore
        const access_token = String(account?.access_token || token.accessToken || "").trim();

        // Run on first sign-in and whenever we receive a fresh access token from GitHub.
        if (github_login && access_token && (!token.odooUserId || account?.access_token)) {
          const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const r = await fetch(`${base}/api/odoo/me/upsert-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token,
              github_login,
              github_id,
              email,
            }),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j?.ok && j?.userId) {
            // @ts-ignore
            token.odooUserId = Number(j.userId);
          }
        }
      } catch {
        // Best-effort: do not block auth flow if Odoo sync fails.
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.githubLogin = token.githubLogin;
        // @ts-ignore
        session.user.email = token.email;
        // ✅ mantenlo SOLO aquí (consistencia)
        // @ts-ignore
        session.user.githubId = token.githubId;
        // @ts-ignore
        session.user.odooUserId = token.odooUserId ?? null;
      }
      return session;
    },

    async signIn() {
      // Upsert now happens in jwt callback (single source).
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
