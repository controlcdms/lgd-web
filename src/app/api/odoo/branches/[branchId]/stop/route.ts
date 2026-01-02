import { NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ branchId: string }> }
) {
  try {
    // 🔑 CLAVE: params es Promise
    const { branchId } = await ctx.params;

    console.log("🟢 [1] stop branch, branchId:", branchId);

    const id = parseInt(branchId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid branch id" },
        { status: 400 }
      );
    }

    // lógica LGD real
    await odooCall(
      "server.branches",
      "stop_container",
      [[id]]
    );

    console.log("🟢 [2] stop_container ejecutado");

    return NextResponse.json({
      ok: true,
      message: "Contenedor detenido correctamente",
    });
  } catch (error: any) {
    console.error("🔴 stop_container error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          error?.data?.message ||
          "Error al detener el contenedor",
      },
      { status: 500 }
    );
  }
}
