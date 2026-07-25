import { NextRequest, NextResponse } from "next/server";
import { listContactProfiles, researchContact } from "@/lib/contact-research";
import { getSupabase } from "@/lib/supabase";

// 拜訪前的行前功課：GET 看最近幾份，POST 手動補做一份（平常是約成之後自動觸發）。
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json({ profiles: await listContactProfiles(10) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const contactId = typeof body.contactId === "string" ? body.contactId : null;
  let name = typeof body.name === "string" ? body.name.trim() : "";
  let company = typeof body.company === "string" ? body.company.trim() : null;
  let title: string | null = null;
  let email: string | null = null;

  // 給了 contactId 就以資料庫裡的聯絡人為準
  if (contactId) {
    const { data } = await getSupabase()
      .from("contacts")
      .select("name,company,title,email")
      .eq("id", contactId)
      .maybeSingle();
    if (data) {
      name = data.name ?? name;
      company = data.company ?? company;
      title = data.title ?? null;
      email = data.email ?? null;
    }
  }

  if (!name) return NextResponse.json({ error: "缺少要調查的對象姓名" }, { status: 400 });

  const id = await researchContact({ contactId, name, company, title, email });
  if (!id) return NextResponse.json({ error: "調查失敗，請稍後再試" }, { status: 502 });
  return NextResponse.json({ id, profiles: await listContactProfiles(10) });
}
