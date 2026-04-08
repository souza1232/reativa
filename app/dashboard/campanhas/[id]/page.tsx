"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Pause, Play, Copy, CheckCheck, Check, MessageSquare,
  Clock, Send, Star, Trophy, AlertCircle, TrendingUp, X, DollarSign,
  RefreshCw, Loader2
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";
import { getCampaignMetrics, getCampaignMessages } from "@/lib/queries/campaign";
import type { CampaignMetrics, MessageRow } from "@/lib/queries/campaign";

type CampaignStatus = "draft" | "running" | "paused" | "finished";

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  message_template: string;
  segment_days: number;
  total_contacts: number;
  created_at: string;
}

// ─── Status icon / label helpers ─────────────────────────────────────────────

type MsgStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "replied" | "failed";

function MessageStatusIcon({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string }> = {
    queued:    { icon: <Clock className="w-4 h-4 text-[#475569]" />,        label: "Na fila" },
    sending:   { icon: <Send className="w-4 h-4 text-[#3B82F6]" />,         label: "Enviando" },
    sent:      { icon: <Check className="w-4 h-4 text-[#3B82F6]" />,        label: "Enviado" },
    delivered: { icon: <CheckCheck className="w-4 h-4 text-[#3B82F6]" />,   label: "Entregue" },
    read:      { icon: <CheckCheck className="w-4 h-4 text-[#22C55E]" />,   label: "Lido" },
    replied:   { icon: <Star className="w-4 h-4 text-[#EAB308]" />,         label: "Respondeu" },
    failed:    { icon: <AlertCircle className="w-4 h-4 text-[#EF4444]" />,  label: "Falhou" },
  };
  const entry = map[status] ?? map.queued;
  return (
    <span className="flex items-center gap-1.5 text-xs">
      {entry.icon}
      <span className="text-[#94A3B8]">{entry.label}</span>
    </span>
  );
}

// ─── FunnelBar ────────────────────────────────────────────────────────────────

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-sm">
        <span className="text-[#94A3B8]">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">{value}</span>
          <span className="text-[#475569] w-10 text-right">{pct}%</span>
        </div>
      </div>
      <div className="h-3 bg-[#0F172A] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
      <p className="text-[#94A3B8] text-xs mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[#475569] text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Conversion Modal ─────────────────────────────────────────────────────────

