"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await sb.auth.signInWithPassword({ email, password });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Email ou senha incorretos.");
        } else {
          setError(authError.message);
        }
        return;
      }

      document.cookie = "reativa_session=true; path=/; max-age=86400";
      router.push("/dashboard");
    } catch {
      setError("Erro ao conectar. Tente novamente.");
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
          <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h1>
          <p className="text-[#94A3B8]">Entre na sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-4 py-3 text-[#EF4444] text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:outline-none focus:border-[#22C55E] transition-colors pr-12"
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

            <div className="flex justify-end">
              <a href="#" className="text-sm text-[#22C55E] hover:underline">Esqueci minha senha</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#22C55E] text-[#0A0A0A] py-3 rounded-xl font-bold hover:bg-[#16A34A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
            </button>
          </form>

          <p className="text-center text-[#94A3B8] text-sm mt-6">
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-[#22C55E] hover:underline font-medium">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
