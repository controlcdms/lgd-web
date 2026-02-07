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
      }
      return session;
    },

    async signIn({ account, profile }) {
      try {
        const access_token = account?.access_token;
        const github_login = (profile as any)?.login;
        const github_id = (profile as any)?.id;

        if (!access_token || !github_login) return true;

        const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
        // Upsert user in Odoo (create if missing) so Next is the UI entrypoint.
        await fetch(`${base}/api/odoo/me/upsert-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token,
            github_login,
            github_id,
          }),
        });

        return true;
      } catch {
        // Best-effort: do not block login if Odoo sync fails.
        return true;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
