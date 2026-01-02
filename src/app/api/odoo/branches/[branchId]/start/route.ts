import { NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await ctx.params;

    console.log("🟢 [1] start branch, branchId:", branchId);

    const id = parseInt(branchId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid branch id" },
        { status: 400 }
      );
    }

    await odooCall("server.branches", "start_container", [[id]]);

    console.log("🟢 [2] start_container ejecutado");

    return NextResponse.json({
      ok: true,
      message: "Contenedor iniciado correctamente",
    });
  } catch (error: any) {
    console.error("🔴 start_container error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          error?.data?.message ||
          "Error al iniciar el contenedor",
      },
      { status: 500 }
    );
  }
}
