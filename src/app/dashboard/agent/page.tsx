import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AgentTools from "./AgentTools";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");

  return (
    <main className="min-h-screen p-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Agent</h1>
        </div>
        <AgentTools />
      </div>
    </main>
  );
}
