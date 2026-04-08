import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle, TrendingUp, Users, Zap, Star, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F8FAFC]">
      {/* Nav */}
      <nav className="border-b border-[#1E293B] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#22C55E] rounded-lg flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-[#0A0A0A] rotate-[-45deg]" />
            </div>
            <span className="text-xl font-bold text-white">Reativa</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[#94A3B8] text-sm">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#resultados" className="hover:text-white transition-colors">Resultados</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[#94A3B8] hover:text-white text-sm transition-colors">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="bg-[#22C55E] text-[#0A0A0A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#16A34A] transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-24 pb-20 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full px-4 py-2 text-sm text-[#22C55E] mb-8">
          <Zap className="w-4 h-4" />
          Powered by IA — 14 dias grátis, sem cartão
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 max-w-4xl mx-auto">
          Seus clientes antigos são seu{" "}
          <span className="text-[#22C55E]">maior ativo.</span>
          <br />Você está aproveitando?
        </h1>
        <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed">
          A Reativa usa WhatsApp e inteligência artificial para recuperar automaticamente clientes que pararam de comprar — antes que você os perca para sempre.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/cadastro"
            className="flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#16A34A] transition-all hover:scale-105"
          >
            Reativar meus clientes agora
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#como-funciona"
            className="flex items-center gap-2 border border-[#334155] text-[#94A3B8] px-8 py-4 rounded-xl font-medium text-lg hover:border-[#22C55E] hover:text-white transition-colors"
          >
            Ver como funciona
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-[#1E293B] rounded-2xl border border-[#334155]">
          {[
            { value: "20%", label: "dos inativos voltam quando contactados certo" },
            { value: "3x", label: "mais barato reativar do que captar cliente novo" },
            { value: "R$0", label: "custo de aquisição dos clientes reativados" },
            { value: "48h", label: "tempo médio para ver os primeiros retornos" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-[#22C55E] mb-1">{stat.value}</div>
              <div className="text-sm text-[#94A3B8] leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Como a Reativa funciona</h2>
          <p className="text-[#94A3B8] text-lg">Três passos simples para recuperar receita perdida</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Users className="w-8 h-8 text-[#22C55E]" />,
              step: "01",
              title: "Importe sua base",
              desc: "Suba seu CSV de clientes ou conecte seu sistema. A Reativa identifica automaticamente quem está inativo e há quanto tempo.",
            },
            {
              icon: <MessageCircle className="w-8 h-8 text-[#22C55E]" />,
              step: "02",
              title: "IA cria a mensagem perfeita",
              desc: "Nossa IA gera mensagens personalizadas para cada segmento, no tom certo. Você aprova e agenda com um clique.",
            },
            {
              icon: <TrendingUp className="w-8 h-8 text-[#22C55E]" />,
              step: "03",
              title: "Acompanhe os retornos",
              desc: "Veja em tempo real quem leu, respondeu e voltou a comprar. Dashboard completo com ROI de cada campanha.",
            },
          ].map((item, i) => (
            <div key={i} className="relative p-8 bg-[#1E293B] rounded-2xl border border-[#334155] hover:border-[#22C55E]/50 transition-colors">
              <div className="text-6xl font-black text-[#334155] absolute top-6 right-6">{item.step}</div>
              <div className="mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-[#94A3B8] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Resultados */}
      <section id="resultados" className="px-6 py-24 bg-[#0F172A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Resultados reais de clientes reais</h2>
            <p className="text-[#94A3B8] text-lg">Empresas que usam a Reativa há mais de 30 dias</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { company: "Clínica Odonto Sorri", segment: "Odontologia", metric: "R$ 18.400", label: "recuperados em 60 dias", rate: "23% de reativação", stars: 5 },
              { company: "Salão Estilo & Arte", segment: "Salão de Beleza", metric: "47 clientes", label: "reativados no primeiro mês", rate: "19% de reativação", stars: 5 },
              { company: "Academia FitLife", segment: "Academia", metric: "R$ 9.200", label: "em mensalidades recuperadas", rate: "31% de reativação", stars: 5 },
            ].map((item, i) => (
              <div key={i} className="p-6 bg-[#1E293B] rounded-2xl border border-[#334155]">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: item.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#EAB308] text-[#EAB308]" />
                  ))}
                </div>
                <div className="text-3xl font-bold text-[#22C55E] mb-1">{item.metric}</div>
                <div className="text-[#94A3B8] text-sm mb-4">{item.label}</div>
                <div className="border-t border-[#334155] pt-4">
                  <div className="font-semibold">{item.company}</div>
                  <div className="text-[#94A3B8] text-sm">{item.segment} · {item.rate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Planos simples, sem surpresa</h2>
          <p className="text-[#94A3B8] text-lg">14 dias grátis em qualquer plano. Cancele quando quiser.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Starter",
              price: "R$ 97",
              period: "/mês",
              desc: "Para pequenos negócios começarem a reativar",
              features: ["Até 500 contatos", "3 campanhas/mês", "Dashboard básico", "Suporte por email"],
              cta: "Começar grátis",
              highlight: false,
            },
            {
              name: "Pro",
              price: "R$ 197",
              period: "/mês",
              desc: "Para quem quer escalar a reativação",
              features: ["Até 3.000 contatos", "Campanhas ilimitadas", "IA para mensagens", "Dashboard completo", "Suporte prioritário"],
              cta: "Escolher Pro",
              highlight: true,
            },
            {
              name: "Business",
              price: "R$ 497",
              period: "/mês",
              desc: "Para redes e grandes operações",
              features: ["Contatos ilimitados", "Multi-unidades", "API de integração", "Gerente dedicado", "Relatórios avançados"],
              cta: "Falar com vendas",
              highlight: false,
            },
          ].map((plan, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl border ${plan.highlight ? "border-[#22C55E] bg-[#22C55E]/5 relative" : "border-[#334155] bg-[#1E293B]"}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#22C55E] text-[#0A0A0A] text-xs font-bold px-3 py-1 rounded-full">
                  MAIS POPULAR
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-[#94A3B8]">{plan.period}</span>
                </div>
                <p className="text-[#94A3B8] text-sm mt-2">{plan.desc}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href="/cadastro"
                className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.highlight ? "bg-[#22C55E] text-[#0A0A0A] hover:bg-[#16A34A]" : "border border-[#334155] hover:border-[#22C55E] hover:text-[#22C55E]"}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-[#22C55E]/10 to-[#1E293B] rounded-3xl border border-[#22C55E]/20">
          <BarChart3 className="w-12 h-12 text-[#22C55E] mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">Comece a recuperar receita hoje</h2>
          <p className="text-[#94A3B8] text-lg mb-8">14 dias grátis. Sem cartão de crédito. Setup em menos de 5 minutos.</p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#16A34A] transition-all hover:scale-105"
          >
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[#94A3B8] text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#22C55E] rounded flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-[#0A0A0A] rotate-[-45deg]" />
            </div>
            <span className="font-semibold text-white">Reativa</span>
          </div>
          <p>© 2025 Reativa. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
