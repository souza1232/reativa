"use client";

import { use, useState } from "react";
import { CheckCircle, Loader2, MessageSquare } from "lucide-react";

export default function LeadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [form, setForm] = useState({ name: "", phone: "", birthdate: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return value;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-[#22C55E]/10 rounded-full flex items-center justify-center mx-auto border border-[#22C55E]/30">
            <CheckCircle className="w-10 h-10 text-[#22C55E]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Cadastro realizado!</h2>
          <p className="text-[#94A3B8] max-w-xs mx-auto">
            Obrigado! Você receberá ofertas e novidades exclusivas pelo WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-[#22C55E]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#22C55E]/30">
            <MessageSquare className="w-8 h-8 text-[#22C55E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Fique por dentro!</h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              Cadastre-se e receba ofertas exclusivas pelo WhatsApp
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">
              Seu nome <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="João Silva"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">
              WhatsApp <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">
              Data de nascimento <span className="text-[#475569] text-xs">(opcional)</span>
            </label>
            <input
              type="date"
              value={form.birthdate}
              onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))}
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22C55E] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[#EF4444] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22C55E] text-[#0F172A] font-bold py-3.5 rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Quero receber ofertas pelo WhatsApp!"
            )}
          </button>

          <p className="text-[#475569] text-xs text-center">
            Seus dados estão seguros. Você pode cancelar a qualquer momento.
          </p>
        </form>
      </div>
    </div>
  );
}
