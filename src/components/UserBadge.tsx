"use client";

import { useSession } from "next-auth/react";

export default function UserBadge() {
  const { data: session } = useSession();

  const githubLogin = (session?.user as any)?.githubLogin as string | undefined;
  const displayName = session?.user?.name || githubLogin || session?.user?.email || "";

  if (!displayName) return null;

  return (
    <div className="ml-auto flex flex-col items-end text-right">
      <div className="text-[10px] uppercase tracking-widest text-white/40">Usuario</div>
      <div className="text-xs text-white/90 truncate max-w-[160px]">{displayName}</div>
      {githubLogin && displayName !== githubLogin ? (
        <div className="text-[10px] text-white/50 truncate max-w-[160px]">@{githubLogin}</div>
      ) : null}
    </div>
  );
}
