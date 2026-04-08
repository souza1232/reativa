"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

const segments = [
  { value: "clinica", label: "Clínica / Saúde" },
  { value: "salao", label: "Salão de Beleza" },
  { value: "loja", label: "Loja / Varejo" },
  { value: "academia", label: "Academia / Fitness" },
  { value: "outro", label: "Outro" },
];

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", segment: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 1. Create auth user
      const { data: authData, error: signUpError } = await sb.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("Este email já está cadastrado. Faça login.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      const userId = authData.user?.id;
      if (!userId) { setError("Erro ao criar usuário."); return; }

      // 2. Create company record (id = user_id per schema)
      const { error: companyError } = await sb.from("companies").insert({
        id: userId,
        name: form.companyName,
        email: form.email,
        segment: form.segment,
        plan: "starter",
        status: "trial",
      });

      if (companyError) {
        console.error("Company insert error:", companyError);
        // Non-blocking — user still created
      }

      // 3. Send welcome email (non-blocking)
      sendWelcomeEmail(form.email, form.companyName).catch(() => {});

      document.cookie = "reativa_session=true; path=/; max-age=86400";
      router.push("/dashboard");
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#22C55E] rounded-xl flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-[#0A0A0A] rotate-[-45deg]" />
            </div>
            <span className="text-2xl font-bold text-white">Reativa</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Crie sua conta grátis</h1>
          <p className="text-[#94A3B8]">14 dias de trial completo. Sem cartão de crédito.</p>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-4 py-3 text-[#EF4444] text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">Nome da empresa</label>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Ex: Clínica Sorri Dental"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">Segmento</label>
              <select
                name="segment"
                value={form.segment}
                onChange={handleChange}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22C55E] transition-colors appearance-none"
                required
              >
                <option value="" disabled>Selecione seu segmento</option>
                {segments.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">Senha</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors pr-12"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22C55E] text-[#0A0A0A] py-3 rounded-xl font-bold hover:bg-[#16A34A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar conta e começar"}
            </button>

            <p className="text-center text-[#475569] text-xs">
              Ao criar sua conta você concorda com nossos{" "}
              <a href="#" className="text-[#22C55E] hover:underline">Termos de Uso</a>
            </p>
          </form>

          <p className="text-center text-[#94A3B8] text-sm mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-[#22C55E] hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
