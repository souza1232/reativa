"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  Plus, X, ChevronRight, ChevronLeft, Users, Zap, Loader2,
  Send, Copy, CheckCircle, Calendar, Megaphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// ── Types ──────────────────────────────────────────────────────
type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "finished";

interface Campaign {
  id: string;
  name: string;
  segment_days: number;
  message_template: string;
  status: CampaignStatus;
  total_contacts: number;
  created_at: string;
  sent: number;
  delivered: number;
  replied: number;
  revenue: number;
}

// ── Helpers ────────────────────────────────────────────────────
const SEGMENT_OPTIONS = [
  { days: 30, label: "Inativos há 30+ dias" },
  { days: 60, label: "Inativos há 60+ dias" },
  { days: 90, label: "Inativos há 90+ dias" },
  { days: 180, label: "Inativos há 180+ dias" },
];

const TONE_OPTIONS = [
  { value: "amigavel", label: "😊 Amigável" },
  { value: "profissional", label: "💼 Profissional" },
  { value: "urgente", label: "⚡ Urgente" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-[#475569]/20 text-[#94A3B8]",
    scheduled: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    running: "bg-[#22C55E]/10 text-[#22C55E]",
    paused: "bg-[#EAB308]/10 text-[#EAB308]",
    finished: "bg-[#3B82F6]/10 text-[#3B82F6]",
  };
  const labels: Record<string, string> = {
    draft: "Rascunho", scheduled: "Agendada", running: "Rodando", paused: "Pausada", finished: "Finalizada",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${map[status] ?? map.draft}`}>
      {status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot" />}
      {labels[status] ?? status}
    </span>
  );
}

// ── Wizard ─────────────────────────────────────────────────────
function CampaignWizard({
  companyId, companyName, segment, onClose, onCreated,
}: {
  companyId: string; companyName: string; segment: string;
  onClose: () => void; onCreated: () => void;
}) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", segmentDays: 0, message: "", tone: "amigavel",
    schedule: "now", scheduledDate: "",
  });
  const [charCount, setCharCount] = useState(0);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load eligible contact count when segment changes
  useEffect(() => {
    if (!form.segmentDays) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - form.segmentDays);
    sb.from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "inactive")
      .lte("last_interaction_date", cutoff.toISOString().split("T")[0])
      .then(({ count }) => setEligibleCount(count ?? 0));
  }, [form.segmentDays, companyId]);

  async function generateAI() {
    setLoadingAI(true);
    setAiSuggestions([]);
    try {
      const res = await fetch("/api/ai/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment, days_inactive: form.segmentDays,
          business_name: companyName, tone: form.tone,
        }),
      });
      const data = await res.json();
      setAiSuggestions(data.messages ?? []);
    } catch {
      setAiSuggestions([]);
    } finally {
      setLoadingAI(false);
    }
  }

  function selectSuggestion(text: string) {
    setForm(f => ({ ...f, message: text }));
    setCharCount(text.length);
    setAiSuggestions([]);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { error: err } = await sb.from("campaigns").insert({
        company_id: companyId,
        name: form.name,
        segment_days: form.segmentDays,
        message_template: form.message,
        status: form.schedule === "now" ? "draft" : "scheduled",
        scheduled_at: form.schedule === "later" && form.scheduledDate ? form.scheduledDate : null,
      });
      if (err) throw err;
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  }

  const canNext = step === 1 ? !!(form.name && form.segmentDays) : step === 3 ? !!form.message : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#1E293B] border border-[#334155] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1E293B] border-b border-[#334155] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Nova campanha</h2>
            <p className="text-sm text-[#94A3B8]">Passo {step} de 4</p>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {["Segmento", "Contatos", "Mensagem", "Envio"].map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step === i + 1 ? "bg-[#22C55E] text-[#0A0A0A]" : step > i + 1 ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-[#334155] text-[#475569]"}`}>
                  {step > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs ${step === i + 1 ? "text-white" : "text-[#475569]"}`}>{label}</span>
                {i < 3 && <div className={`flex-1 h-px ${step > i + 1 ? "bg-[#22C55E]/30" : "bg-[#334155]"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {/* Step 1 — Segment */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">Nome da campanha</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Reativação de Inverno 2025"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-3">Quem vai receber?</label>
                <div className="grid grid-cols-2 gap-3">
                  {SEGMENT_OPTIONS.map(seg => (
                    <button key={seg.days} onClick={() => { setForm(f => ({ ...f, segmentDays: seg.days })); setEligibleCount(null); }}
                      className={`p-4 rounded-xl border text-left transition-all ${form.segmentDays === seg.days ? "border-[#22C55E] bg-[#22C55E]/5 text-white" : "border-[#334155] text-[#94A3B8] hover:border-[#475569]"}`}>
                      <div className="text-sm font-medium">{seg.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Contact preview */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-5 bg-[#0F172A] rounded-xl border border-[#334155]">
                <div className="w-12 h-12 bg-[#22C55E]/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#22C55E]" />
                </div>
                <div>
                  {eligibleCount === null
                    ? <div className="flex items-center gap-2 text-[#94A3B8]"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
                    : <><div className="text-2xl font-bold text-white">{eligibleCount}</div><div className="text-sm text-[#94A3B8]">contatos serão atingidos</div></>
                  }
                </div>
              </div>
              {eligibleCount === 0 && (
                <div className="p-4 bg-[#EAB308]/5 border border-[#EAB308]/20 rounded-xl text-sm text-[#EAB308]">
                  Nenhum contato inativo encontrado para este período. Importe contatos ou selecione outro segmento.
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Message */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#94A3B8]">Mensagem</label>
                  <span className={`text-xs ${charCount > 160 ? "text-[#EF4444]" : "text-[#475569]"}`}>{charCount}/160</span>
                </div>
                <textarea value={form.message}
                  onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setCharCount(e.target.value.length); }}
                  placeholder="Use {{nome}} para o nome do cliente..."
                  rows={5}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors resize-none font-mono text-sm" />
                <div className="flex gap-2 mt-2">
                  {["{{nome}}", "{{dias_inativo}}"].map(v => (
                    <button key={v} onClick={() => { const m = form.message + v; setForm(f => ({ ...f, message: m })); setCharCount(m.length); }}
                      className="text-xs bg-[#334155] text-[#94A3B8] px-2 py-1 rounded hover:bg-[#475569] transition-colors">{v}</button>
                  ))}
                </div>
                {/* Preview */}
                {form.message && (
                  <div className="mt-3 p-3 bg-[#0F172A] border border-[#334155] rounded-xl">
                    <p className="text-xs text-[#475569] mb-1">Preview:</p>
                    <p className="text-sm text-[#94A3B8]">
                      {form.message.replace(/\{\{nome\}\}/gi, "João").replace(/\{\{dias_inativo\}\}/gi, String(form.segmentDays))}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">Tom da mensagem</label>
                <div className="flex gap-2">
                  {TONE_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, tone: t.value }))}
                      className={`flex-1 py-2 rounded-xl text-sm border transition-all ${form.tone === t.value ? "bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E]" : "border-[#334155] text-[#94A3B8] hover:border-[#475569]"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={generateAI} disabled={loadingAI}
                className="w-full flex items-center justify-center gap-2 py-3 border border-[#22C55E]/30 bg-[#22C55E]/5 text-[#22C55E] rounded-xl text-sm font-medium hover:bg-[#22C55E]/10 transition-colors disabled:opacity-50">
                {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loadingAI ? "Gerando com IA..." : "Gerar mensagem com IA"}
              </button>

              {aiSuggestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide">3 sugestões da IA — clique para usar</p>
                  {aiSuggestions.map((s, i) => (
                    <button key={i} onClick={() => selectSuggestion(s)}
                      className="w-full text-left p-4 bg-[#0F172A] border border-[#334155] rounded-xl hover:border-[#22C55E]/50 transition-colors group">
                      <p className="text-sm text-[#94A3B8] leading-relaxed group-hover:text-white transition-colors">{s}</p>
                      <p className="text-xs text-[#22C55E] mt-2">Usar esta →</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Schedule */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "now", icon: <Send className="w-5 h-5 mb-2" />, title: "Salvar como rascunho", desc: "Disparar manualmente depois" },
                  { value: "later", icon: <Calendar className="w-5 h-5 mb-2" />, title: "Agendar", desc: "Escolha data e hora" },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setForm(f => ({ ...f, schedule: opt.value }))}
                    className={`p-4 rounded-xl border text-left transition-all ${form.schedule === opt.value ? "border-[#22C55E] bg-[#22C55E]/5" : "border-[#334155] hover:border-[#475569]"}`}>
                    <div className={form.schedule === opt.value ? "text-[#22C55E]" : "text-[#475569]"}>{opt.icon}</div>
                    <div className="text-sm font-medium text-white">{opt.title}</div>
                    <div className="text-xs text-[#94A3B8] mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {form.schedule === "later" && (
                <input type="datetime-local" value={form.scheduledDate}
                  onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22C55E] transition-colors" />
              )}

              <div className="p-5 bg-[#0F172A] rounded-xl border border-[#334155] space-y-2 text-sm">
                <p className="font-semibold text-white mb-3">Resumo</p>
                <div className="flex justify-between"><span className="text-[#94A3B8]">Nome</span><span className="text-white">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-[#94A3B8]">Segmento</span><span className="text-white">{SEGMENT_OPTIONS.find(s => s.days === form.segmentDays)?.label}</span></div>
                <div className="flex justify-between"><span className="text-[#94A3B8]">Destinatários</span><span className="text-[#22C55E] font-bold">{eligibleCount ?? "..."} contatos</span></div>
              </div>

              {error && <p className="text-sm text-[#EF4444]">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1E293B] border-t border-[#334155] p-6 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#94A3B8] border border-[#334155] rounded-xl hover:border-[#475569] hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancelar" : "Anterior"}
          </button>
          <button
            onClick={() => step < 4 ? setStep(s => s + 1) : save()}
            disabled={!canNext || saving}
            className="flex items-center gap-2 px-6 py-2 bg-[#22C55E] text-[#0A0A0A] text-sm font-semibold rounded-xl hover:bg-[#16A34A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {step === 4 ? "Salvar campanha" : "Próximo"}
            {step < 4 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function CampanhasPage() {
  const { user } = useAuth();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await sb.from("campaigns").select("*")
        .eq("company_id", user.id).order("created_at", { ascending: false });

      const enriched: Campaign[] = await Promise.all((data ?? []).map(async c => {
        const [msgsRes, convsRes] = await Promise.all([
          sb.from("messages").select("status").eq("campaign_id", c.id),
          sb.from("conversions").select("revenue_amount").eq("campaign_id", c.id),
        ]);
        const msgs = msgsRes.data ?? [];
        return {
          ...c,
          sent: msgs.filter(m => ["sent","delivered","read","replied"].includes(m.status)).length,
          delivered: msgs.filter(m => ["delivered","read","replied"].includes(m.status)).length,
          replied: msgs.filter(m => m.status === "replied").length,
          revenue: (convsRes.data ?? []).reduce((a, b) => a + Number(b.revenue_amount), 0),
        };
      }));

      setCampaigns(enriched);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{campaigns.length} campanhas criadas</p>
        </div>
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#16A34A] transition-colors">
          <Plus className="w-4 h-4" /> Nova campanha
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#22C55E]" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 bg-[#1E293B] border border-[#334155] rounded-xl">
          <Megaphone className="w-10 h-10 text-[#334155] mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Nenhuma campanha ainda</p>
          <p className="text-[#475569] text-sm mb-6">Crie sua primeira campanha e comece a reativar clientes</p>
          <button onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-6 py-3 rounded-xl font-semibold hover:bg-[#16A34A] transition-colors">
            <Plus className="w-4 h-4" /> Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 hover:border-[#475569] transition-colors">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-[#475569]">
                      {SEGMENT_OPTIONS.find(s => s.days === c.segment_days)?.label ?? `${c.segment_days} dias`}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-white">{c.name}</h2>
                  <p className="text-sm text-[#475569] mt-1 truncate">"{c.message_template.slice(0, 80)}..."</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="p-2 text-[#475569] hover:text-white border border-[#334155] rounded-lg hover:border-[#475569] transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                  <Link href={`/dashboard/campanhas/${c.id}`}
                    className="flex items-center gap-2 px-4 py-2 border border-[#334155] text-[#94A3B8] rounded-xl text-sm hover:border-[#22C55E] hover:text-[#22C55E] transition-colors">
                    Ver detalhes <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-[#334155]">
                {[
                  { label: "Enviadas", value: c.sent, color: "text-white" },
                  { label: "Entregues", value: c.delivered, color: "text-[#3B82F6]" },
                  { label: "Contatos", value: c.total_contacts, color: "text-[#8B5CF6]" },
                  { label: "Respostas", value: c.replied, color: "text-[#EAB308]" },
                  { label: "Receita", value: c.revenue > 0 ? `R$ ${c.revenue.toLocaleString("pt-BR")}` : "—", color: "text-[#22C55E]" },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-[#475569] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showWizard && user?.id && (
        <CampaignWizard
          companyId={user.id}
          companyName={user.company_name ?? ""}
          segment={user.plan ?? "clinica"}
          onClose={() => setShowWizard(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
