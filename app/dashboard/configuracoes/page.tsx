"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle, Phone, Shield, Copy, RefreshCw, ExternalLink } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";
import { encryptToken } from "@/lib/zapi";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 space-y-5">
      <h2 className="text-base font-semibold text-white border-b border-[#334155] pb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#94A3B8] mb-2">{label}</label>
      {children}
    </div>
  );
}

const PLAN_LIMITS: Record<string, number> = { starter: 500, pro: 3000, business: 999999 };
const PLAN_LABELS: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business" };
const PLAN_PRICES: Record<string, string> = { starter: "R$ 97/mês", pro: "R$ 197/mês", business: "R$ 497/mês" };

export default function ConfiguracoesPage() {
  const { user, refresh } = useAuth();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  // Company data
  const [company, setCompany] = useState({ name: "", email: "", segment: "" });
  const [savingCompany, setSavingCompany] = useState(false);
  const [savedCompany, setSavedCompany] = useState(false);

  // WhatsApp integration
  const [instanceId, setInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [checkingZAPI, setCheckingZAPI] = useState(false);
  const [zapiStatus, setZapiStatus] = useState<{ connected: boolean; phone?: string; qrcode?: string | null; configured?: boolean } | null>(null);
  const [savingZAPI, setSavingZAPI] = useState(false);
  const [savedZAPI, setSavedZAPI] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({ reply: true, conversion: true, weekly: false });

  const webhookURL = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/webhooks/zapi`;

  useEffect(() => {
    if (!user?.id) return;
    setCompany({ name: user.company_name ?? "", email: user.email ?? "", segment: "" });

    // Load company segment + integration
    async function load() {
      const [companyRes, intRes] = await Promise.all([
        sb.from("companies").select("segment").eq("id", user!.id).single(),
        sb.from("company_integrations").select("zapi_instance_id, zapi_status, zapi_phone").eq("company_id", user!.id).single(),
      ]);
      if (companyRes.data) setCompany(c => ({ ...c, segment: companyRes.data.segment ?? "" }));
      if (intRes.data) {
        setInstanceId(intRes.data.zapi_instance_id ?? "");
        setZapiStatus({
          connected: intRes.data.zapi_status === "connected",
          phone: intRes.data.zapi_phone ?? undefined,
          configured: !!intRes.data.zapi_instance_id,
        });
      }
    }
    load();
  }, [user?.id]);

  async function saveCompany() {
    if (!user?.id) return;
    setSavingCompany(true);
    await sb.from("companies").update({ name: company.name, segment: company.segment }).eq("id", user.id);
    await refresh();
    setSavingCompany(false);
    setSavedCompany(true);
    setTimeout(() => setSavedCompany(false), 3000);
  }

  async function saveZAPI() {
    if (!user?.id || !instanceId || !zapiToken) return;
    setSavingZAPI(true);
    try {
      const encryptedToken = encryptToken(zapiToken);
      // Upsert integration
      await sb.from("company_integrations").upsert({
        company_id: user.id,
        zapi_instance_id: instanceId,
        zapi_token: encryptedToken,
        zapi_status: "disconnected",
      }, { onConflict: "company_id" });
      setSavedZAPI(true);
      setTimeout(() => setSavedZAPI(false), 3000);
      setZapiToken(""); // Clear token from UI after saving
    } finally {
      setSavingZAPI(false);
    }
  }

  async function checkZAPIStatus() {
    if (!user?.id) return;
    setCheckingZAPI(true);
    try {
      const res = await fetch(`/api/whatsapp/status?company_id=${user.id}`);
      const data = await res.json();
      setZapiStatus(data);

      // Poll for QR code scan
      if (!data.connected && data.qrcode) {
        setTimeout(checkZAPIStatus, 30000);
      }
    } finally {
      setCheckingZAPI(false);
    }
  }

  async function startCheckout(plan: string) {
    if (!user?.id) return;
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, company_id: user.id }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  const plan = user?.plan ?? "starter";
  const used = user?.messages_used_month ?? 0;
  const limit = PLAN_LIMITS[plan] ?? 500;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Gerencie sua conta e integrações</p>
        </div>
        <button onClick={saveCompany} disabled={savingCompany}
          className="flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#16A34A] transition-colors disabled:opacity-50">
          {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : savedCompany ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedCompany ? "Salvo!" : "Salvar"}
        </button>
      </div>

      {/* Company */}
      <Section title="Dados da empresa">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome da empresa">
            <input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#22C55E] transition-colors" />
          </Field>
          <Field label="Segmento">
            <select value={company.segment} onChange={e => setCompany(c => ({ ...c, segment: e.target.value }))}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#22C55E] appearance-none transition-colors">
              <option value="">Selecione...</option>
              <option value="clinica">Clínica / Saúde</option>
              <option value="salao">Salão de Beleza</option>
              <option value="academia">Academia / Fitness</option>
              <option value="loja">Loja / Varejo</option>
              <option value="outro">Outro</option>
            </select>
          </Field>
        </div>
        <Field label="Email">
          <input value={company.email} disabled
            className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-[#475569] text-sm cursor-not-allowed" />
        </Field>
      </Section>

      {/* WhatsApp */}
      <Section title="Integração WhatsApp (Z-API)">
        {/* Status indicator */}
        <div className="flex items-center gap-3 p-4 bg-[#0F172A] rounded-xl border border-[#334155]">
          <Phone className="w-5 h-5 text-[#22C55E] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Status da conexão</p>
            {zapiStatus === null ? (
              <p className="text-xs text-[#475569]">Não verificado</p>
            ) : !zapiStatus.configured ? (
              <p className="text-xs text-[#475569]">Não configurado</p>
            ) : zapiStatus.connected ? (
              <p className="text-xs text-[#22C55E]">✓ Conectado — {zapiStatus.phone}</p>
            ) : (
              <p className="text-xs text-[#EF4444]">Desconectado — escaneie o QR code</p>
            )}
          </div>
          <button onClick={checkZAPIStatus} disabled={checkingZAPI}
            className="flex items-center gap-1.5 text-xs border border-[#334155] text-[#94A3B8] px-3 py-1.5 rounded-lg hover:border-[#22C55E] hover:text-[#22C55E] disabled:opacity-50 transition-colors">
            {checkingZAPI ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Verificar
          </button>
        </div>

        {/* QR Code */}
        {zapiStatus?.qrcode && !zapiStatus.connected && (
          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
            <img src={zapiStatus.qrcode} alt="QR Code WhatsApp" className="w-48 h-48" />
            <p className="text-sm text-[#0F172A] font-medium">Escaneie com o WhatsApp</p>
            <p className="text-xs text-[#475569] text-center">Verificando automaticamente a cada 30s...</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Instance ID">
            <input value={instanceId} onChange={e => setInstanceId(e.target.value)} placeholder="Ex: 3B123456789"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors" />
          </Field>
          <Field label="Token">
            <input value={zapiToken} onChange={e => setZapiToken(e.target.value)} type="password" placeholder="Insira o token da Z-API"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors" />
          </Field>
        </div>

        <div className="flex gap-3">
          <button onClick={saveZAPI} disabled={savingZAPI || !instanceId || !zapiToken}
            className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#0A0A0A] rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#16A34A] transition-colors">
            {savingZAPI ? <Loader2 className="w-4 h-4 animate-spin" /> : savedZAPI ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedZAPI ? "Salvo!" : "Salvar credenciais"}
          </button>
          <a href="https://z-api.io" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-[#334155] text-[#94A3B8] rounded-xl text-sm hover:border-[#475569] hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4" /> Criar conta Z-API
          </a>
        </div>

        {/* Webhook URL */}
        <div>
          <p className="text-sm font-medium text-[#94A3B8] mb-2">URL do Webhook (cadastre na Z-API)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-[#22C55E] font-mono truncate">
              {webhookURL}
            </code>
            <button onClick={() => navigator.clipboard.writeText(webhookURL)}
              className="p-2.5 border border-[#334155] text-[#475569] rounded-xl hover:border-[#22C55E] hover:text-[#22C55E] transition-colors">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Section>

      {/* Plan */}
      <Section title="Plano atual e uso">
        <div className="flex items-center justify-between p-4 bg-[#0F172A] rounded-xl border border-[#334155]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-semibold">Plano {PLAN_LABELS[plan]}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full border ${user?.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20" : "bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20"}`}>
                {user?.status === "active" ? "Ativo" : "Trial"}
              </span>
            </div>
            <p className="text-sm text-[#94A3B8]">{PLAN_PRICES[plan]}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-[#94A3B8]">Mensagens enviadas este mês</span>
              <span className="text-white">{used.toLocaleString("pt-BR")} / {plan === "business" ? "∞" : limit.toLocaleString("pt-BR")}</span>
            </div>
            <div className="w-full bg-[#334155] rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${pct > 85 ? "bg-[#EF4444]" : "bg-[#22C55E]"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {plan !== "business" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {["pro", "business"].filter(p => p !== plan).map(p => (
              <button key={p} onClick={() => startCheckout(p)}
                className="py-3 border border-[#334155] rounded-xl text-sm hover:border-[#22C55E] hover:text-[#22C55E] transition-colors text-[#94A3B8]">
                Fazer upgrade para {PLAN_LABELS[p]}
                <div className="text-xs mt-0.5 text-[#475569]">{PLAN_PRICES[p]}</div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notificações por email">
        {[
          { key: "reply" as const, label: "Quando alguém responder", desc: "Receba email quando um cliente responder sua campanha" },
          { key: "conversion" as const, label: "Quando alguém converter", desc: "Seja notificado de cada reativação confirmada" },
          { key: "weekly" as const, label: "Relatório semanal", desc: "Resumo toda segunda-feira" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-[#475569] mt-0.5">{item.desc}</p>
            </div>
            <button onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key] ? "bg-[#22C55E]" : "bg-[#334155]"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifications[item.key] ? "left-5.5" : "left-0.5"}`} style={{ left: notifications[item.key] ? "calc(100% - 1.25rem - 2px)" : "2px" }} />
            </button>
          </div>
        ))}
      </Section>

      {/* Security */}
      <Section title="Segurança">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#475569]" />
            <div>
              <p className="text-sm font-medium text-white">Senha</p>
              <p className="text-xs text-[#475569]">Altere sua senha de acesso</p>
            </div>
          </div>
          <button className="text-sm text-[#22C55E] hover:underline">Alterar senha</button>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-[#334155]">
          <div>
            <p className="text-sm font-medium text-[#EF4444]">Excluir conta</p>
            <p className="text-xs text-[#475569]">Esta ação é irreversível</p>
          </div>
          <button className="text-sm border border-[#EF4444]/30 text-[#EF4444] px-4 py-2 rounded-xl hover:bg-[#EF4444]/5 transition-colors">
            Excluir conta
          </button>
        </div>
      </Section>
    </div>
  );
}
