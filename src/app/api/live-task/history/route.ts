import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// 近期處理過的名片（真實資料）：contacts(line_card) + visit_offers / pending_invites 的結果
export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent") ?? "";
  if (agent !== "visit") return NextResponse.json({ items: [] });

  try {
    const supabase = getSupabase();
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id,name,company,created_at")
      .eq("source", "line_card")
      .order("created_at", { ascending: false })
      .limit(8);

    if (!contacts?.length) return NextResponse.json({ items: [] });

    const ids = contacts.map((c: { id: string }) => c.id);
    const [{ data: offers }, { data: invites }] = await Promise.all([
      supabase.from("visit_offers").select("contact_id,status,created_at").in("contact_id", ids).order("created_at", { ascending: false }),
      supabase.from("pending_invites").select("contact_id,status,created_at").in("contact_id", ids).order("created_at", { ascending: false }),
    ]);

    const offerBy = new Map<string, string>();
    (offers ?? []).forEach((o: { contact_id: string; status: string }) => {
      if (!offerBy.has(o.contact_id)) offerBy.set(o.contact_id, o.status);
    });
    const inviteBy = new Map<string, string>();
    (invites ?? []).forEach((i: { contact_id: string; status: string }) => {
      if (!inviteBy.has(i.contact_id)) inviteBy.set(i.contact_id, i.status);
    });

    const items = contacts.map((c: { id: string; name: string; company: string | null; created_at: string }) => {
      const inv = inviteBy.get(c.id);
      const off = offerBy.get(c.id);
      let outcome = "已辨識";
      if (inv === "pending" || inv === "sent" || inv === "confirmed") outcome = "已寄邀約";
      else if (inv === "awaiting_approval") outcome = "待核准";
      else if (off === "accepted") outcome = "已確認";
      else if (off === "declined") outcome = "未安排";
      else if (off === "pending") outcome = "待回覆";
      return { name: c.name, company: c.company ?? null, outcome, at: c.created_at };
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
