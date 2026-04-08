"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Users, DollarSign, Percent, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";
import {
  getReactivationsByMonth,
  getRevenueByMonth,
} from "@/lib/queries/dashboard";

interface CampaignStat {
  id: string;
  name: string;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  revenue: number;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function RelatoriosPage() {
  const { user } = useAuth();

  const [monthly, setMonthly] = useState<{ month: string; total: number }[]>([]);
  const [revenue, setRevenue] = useState<{ month: string; receita: number }[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [reactivatedCount, setReactivatedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    const sb = getSupabase();

    const [monthlyData, revenueData, campaignRows, contactCounts] = await Promise.all([
      getReactivationsByMonth(user.id),
      getRevenueByMonth(user.id),
      sb
        .from("campaigns")
        .select("id, name")
        .eq("company_id", user.id)
        .in("status", ["running", "paused", "finished"])
        .order("created_at", { ascending: false })
        .limit(10),
      sb
        .from("contacts")
        .select("status")
        .eq("company_id", user.id),
    ]);

    setMonthly(monthlyData);
    setRevenue(revenueData);

    // Count contacts
    const allContacts = contactCounts.data ?? [];
    setTotalContacts(allContacts.length);
    setReactivatedCount(allContacts.filter((c) => c.status === "reactivated").length);

    // For each campaign, get message counts and conversion revenue
    const stats: CampaignStat[] = [];
    for (const camp of campaignRows.data ?? []) {
      const [msgsRes, convsRes] = await Promise.all([
        sb.from("messages").select("status").eq("campaign_id", camp.id).eq("company_id", user.id),
        sb.from("conversions").select("revenue_amount").eq("campaign_id", camp.id).eq("company_id", user.id),
      ]);
      const msgs = msgsRes.data ?? [];
      const count = (s: string) => msgs.filter((m) => m.status === s).length;
      const totalSent = count("sent") + count("delivered") + count("read") + count("replied");
      stats.push({
        id: camp.id,
        name: camp.name,
        sent: totalSent,
        delivered: count("delivered") + count("read") + count("replied"),
        read: count("read") + count("replied"),
        replied: count("replied"),
        revenue: (convsRes.data ?? []).reduce((a, b) => a + Number(b.revenue_amount), 0),
      });
    }
    setCampaigns(stats);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [user]);

  const combined = monthly.map((m, i) => ({
    month: m.month,
    reativacoes: m.total,
    receita: revenue[i]?.receita ?? 0,
  }));

  const totalRevenue = revenue.reduce((a, b) => a + b.receita, 0);
  const totalReactivations = monthly.reduce((a, b) => a + b.total, 0);
  const avgPerContact = totalReactivations > 0 ? Math.round(totalRevenue / totalReactivations) : 0;
  const reactivationRate = totalContacts > 0 ? Math.round((reactivatedCount / totalContacts) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Análise de desempenho dos últimos 6 meses</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 border border-[#334155] text-[#94A3B8] rounded-xl hover:border-[#475569] hover:text-white transition-colors disabled:opacity-40"
          title="Atualizar"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#22C55E] animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Receita total recuperada", value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "#22C55E" },
              { label: "Clientes reativados", value: totalReactivations, icon: Users, color: "#3B82F6" },
              { label: "Ticket médio", value: `R$ ${avgPerContact.toLocaleString("pt-BR")}`, icon: TrendingUp, color: "#8B5CF6" },
              { label: "Taxa de reativação", value: `${reactivationRate}%`, icon: Percent, color: "#EAB308" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <span className="text-xs text-[#94A3B8]">{item.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                </div>
              );
            })}
          </div>

          {/* Combined chart */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-6">Reativações e Receita por mês</h2>
            {combined.length === 0 ? (
              <div className="py-12 text-center text-[#475569] text-sm">Nenhum dado disponível ainda</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={combined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "8px", color: "#F8FAFC" }} />
                  <Legend formatter={(v: string) => v === "reativacoes" ? "Reativações" : "Receita (R$)"} wrapperStyle={{ color: "#94A3B8", fontSize: "12px" }} />
                  <Bar yAxisId="left" dataKey="reativacoes" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar yAxisId="right" dataKey="receita" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Campaign performance */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#334155]">
              <h2 className="text-base font-semibold text-white">Desempenho por campanha</h2>
            </div>
            {campaigns.length === 0 ? (
              <div className="py-12 text-center text-[#475569] text-sm">Nenhuma campanha ativa ainda</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#334155]">
                      {["Campanha", "Enviadas", "Taxa entrega", "Taxa leitura", "Taxa resposta", "Receita"].map((h, i) => (
                        <th key={i} className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wider first:pl-5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => {
                      const dr = c.sent > 0 ? Math.round((c.delivered / c.sent) * 100) : 0;
                      const rr = c.delivered > 0 ? Math.round((c.read / c.delivered) * 100) : 0;
                      const resp = c.read > 0 ? Math.round((c.replied / c.read) * 100) : 0;
                      return (
                        <tr key={c.id} className={`border-b border-[#334155]/50 hover:bg-[#334155]/20 transition-colors ${i % 2 === 1 ? "bg-[#0F172A]/20" : ""}`}>
                          <td className="pl-5 pr-4 py-3 text-sm font-medium text-white">{c.name}</td>
                          <td className="px-4 py-3 text-sm text-[#94A3B8]">{c.sent}</td>
                          <td className="px-4 py-3 text-sm text-[#3B82F6]">{dr}%</td>
                          <td className="px-4 py-3 text-sm text-[#8B5CF6]">{rr}%</td>
                          <td className="px-4 py-3 text-sm text-[#EAB308]">{resp}%</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#22C55E]">
                            {c.revenue > 0 ? `R$ ${c.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
