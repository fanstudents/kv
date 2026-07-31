import { NextResponse } from "next/server";

export function parseOverviewDays(raw: string | null): number {
  return Number(raw) || 7;
}

export async function readOverview<T>(read: () => Promise<T>) {
  try {
    return NextResponse.json({ ok: true, data: await read() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "讀取失敗" },
      { status: 502 },
    );
  }
}
