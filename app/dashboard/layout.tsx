"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Megaphone, BarChart3,
  Settings, ArrowRight, LogOut, Bell, ChevronRight, QrCode,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/contatos", icon: Users, label: "Contatos" },
  { href: "/dashboard/campanhas", icon: Megaphone, label: "Campanhas" },
  { href: "/dashboard/qrcode", icon: QrCode, label: "QR Code" },
  { href: "/dashboard/relatorios", icon: BarChart3, label: "Relatórios" },
  { href: "/dashboard/configuracoes", icon: Settings, label: "Configurações" },
];

const PLAN_LIMITS: Record<string, number> = { starter: 500, pro: 3000, business: 999999 };
const PLAN_LABELS: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business" };

function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const plan = user?.plan ?? "starter";
  const used = user?.messages_used_month ?? 0;
  const limit = PLAN_LIMITS[plan] ?? 500;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const initials = user?.company_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "??";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#1E293B] border-r border-[#334155] flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-[#334155]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#22C55E] rounded-xl flex items-center justify-center shrink-0">
            <ArrowRight className="w-5 h-5 text-[#0A0A0A] rotate-[-45deg]" />
          </div>
          <span className="text-xl font-bold text-white">Reativa</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
                  : "text-[#94A3B8] hover:bg-[#334155] hover:text-white"
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? "text-[#22C55E]" : "text-[#475569] group-hover:text-white"}`} />
              {item.label}
              {active && <ChevronRight className="w-4 h-4 ml-auto text-[#22C55E]" />}
            </Link>
          );
        })}
      </nav>

      {/* Plan indicator */}
      <div className="p-4 border-t border-[#334155]">
        <div className="bg-[#0F172A] rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#94A3B8]">Plano {PLAN_LABELS[plan]}</span>
            <span className={`text-xs font-medium ${user?.status === "active" ? "text-[#22C55E]" : user?.status === "trial" ? "text-[#EAB308]" : "text-[#EF4444]"}`}>
              {user?.status === "active" ? "Ativo" : user?.status === "trial" ? "Trial" : "Inativo"}
            </span>
          </div>
          <div className="w-full bg-[#334155] rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${pct > 85 ? "bg-[#EF4444]" : "bg-[#22C55E]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs text-[#475569] mt-1">
            {used.toLocaleString("pt-BR")} / {plan === "business" ? "∞" : limit.toLocaleString("pt-BR")} msgs
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#22C55E]/20 rounded-full flex items-center justify-center text-[#22C55E] font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.company_name ?? "..."}</div>
            <div className="text-xs text-[#475569] truncate">{user?.email ?? ""}</div>
          </div>
          <button onClick={signOut} className="text-[#475569] hover:text-[#EF4444] transition-colors" title="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const { user } = useAuth();
  const initials = user?.company_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "??";
  return (
    <header className="sticky top-0 z-30 bg-[#0F172A]/90 backdrop-blur border-b border-[#334155] px-8 py-4 flex items-center justify-end gap-4">
      <button className="relative text-[#475569] hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#22C55E] rounded-full" />
      </button>
      <div className="w-8 h-8 bg-[#22C55E]/20 rounded-full flex items-center justify-center text-[#22C55E] font-bold text-xs">
        {initials}
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0F172A]">
        <Sidebar />
        <div className="pl-64">
          <TopBar />
          <main className="p-8">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
