import { NextResponse } from "next/server";
import { getSignalById } from "@/lib/signals-data";
import { getServerUser } from "@/lib/get-server-user";
import { getEntitlement, applyEntitlement } from "@/lib/entitlements";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const signal = await getSignalById(id);
  if (!signal) {
    return NextResponse.json({ error: "Signal not found." }, { status: 404 });
  }

  const user = await getServerUser();
  const entitlement = await getEntitlement(user?.uid ?? null);

  return NextResponse.json({ signal: applyEntitlement(signal, entitlement) });
}
