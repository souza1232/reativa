"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, UserX, Megaphone, TrendingUp, ArrowRight, ArrowUpRight, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";
import {
  getDashboardMetrics, getReactivationsByMonth, getRevenueByMonth,
  getInactivityDistribution, getRecentCampaigns, getTopInactiveContacts,
  type DashboardMetrics, type MonthlyPoint, type RevenuePoint,
  type InactivityDistribution, type CampaignRow, type TopInactiveContact,
} from "@/lib/queries/dashboard";

// ── sub-components (unchanged visual) ─────────────────────────

function MetricCard({ title, value, subtitle, icon: Icon, trend, color = "green" }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; trend?: string; color?: "green" | "red" | "yellow" | "blue";
}) {
  const colors = {
    green: "text-[#22C55E] bg-[#22C55E]/10",
    red: "text-[#EF4444] bg-[#EF4444]/10",
    yellow: "text-[#EAB308] bg-[#EAB308]/10",
    blue: "text-[#3B82F6] bg-[#3B82F6]/10",
  };
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 flex items-start gap-4 hover:border-[#475569] transition-colors">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#94A3B8] text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-[#475569] mt-1">{subtitle}</p>}
        {trend && <p className="text-xs text-[#22C55E] mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />{trend}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-[#475569]/20 text-[#94A3B8]", running: "bg-[#22C55E]/10 text-[#22C55E]",
    paused: "bg-[#EAB308]/10 text-[#EAB308]", finished: "bg-[#3B82F6]/10 text-[#3B82F6]",
    scheduled: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  };
  const labels: Record<string, string> = {
    draft: "Rascunho", running: "Rodando", paused: "Pausada", finished: "Finalizada", scheduled: "Agendada",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] ?? styles.draft}`}>
      {status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot" />}
      {labels[status] ?? status}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#334155] rounded-lg ${className}`} />;
}

// ── main page ─────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [distribution, setDistribution] = useState<InactivityDistribution[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [topInactive, setTopInactive] = useState<TopInactiveContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeDot, setRealtimeDot] = useState(false);

  const load = useCallback(async (company_id: string) => {
    try {
      const [m, mo, rev, dist, camps, top] = await Promise.all([
        getDashboardMetrics(company_id),
        getReactivationsByMonth(company_id),
        getRevenueByMonth(company_id),
        getInactivityDistribution(company_id),
        getRecentCampaigns(company_id),
        getTopInactiveContacts(company_id),
      ]);
      setMetrics(m);
      setMonthly(mo);
      setRevenue(rev);
      setDistribution(dist);
      setCampaigns(camps);
      setTopInactive(top);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    load(user.id);

    // Realtime: refresh campaigns on any message change
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = sb.channel(`dashboard:${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `company_id=eq.${user.id}`,
      }, () => {
        setRealtimeDot(true);
        setTimeout(() => setRealtimeDot(false), 2000);
        getRecentCampaigns(user.id).then(setCampaigns);
        getDashboardMetrics(user.id).then(setMetrics);
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [user?.id, load]);

  const totalRevenue = revenue.reduce((a, b) => a + b.receita, 0);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-56" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            {realtimeDot && (
              <span className="flex items-center gap-1 text-xs text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot" /> ao vivo
              </span>
            )}
          </div>
          <p className="text-[#94A3B8] text-sm mt-1">{user?.company_name} — visão geral do mês</p>
        </div>
        <Link
          href="/dashboard/campanhas"
          className="flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#16A34A] transition-colors"
        >
          <Megaphone className="w-4 h-4" />
          Nova campanha
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Total de contatos" value={(metrics?.total_contacts ?? 0).toLocaleString("pt-BR")} subtitle="na sua base" icon={Users} color="blue" />
        <MetricCard title="Contatos inativos" value={(metrics?.inactive_contacts ?? 0).toLocaleString("pt-BR")} subtitle="sem comprar há 30+ dias" icon={UserX} color="red" />
        <MetricCard title="Campanhas ativas" value={String(metrics?.active_campaigns ?? 0)} subtitle="enviando agora" icon={Megaphone} color="yellow" />
        <MetricCard title="Taxa de reativação" value={`${metrics?.reactivation_rate ?? 0}%`} subtitle="retornaram este mês" icon={TrendingUp} color="green" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">Reativações nos últimos 6 meses</h2>
          <p className="text-sm text-[#94A3B8] mb-6">Clientes recuperados por mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "8px", color: "#F8FAFC" }} formatter={(v) => [v, "reativações"]} />
              <Bar dataKey="total" fill="#22C55E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">Distribuição de inatividade</h2>
          <p className="text-sm text-[#94A3B8] mb-4">Status da sua base</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "8px", color: "#F8FAFC" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {distribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-[#94A3B8]">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-white">Receita recuperada por mês</h2>
            <p className="text-sm text-[#94A3B8] mt-0.5">Valor em R$ via campanhas de reativação</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#22C55E]">R$ {totalRevenue.toLocaleString("pt-BR")}</div>
            <div className="text-xs text-[#94A3B8]">acumulado 6 meses</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "8px", color: "#F8FAFC" }} formatter={(v) => [`R$ ${Number(v).toLocaleString("pt-BR")}`, "receita"]} />
            <Line type="monotone" dataKey="receita" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: "#22C55E", r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Campaigns table */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Últimas campanhas</h2>
            <Link href="/dashboard/campanhas" className="text-sm text-[#22C55E] hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#475569] text-sm">Nenhuma campanha ainda.</p>
              <Link href="/dashboard/campanhas" className="text-[#22C55E] text-sm hover:underline mt-1 inline-block">Criar primeira campanha →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => (
                <Link key={c.id} href={`/dashboard/campanhas/${c.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#334155]/50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-[#22C55E] transition-colors">{c.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-[#475569]">{c.sent} enviadas</span>
                      <span className="text-xs text-[#475569]">{c.replied} respostas</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-[#22C55E]">
                      {c.revenue > 0 ? `R$ ${c.revenue.toLocaleString("pt-BR")}` : "—"}
                    </div>
                    <div className="text-xs text-[#475569]">recuperado</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* High-value inactive contacts */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Contatos que precisam de atenção</h2>
            <span className="text-xs text-[#EF4444] bg-[#EF4444]/10 px-2 py-1 rounded-full">Alto valor · inativos</span>
          </div>
          {topInactive.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#475569] text-sm">Nenhum contato inativo de alto valor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topInactive.map(c => {
                const initials = c.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("");
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#334155]/50 transition-colors">
                    <div className="w-9 h-9 bg-[#334155] rounded-full flex items-center justify-center text-sm font-bold text-[#94A3B8] shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-[#EF4444]">Inativo há {c.days_inactive} dias</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-white">R$ {c.total_spent.toLocaleString("pt-BR")}</div>
                      <button className="text-xs text-[#22C55E] hover:underline mt-0.5">Contactar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/dashboard/contatos?status=inactive"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 border border-[#334155] rounded-xl text-sm text-[#94A3B8] hover:border-[#22C55E] hover:text-[#22C55E] transition-colors">
            <Eye className="w-4 h-4" />
            Ver todos os inativos
          </Link>
        </div>
      </div>
    </div>
  );
}
