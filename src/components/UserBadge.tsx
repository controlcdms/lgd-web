"use client";

import { useSession } from "next-auth/react";

export default function UserBadge() {
  const { data: session } = useSession();

  const displayName =
    session?.user?.name ||
    // @ts-ignore
    session?.user?.githubLogin ||
    session?.user?.email ||
    "";

  if (!displayName) return null;

  return (
    <div className="ml-auto flex flex-col items-end text-right">
      <div className="text-[10px] uppercase tracking-widest text-white/40">Usuario</div>
      <div className="text-xs text-white/90 truncate max-w-[160px]">{displayName}</div>
      {/* @ts-ignore */}
      {session?.user?.githubLogin && displayName !== session?.user?.githubLogin ? (
        <div className="text-[10px] text-white/50 truncate max-w-[160px]">@{session?.user?.githubLogin}</div>
      ) : null}
    </div>
  );
}
