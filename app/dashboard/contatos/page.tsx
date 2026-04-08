"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Upload, Plus, X, Phone, Mail, Calendar, ShoppingBag, ChevronDown, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getContacts, importContacts, normalizePhone, type ContactRow, type ContactFilters } from "@/lib/queries/contacts";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-[#22C55E]/10 text-[#22C55E]",
    inactive: "bg-[#EF4444]/10 text-[#EF4444]",
    reactivated: "bg-[#3B82F6]/10 text-[#3B82F6]",
    unsubscribed: "bg-[#475569]/20 text-[#94A3B8]",
  };
  const labels: Record<string, string> = { active: "Ativo", inactive: "Inativo", reactivated: "Reativado", unsubscribed: "Descadastrado" };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] ?? styles.inactive}`}>{labels[status] ?? status}</span>;
}

function ContactModal({ contact, onClose }: { contact: ContactRow; onClose: () => void }) {
  const initials = contact.name.split(" ").map(n => n[0]).slice(0, 2).join("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[#1E293B] border-l border-[#334155] overflow-y-auto">
        <div className="sticky top-0 bg-[#1E293B] border-b border-[#334155] p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#22C55E]/20 rounded-full flex items-center justify-center text-[#22C55E] text-xl font-bold">{initials}</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{contact.name}</h2>
            <StatusBadge status={contact.status} />
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            {[
              { icon: <Phone className="w-4 h-4" />, label: "Telefone", value: contact.phone },
              { icon: <Mail className="w-4 h-4" />, label: "Email", value: contact.email ?? "—" },
              { icon: <Calendar className="w-4 h-4" />, label: "Última interação", value: contact.last_interaction_date ? new Date(contact.last_interaction_date).toLocaleDateString("pt-BR") : "—" },
              { icon: <ShoppingBag className="w-4 h-4" />, label: "Total gasto", value: `R$ ${contact.total_spent.toLocaleString("pt-BR")}` },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-[#475569]">{item.icon}</div>
                <div><p className="text-xs text-[#475569]">{item.label}</p><p className="text-sm text-white">{item.value}</p></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0F172A] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#EF4444]">{contact.days_inactive}</div>
              <div className="text-xs text-[#94A3B8] mt-1">dias inativo</div>
            </div>
            <div className="bg-[#0F172A] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#22C55E]">{contact.visit_count}</div>
              <div className="text-xs text-[#94A3B8] mt-1">visitas totais</div>
            </div>
          </div>
          <div className="space-y-3">
            <button className="w-full bg-[#22C55E] text-[#0A0A0A] py-3 rounded-xl font-semibold hover:bg-[#16A34A] transition-colors flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Enviar mensagem WhatsApp
            </button>
            <button className="w-full border border-[#334155] text-[#94A3B8] py-3 rounded-xl font-medium hover:border-[#22C55E] hover:text-[#22C55E] transition-colors">
              Adicionar a uma campanha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CSV Import Modal ───────────────────────────────────────────
function ImportModal({ companyId, onClose, onDone }: { companyId: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f, "utf-8");
  }

  // Map CSV columns to our schema
  function mapRow(row: Record<string, string>) {
    return {
      name: row.nome || row.name || row.cliente || "",
      phone: row.telefone || row.phone || row.celular || row.whatsapp || "",
      email: row.email || "",
      last_interaction_date: row.ultima_compra || row.last_purchase || row.data || row.last_interaction_date || "",
      total_spent: row.total_gasto || row.valor_total || row.total_spent || "0",
      visit_count: row.visitas || row.visit_count || "0",
    };
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setProgress(0);
    setError("");

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const mapped = rows.map(mapRow).filter(r => r.name && r.phone);

      if (mapped.length === 0) {
        setError("Nenhum contato válido encontrado. Verifique as colunas: nome, telefone.");
        return;
      }

      const res = await importContacts(companyId, mapped, (done, total) => {
        setProgress(Math.round((done / total) * 100));
      });

      setResult(res);
    } catch (e) {
      setError("Erro ao importar. Verifique o formato do arquivo.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={!importing ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-[#1E293B] border border-[#334155] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Importar contatos (CSV)</h2>
          {!importing && <button onClick={onClose} className="text-[#475569] hover:text-white"><X className="w-5 h-5" /></button>}
        </div>

        {!result ? (
          <>
            <div className="p-3 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-[#94A3B8] space-y-1">
              <p className="font-medium text-white">Colunas esperadas:</p>
              <p>nome, telefone, email (opcional), ultima_compra (opcional), total_gasto (opcional)</p>
            </div>

            <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-[#334155] rounded-xl cursor-pointer hover:border-[#22C55E]/50 transition-colors">
              <Upload className="w-8 h-8 text-[#475569]" />
              <div className="text-center">
                <p className="text-sm text-white">{file ? file.name : "Clique para selecionar o CSV"}</p>
                <p className="text-xs text-[#475569] mt-1">ou arraste o arquivo aqui</p>
              </div>
              <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            </label>

            {preview.length > 0 && (
              <div>
                <p className="text-xs text-[#94A3B8] mb-2">Preview (primeiras 5 linhas):</p>
                <div className="overflow-x-auto bg-[#0F172A] rounded-xl border border-[#334155]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#334155]">
                        {Object.keys(preview[0]).map(k => <th key={k} className="text-left px-3 py-2 text-[#475569]">{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-[#334155]/50">
                          {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-[#94A3B8] max-w-24 truncate">{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-[#EF4444] flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

            {importing && (
              <div>
                <div className="flex justify-between text-sm mb-2"><span className="text-[#94A3B8]">Importando...</span><span className="text-white">{progress}%</span></div>
                <div className="w-full bg-[#334155] rounded-full h-2"><div className="bg-[#22C55E] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} disabled={importing} className="flex-1 py-2.5 border border-[#334155] text-[#94A3B8] rounded-xl text-sm hover:border-[#475569] disabled:opacity-40 transition-colors">
                Cancelar
              </button>
              <button onClick={handleImport} disabled={!file || importing} className="flex-1 py-2.5 bg-[#22C55E] text-[#0A0A0A] rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#16A34A] transition-colors flex items-center justify-center gap-2">
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" />Importando...</> : "Importar agora"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-[#22C55E] mx-auto" />
            <h3 className="text-lg font-bold text-white">Importação concluída!</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Importados", value: result.imported, color: "#22C55E" },
                { label: "Duplicados", value: result.duplicates, color: "#EAB308" },
                { label: "Erros", value: result.errors, color: "#EF4444" },
              ].map((s, i) => (
                <div key={i} className="bg-[#0F172A] rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-[#94A3B8] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onDone(); onClose(); }} className="w-full py-3 bg-[#22C55E] text-[#0A0A0A] rounded-xl font-semibold hover:bg-[#16A34A] transition-colors">
              Ver contatos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────

const statusOptions = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "reactivated", label: "Reativados" },
  { value: "unsubscribed", label: "Descadastrados" },
];

const inactivityOptions = [
  { value: "", label: "Qualquer inatividade" },
  { value: "30", label: "30+ dias" },
  { value: "60", label: "60+ dias" },
  { value: "90", label: "90+ dias" },
];

export default function ContatosPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inactivity, setInactivity] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ContactRow | null>(null);
  const [showImport, setShowImport] = useState(false);
  const perPage = 15;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const filters: ContactFilters = {
        status: statusFilter !== "all" ? statusFilter : undefined,
        min_days: inactivity ? Number(inactivity) : undefined,
        search: search || undefined,
      };
      const { data, total: t } = await getContacts(user.id, filters, page, perPage);
      setContacts(data);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter, inactivity, search, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter, inactivity]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contatos</h1>
          <p className="text-[#94A3B8] text-sm mt-1">{total.toLocaleString("pt-BR")} contatos encontrados</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 border border-[#334155] text-[#94A3B8] px-4 py-2 rounded-xl text-sm hover:border-[#22C55E] hover:text-[#22C55E] transition-colors">
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <button className="flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#16A34A] transition-colors">
            <Plus className="w-4 h-4" /> Novo contato
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
            className="w-full bg-[#0F172A] border border-[#334155] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22C55E] appearance-none pr-8 transition-colors">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] pointer-events-none" />
        </div>
        <div className="relative">
          <select value={inactivity} onChange={e => setInactivity(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22C55E] appearance-none pr-8 transition-colors">
            {inactivityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#22C55E]" /></div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#475569]">Nenhum contato encontrado.</p>
            <button onClick={() => setShowImport(true)} className="text-[#22C55E] text-sm hover:underline mt-2 inline-block">Importar contatos →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155]">
                  {["Contato","Telefone","Último contato","Inatividade","Total gasto","Status",""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => {
                  const initials = c.name.split(" ").map(n => n[0]).slice(0, 2).join("");
                  return (
                    <tr key={c.id} onClick={() => setSelected(c)}
                      className={`border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors cursor-pointer ${i % 2 === 1 ? "bg-[#0F172A]/20" : ""}`}>
                      <td className="pl-5 pr-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#334155] rounded-full flex items-center justify-center text-xs font-bold text-[#94A3B8] shrink-0">{initials}</div>
                          <span className="text-sm font-medium text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{c.phone}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {c.last_interaction_date ? new Date(c.last_interaction_date).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${c.days_inactive >= 90 ? "text-[#EF4444]" : c.days_inactive >= 60 ? "text-[#F97316]" : c.days_inactive >= 30 ? "text-[#EAB308]" : "text-[#22C55E]"}`}>
                          {c.days_inactive} dias
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">R$ {c.total_spent.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 pr-5"><button className="text-xs text-[#22C55E] hover:underline">Ver detalhes</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > perPage && (
          <div className="px-5 py-4 border-t border-[#334155] flex items-center justify-between">
            <p className="text-sm text-[#475569]">Mostrando {(page-1)*perPage+1}–{Math.min(page*perPage, total)} de {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-[#334155] text-sm text-[#94A3B8] hover:border-[#22C55E] hover:text-[#22C55E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Anterior
              </button>
              <span className="text-sm text-[#94A3B8]">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#334155] text-sm text-[#94A3B8] hover:border-[#22C55E] hover:text-[#22C55E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <ContactModal contact={selected} onClose={() => setSelected(null)} />}
      {showImport && user?.id && (
        <ImportModal companyId={user.id} onClose={() => setShowImport(false)} onDone={load} />
      )}
    </div>
  );
}