function ConversionModal({
  message,
  companyId,
  campaignId,
  onClose,
  onSaved,
}: {
  message: MessageRow;
  companyId: string;
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [revenue, setRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!message.contact) return;
    setSaving(true);
    setError("");
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await Promise.all([
        sb.from("conversions").insert({
          company_id: companyId,
          campaign_id: campaignId,
          contact_id: message.contact.id,
          revenue_amount: parseFloat(revenue) || 0,
          notes: notes || null,
        }),
        sb.from("contacts")
          .update({ status: "reactivated", updated_at: new Date().toISOString() })
          .eq("id", message.contact.id)
          .eq("company_id", companyId),
      ]);
      onSaved();
      onClose();
    } catch {
      setError("Erro ao registrar conversão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#22C55E]" />
            Registrar conversão
          </h2>
          <button onClick={onClose} className="text-[#475569] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {message.contact && (
          <div className="bg-[#0F172A] rounded-xl p-3 text-sm">
            <p className="text-[#94A3B8]">Contato</p>
            <p className="text-white font-medium">{message.contact.name}</p>
            <p className="text-[#475569]">{message.contact.phone}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1.5">Valor recuperado (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={revenue}
                onChange={e => setRevenue(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1.5">Observações (opcional)</label>
            <textarea
              rows={3}
              placeholder="Ex: Agendou consulta, comprou produto X..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#22C55E] transition-colors resize-none"
            />
          </div>
        </div>

        {error && <p className="text-[#EF4444] text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-[#334155] text-[#94A3B8] rounded-xl text-sm hover:border-[#475569] hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-[#22C55E] text-[#0F172A] rounded-xl text-sm font-semibold hover:bg-[#16A34A] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  draft: "Rascunho", running: "Rodando", paused: "Pausada", finished: "Finalizada",
};
const statusColors: Record<string, string> = {
  draft: "#94A3B8", running: "#22C55E", paused: "#EAB308", finished: "#3B82F6",
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [conversionMsg, setConversionMsg] = useState<MessageRow | null>(null);
  const realtimeRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const loadCampaign = useCallback(async () => {
    if (!user) return;
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await sb
      .from("campaigns")
      .select("id, name, status, message_template, segment_days, total_contacts, created_at")
      .eq("id", id)
      .eq("company_id", user.id)
      .single();
    if (error || !data) { setNotFound(true); return; }
    setCampaign(data as Campaign);
  }, [id, user]);

  const loadMetrics = useCallback(async () => {
    if (!user) return;
    const m = await getCampaignMetrics(id, user.id);
    setMetrics(m);
  }, [id, user]);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    const { data, total: t } = await getCampaignMessages(id, { status: statusFilter }, page);
    setMessages(data);
    setTotal(t);
  }, [id, user, statusFilter, page]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadCampaign(), loadMetrics(), loadMessages()]).finally(() => setLoading(false));
  }, [user, loadCampaign, loadMetrics, loadMessages]);

  // Realtime subscription on messages
  useEffect(() => {
    if (!user) return;
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = sb
      .channel(`campaign_${id}_messages`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `campaign_id=eq.${id}` },
        () => {
          setLiveIndicator(true);
          loadMetrics();
          loadMessages();
        }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => { sb.removeChannel(channel); };
  }, [id, user, loadMetrics, loadMessages]);

  // Campaign action (start / pause / resume)
  async function handleAction(action: "start" | "pause" | "resume") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        await loadCampaign();
        await loadMetrics();
      }
    } finally {
      setActionLoading(false);
    }
  }

  // Duplicate campaign (create copy as draft)
  async function handleDuplicate() {
    if (!campaign || !user) return;
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await sb.from("campaigns").insert({
      company_id: user.id,
      name: `${campaign.name} (cópia)`,
      status: "draft",
      message_template: campaign.message_template,
      segment_days: campaign.segment_days,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#22C55E] animate-spin" />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className="text-center py-20">
        <p className="text-[#94A3B8]">Campanha não encontrada</p>
        <Link href="/dashboard/campanhas" className="text-[#22C55E] hover:underline mt-2 inline-block">← Voltar</Link>
      </div>
    );
  }

  const m = metrics ?? { queued: 0, sending: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, conversions: 0, revenue: 0 };
  const totalSent = m.sent + m.delivered + m.read + m.replied;
  const deliveryRate = totalSent > 0 ? Math.round(((m.delivered + m.read + m.replied) / totalSent) * 100) : 0;
  const readRate    = (m.delivered + m.read + m.replied) > 0 ? Math.round(((m.read + m.replied) / (m.delivered + m.read + m.replied)) * 100) : 0;
  const replyRate   = (m.read + m.replied) > 0 ? Math.round((m.replied / (m.read + m.replied)) * 100) : 0;
  const convRate    = totalSent > 0 ? Math.round((m.conversions / totalSent) * 100) : 0;
  const grandTotal  = m.queued + m.sending + totalSent + m.failed;

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {conversionMsg && user && (
        <ConversionModal
          message={conversionMsg}
          companyId={user.id}
          campaignId={id}
          onClose={() => setConversionMsg(null)}
          onSaved={() => { loadMetrics(); loadMessages(); }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard/campanhas" className="flex items-center gap-2 text-sm text-[#475569] hover:text-[#94A3B8] mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar às campanhas
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                style={{ color: statusColors[campaign.status], borderColor: `${statusColors[campaign.status]}30`, background: `${statusColors[campaign.status]}10` }}
              >
                {campaign.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />}
                {statusLabels[campaign.status]}
              </span>
              {liveIndicator && (
                <span className="inline-flex items-center gap-1 text-xs text-[#22C55E]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  ao vivo
                </span>
              )}
              <span className="text-xs text-[#475569]">
                Criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {campaign.status === "draft" && (
              <button
                onClick={() => handleAction("start")}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-[#22C55E]/30 bg-[#22C55E]/5 text-[#22C55E] rounded-xl text-sm hover:bg-[#22C55E]/10 transition-colors disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Iniciar
              </button>
            )}
            {campaign.status === "running" && (
              <button
                onClick={() => handleAction("pause")}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-[#EAB308]/30 bg-[#EAB308]/5 text-[#EAB308] rounded-xl text-sm hover:bg-[#EAB308]/10 transition-colors disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Pausar
              </button>
            )}
            {campaign.status === "paused" && (
              <button
                onClick={() => handleAction("resume")}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-[#22C55E]/30 bg-[#22C55E]/5 text-[#22C55E] rounded-xl text-sm hover:bg-[#22C55E]/10 transition-colors disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Retomar
              </button>
            )}
            <button
              onClick={handleDuplicate}
              className="flex items-center gap-2 px-4 py-2 border border-[#334155] text-[#94A3B8] rounded-xl text-sm hover:border-[#475569] hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" /> Duplicar
            </button>
            <button
              onClick={() => { loadMetrics(); loadMessages(); }}
              className="p-2 border border-[#334155] text-[#94A3B8] rounded-xl hover:border-[#475569] hover:text-white transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Enviadas" value={totalSent} color="#F8FAFC" />
          <StatCard label="Entregues" value={m.delivered + m.read + m.replied} sub={`${deliveryRate}% de entrega`} color="#3B82F6" />
          <StatCard label="Lidas" value={m.read + m.replied} sub={`${readRate}% de leitura`} color="#8B5CF6" />
          <StatCard label="Respostas" value={m.replied} sub={`${replyRate}% de resposta`} color="#EAB308" />
          <StatCard
            label="Convertidos"
            value={m.conversions}
            sub={m.revenue > 0 ? `R$ ${m.revenue.toLocaleString("pt-BR")} gerados` : `${convRate}% de conversão`}
            color="#22C55E"
          />
        </div>

        {/* Funnel */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-[#22C55E]" />
            <h2 className="text-base font-semibold text-white">Funil da campanha</h2>
            {m.queued > 0 && (
              <span className="ml-auto text-xs text-[#475569]">{m.queued} na fila · {m.sending} enviando</span>
            )}
          </div>
          <div className="space-y-5">
            <FunnelBar label="Total" value={grandTotal} total={grandTotal} color="#475569" />
            <FunnelBar label="Enviadas" value={totalSent} total={grandTotal} color="#3B82F6" />
            <FunnelBar label="Entregues" value={m.delivered + m.read + m.replied} total={grandTotal} color="#8B5CF6" />
            <FunnelBar label="Lidas" value={m.read + m.replied} total={grandTotal} color="#EAB308" />
            <FunnelBar label="Respondidas" value={m.replied} total={grandTotal} color="#F97316" />
            <FunnelBar label="Convertidas" value={m.conversions} total={grandTotal} color="#22C55E" />
          </div>
          {m.revenue > 0 && (
            <div className="mt-6 p-4 bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#22C55E]">R$ {m.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div className="text-sm text-[#94A3B8] mt-1">Receita total recuperada</div>
            </div>
          )}
        </div>

        {/* Message template */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">Mensagem da campanha</h2>
          <p className="text-[#F8FAFC] leading-relaxed bg-[#0F172A] rounded-xl p-4 border border-[#334155] font-mono text-sm whitespace-pre-wrap">
            {campaign.message_template}
          </p>
        </div>

        {/* Contacts / Messages table */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#334155] flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-base font-semibold text-white">Mensagens</h2>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-1.5 text-sm text-[#94A3B8] focus:outline-none focus:border-[#22C55E]"
              >
                <option value="all">Todos</option>
                <option value="queued">Na fila</option>
                <option value="sent">Enviados</option>
                <option value="delivered">Entregues</option>
                <option value="read">Lidos</option>
                <option value="replied">Responderam</option>
                <option value="failed">Falhou</option>
              </select>
              <span className="text-sm text-[#94A3B8]">{total} mensagens</span>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="w-10 h-10 text-[#334155] mx-auto mb-3" />
              <p className="text-[#475569] text-sm">Nenhuma mensagem encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#334155]">
                    {["Contato", "Telefone", "Status", "Enviado em", "Respondeu?", "Ações"].map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wider first:pl-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg, i) => {
                    const contact = msg.contact;
                    const initials = contact ? contact.name.split(" ").map(n => n[0]).slice(0, 2).join("") : "?";
                    return (
                      <tr key={msg.id} className={`border-b border-[#334155]/50 hover:bg-[#334155]/20 transition-colors ${i % 2 === 1 ? "bg-[#0F172A]/20" : ""}`}>
                        <td className="pl-5 pr-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-[#334155] rounded-full flex items-center justify-center text-xs font-bold text-[#94A3B8] shrink-0">
                              {initials}
                            </div>
                            <span className="text-sm text-white">{contact?.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{contact?.phone ?? msg.phone}</td>
                        <td className="px-4 py-3">
                          <MessageStatusIcon status={msg.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#475569]">
                          {msg.sent_at ? new Date(msg.sent_at).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {msg.replied_at ? (
                            <span className="text-xs text-[#EAB308] flex items-center gap-1">
                              <Star className="w-3 h-3" /> Sim
                            </span>
                          ) : (
                            <span className="text-xs text-[#475569]">Não</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {(msg.status === "replied" || msg.status === "read") && (
                            <button
                              onClick={() => setConversionMsg(msg)}
                              className="text-xs text-[#22C55E] hover:text-[#16A34A] flex items-center gap-1 transition-colors"
                            >
                              <Trophy className="w-3 h-3" /> Conversão
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-[#334155] flex items-center justify-between text-sm">
              <span className="text-[#475569]">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-[#334155] rounded-lg text-[#94A3B8] disabled:opacity-40 hover:border-[#475569] hover:text-white transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-[#334155] rounded-lg text-[#94A3B8] disabled:opacity-40 hover:border-[#475569] hover:text-white transition-colors"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
