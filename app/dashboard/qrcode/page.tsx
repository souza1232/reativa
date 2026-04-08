"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode, Copy, CheckCircle, Download, Loader2, RefreshCw,
  Users, Link, Pencil, Save, X
} from "lucide-react";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function QRCodePage() {
  const { user } = useAuth();
  const [slug, setSlug] = useState("");
  const [editingSlug, setEditingSlug] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const [savedOk, setSavedOk] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/cadastro/${slug}`;

  async function loadSlug() {
    if (!user) return;
    setLoading(true);
    const sb = getSupabase();

    const { data } = await sb
      .from("companies")
      .select("slug, name")
      .eq("id", user.id)
      .single();

    if (data) {
      if (data.slug) {
        setSlug(data.slug);
        setEditingSlug(data.slug);
      } else {
        // Auto-generate slug from company name
        const auto = generateSlug(data.name ?? user.id);
        await saveSlug(auto);
        setSlug(auto);
        setEditingSlug(auto);
      }
    }

    // Count leads captured via QR code
    const { count } = await sb
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("company_id", user.id)
      .eq("source", "qrcode");

    setLeadCount(count ?? 0);
    setLoading(false);
  }

  async function saveSlug(newSlug: string) {
    if (!user) return;
    const sb = getSupabase();
    await sb.from("companies").update({ slug: newSlug }).eq("id", user.id);
  }

  async function handleSaveSlug() {
    if (!editingSlug.trim()) return;
    const clean = generateSlug(editingSlug);
    setSaving(true);
    await saveSlug(clean);
    setSlug(clean);
    setEditingSlug(clean);
    setIsEditing(false);
    setSavedOk(true);
    setSaving(false);
    setTimeout(() => setSavedOk(false), 2000);
  }

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrRef.current) return;
    const svg = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 400, 400);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement("a");
      a.download = `qrcode-reativa.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  useEffect(() => { loadSlug(); }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#22C55E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">QR Code de captação</h1>
        <p className="text-[#94A3B8] text-sm mt-1">
          Coloque este QR Code na recepção do seu negócio. Quando o cliente escanear, ele se cadastra automaticamente na sua base.
        </p>
      </div>

      {/* Stat */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#22C55E]/10 rounded-xl flex items-center justify-center border border-[#22C55E]/20">
          <Users className="w-6 h-6 text-[#22C55E]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{leadCount}</p>
          <p className="text-sm text-[#94A3B8]">contatos captados via QR Code</p>
        </div>
        <button onClick={loadSlug} className="ml-auto p-2 text-[#475569] hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* QR Code card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-8 flex flex-col items-center gap-6">
        {slug ? (
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG
              ref={qrRef}
              value={publicUrl}
              size={200}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="H"
            />
          </div>
        ) : (
          <div className="w-[232px] h-[232px] bg-[#0F172A] rounded-2xl flex items-center justify-center border border-[#334155]">
            <QrCode className="w-12 h-12 text-[#334155]" />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#0F172A] rounded-xl text-sm font-semibold hover:bg-[#16A34A] transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar PNG
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 border border-[#334155] text-[#94A3B8] rounded-xl text-sm hover:border-[#475569] hover:text-white transition-colors"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      </div>

      {/* Link / Slug editor */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-[#22C55E]" />
          <h2 className="text-sm font-semibold text-white">Link de cadastro</h2>
        </div>

        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3 text-sm text-[#94A3B8] break-all">
          {appUrl}/cadastro/<span className="text-[#22C55E] font-medium">{slug}</span>
        </div>

        {/* Slug editor */}
        <div>
          <p className="text-xs text-[#475569] mb-2">Personalizar link</p>
          {isEditing ? (
            <div className="flex gap-2">
              <input
                value={editingSlug}
                onChange={e => setEditingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="flex-1 bg-[#0F172A] border border-[#22C55E] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                placeholder="meu-negocio"
              />
              <button
                onClick={handleSaveSlug}
                disabled={saving}
                className="px-3 py-2 bg-[#22C55E] text-[#0F172A] rounded-xl text-sm font-semibold hover:bg-[#16A34A] transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditingSlug(slug); }}
                className="px-3 py-2 border border-[#334155] text-[#94A3B8] rounded-xl text-sm hover:border-[#475569] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 text-sm text-[#475569] hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar link
            </button>
          )}
          {savedOk && <p className="text-xs text-[#22C55E] mt-1">Link salvo com sucesso!</p>}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Como usar</h2>
        <div className="space-y-3">
          {[
            { n: "1", text: "Baixe o QR Code em PNG clicando em \"Baixar PNG\"" },
            { n: "2", text: "Imprima e coloque na recepção, balcão ou espelho do seu negócio" },
            { n: "3", text: "Ou compartilhe o link direto pelo WhatsApp ou Instagram" },
            { n: "4", text: "Cada cliente que escanear entra automaticamente na sua base de contatos" },
            { n: "5", text: "Quando ficar inativo, o Reativa envia mensagem automática para reconquistar" },
          ].map(item => (
            <div key={item.n} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-bold flex items-center justify-center shrink-0">
                {item.n}
              </span>
              <p className="text-sm text-[#94A3B8] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
