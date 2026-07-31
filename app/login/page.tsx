"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, FileClock, LockKeyhole, Mail } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const localApi = /localhost|127\.0\.0\.1/.test(API_URL);
    setDemoMode(!localHost && localApi);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (demoMode) {
        sessionStorage.setItem("engenharia-slides-demo", "true");
        router.push("/");
        return;
      }
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#081f3c] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-48 -top-48 h-[560px] w-[560px] rounded-full border-[82px] border-accent/[0.055]" />
        <div className="absolute -bottom-36 -left-28 h-[420px] w-[420px] rounded-full bg-[#d6f06f]/8" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-[#123d32]">
            <FileClock size={22} />
          </div>
          <div>
            <p className="font-bold">Engenharia Slides</p>
            <p className="text-xs text-white/45">Controle mensal de obras</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#9ccaff]">
            Dados confiáveis. Apresentações consistentes.
          </p>
          <h1 className="text-4xl font-bold leading-[1.12] tracking-[-0.045em] xl:text-5xl">
            Menos tempo formatando. Mais tempo acompanhando a obra.
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-white/55">
            Centralize planilhas, modelos e regras de atualização em um fluxo
            seguro, revisável e com histórico completo.
          </p>
        </div>

        <p className="relative text-xs text-white/32">
          © 2026 Engenharia Slides · Ambiente privado
        </p>
      </section>

      <section className="flex items-center justify-center border-l border-accent/10 bg-[#0a294e] px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px] rounded-3xl border border-accent/15 bg-card p-6 shadow-[0_24px_70px_rgba(0,7,24,.34)] sm:p-8">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
              <FileClock size={20} />
            </div>
            <strong className="text-[#1c3b31]">Engenharia Slides</strong>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Acesso seguro
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#17382e]">
            Bem-vinda de volta
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#74827d]">
            Entre com seu e-mail corporativo para acessar as apresentações.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#385248]">
                E-mail
              </span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-accent/20 bg-surface px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-brand/25">
                <Mail size={17} className="text-[#8b9994]" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a2ada9]"
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#385248]">
                Senha
              </span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-accent/20 bg-surface px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-brand/25">
                <LockKeyhole size={17} className="text-[#8b9994]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-[#879590]"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error ? (
              <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
                {error}
              </p>
            ) : null}

            <Button className="w-full" size="lg" disabled={loading}>
              {loading
                ? "Entrando..."
                : demoMode
                  ? "Entrar na demonstração"
                  : "Entrar na plataforma"}
              {!loading ? <ArrowRight size={17} /> : null}
            </Button>
          </form>

          {!demoMode ? (
            <p className="mt-5 text-center text-sm text-[#b7cee8]">
              Ainda não tem acesso?{" "}
              <Link className="font-bold text-accent hover:text-white" href="/cadastro">
                Criar minha conta
              </Link>
            </p>
          ) : null}

          <div className="mt-6 rounded-xl border border-accent/20 bg-surface p-4 text-xs leading-5 text-[#b7cee8]">
            <strong className="text-[#eaf3ff]">
              {demoMode ? "Versão pública da interface" : "Acesso individual e protegido"}
            </strong>
            <br />
            {demoMode
              ? "A geração real ainda depende do servidor local conectado."
              : "Entre com a sua conta ou use “Criar minha conta” para fazer o primeiro acesso."}
          </div>
        </div>
      </section>
    </main>
  );
}
