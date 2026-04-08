import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { slug, name, phone, birthdate } = await req.json();

    if (!slug || !name || !phone) {
      return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Find company by slug
    const { data: company, error: companyErr } = await sb
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .single();

    if (companyErr || !company) {
      return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
    }

    // Normalize phone
    const digits = phone.replace(/\D/g, "");
    const normalized = digits.startsWith("55") ? digits : `55${digits}`;
    if (normalized.length < 12 || normalized.length > 13) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }

    // Upsert contact
    const { error: contactErr } = await sb.from("contacts").upsert(
      {
        company_id: company.id,
        name: name.trim(),
        phone: normalized,
        last_interaction_date: birthdate || null,
        status: "active",
        source: "qrcode",
      },
      { onConflict: "company_id,phone", ignoreDuplicates: false }
    );

    if (contactErr) throw contactErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lead error:", err);
    return NextResponse.json({ error: "Erro ao salvar contato" }, { status: 500 });
  }
}
