import { NextRequest, NextResponse } from "next/server";
import { getSignals } from "@/lib/signals-data";
import { getServerUser } from "@/lib/get-server-user";
import { getEntitlement, applyEntitlementToAll } from "@/lib/entitlements";
import type { Market, SignalStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  const signals = await getSignals();
  const market = request.nextUrl.searchParams.get("market") as Market | null;
  const status = request.nextUrl.searchParams.get("status") as SignalStatus | null;

  let filtered = signals;
  if (market) filtered = filtered.filter((s) => s.market === market);
  if (status) filtered = filtered.filter((s) => s.status === status);

  const user = await getServerUser();
  const entitlement = await getEntitlement(user?.uid ?? null);

  return NextResponse.json({ signals: applyEntitlementToAll(filtered, entitlement) });
}
