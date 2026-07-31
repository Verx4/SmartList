"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileClock, LockKeyhole, Mail, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      router.push("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao criar a conta.");
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
            Sua apresentação, pronta com segurança
          </p>
          <h1 className="text-4xl font-bold leading-[1.12] tracking-[-0.045em] xl:text-5xl">
            Crie sua conta e teste o fluxo completo.
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-white/55">
            Envie o Excel, revise os dados encontrados e baixe o PowerPoint atualizado.
          </p>
        </div>
        <p className="relative text-xs text-white/32">© 2026 Engenharia Slides · Ambiente privado</p>
      </section>

      <section className="flex items-center justify-center border-l border-accent/10 bg-[#0a294e] px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px] rounded-3xl border border-accent/15 bg-card p-6 shadow-[0_24px_70px_rgba(0,7,24,.34)] sm:p-8">
          <Link className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#b7cee8] hover:text-white" href="/login">
            <ArrowLeft size={16} /> Voltar ao login
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Novo acesso</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white">Criar minha conta</h2>
          <p className="mt-3 text-sm leading-6 text-[#b7cee8]">
            Cadastre seus dados para entrar e gerar a apresentação.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {[
              { label: "Nome", type: "text", value: name, setValue: setName, icon: UserRound, autoComplete: "name" },
              { label: "E-mail", type: "email", value: email, setValue: setEmail, icon: Mail, autoComplete: "email" },
              { label: "Senha", type: "password", value: password, setValue: setPassword, icon: LockKeyhole, autoComplete: "new-password" },
            ].map((field) => (
              <label className="block" key={field.label}>
                <span className="mb-2 block text-xs font-bold text-[#d7e7f8]">{field.label}</span>
                <span className="flex h-12 items-center gap-3 rounded-xl border border-accent/20 bg-surface px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-brand/25">
                  <field.icon size={17} className="text-[#8eb2d5]" />
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(event) => field.setValue(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#6f91b2]"
                    autoComplete={field.autoComplete}
                    minLength={field.type === "password" ? 8 : undefined}
                    required
                  />
                </span>
              </label>
            ))}

            {error ? <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{error}</p> : null}

            <Button className="w-full" size="lg" disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta e entrar"}
              {!loading ? <ArrowRight size={17} /> : null}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
