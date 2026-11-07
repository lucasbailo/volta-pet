"use client";

// Formulários de conta: entrar, pedir link de nova senha e definir a nova senha.  [RF03]
import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "./Modal";
import { acaoEntrar, acaoNovaSenha, acaoRecuperarSenha } from "@/app/acoes";

function ErroGeral({ texto }) {
  return texto ? <p role="alert" className="rounded-xl border-l-4 border-alerta bg-alerta-claro p-3">{texto}</p> : null;
}

export function FormEntrar({ proximo }) {
  const [estado, entrar, entrando] = useActionState(acaoEntrar, {});
  const e = estado.erros ?? {};
  return (
    <form action={entrar} className="space-y-5" noValidate>
      <input type="hidden" name="proximo" value={proximo ?? ""} />
      <ErroGeral texto={e.geral} />
      <Campo id="email" rotulo="E-mail" erro={e.email}>
        <input id="email" name="email" type="email" autoComplete="email" className="campo" defaultValue={estado.email} aria-invalid={Boolean(e.email)} />
      </Campo>
      <Campo id="senha" rotulo="Senha" erro={e.senha}>
        <input id="senha" name="senha" type="password" autoComplete="current-password" className="campo" aria-invalid={Boolean(e.senha)} />
      </Campo>
      <button type="submit" className="botao botao-tinta w-full" disabled={entrando}>{entrando ? "Entrando…" : "Entrar"}</button>
      <p className="text-center">
        <Link href="/recuperar-senha" className="underline underline-offset-4">Esqueci minha senha</Link>
      </p>
    </form>
  );
}

export function FormRecuperarSenha() {
  const [estado, enviar, enviando] = useActionState(acaoRecuperarSenha, {});
  const e = estado.erros ?? {};
  if (estado.ok) {
    return (
      <p role="status" className="rounded-2xl bg-adocao-claro p-5 text-lg">
        Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora.
      </p>
    );
  }
  return (
    <form action={enviar} className="space-y-5" noValidate>
      <ErroGeral texto={e.geral} />
      <Campo id="email" rotulo="E-mail da conta" erro={e.email}>
        <input id="email" name="email" type="email" autoComplete="email" className="campo" aria-invalid={Boolean(e.email)} />
      </Campo>
      <button type="submit" className="botao botao-tinta w-full" disabled={enviando}>{enviando ? "Enviando…" : "Enviar link"}</button>
    </form>
  );
}

export function FormNovaSenha() {
  const [estado, salvar, salvando] = useActionState(acaoNovaSenha, {});
  const e = estado.erros ?? {};
  return (
    <form action={salvar} className="space-y-5" noValidate>
      <ErroGeral texto={e.geral} />
      <Campo id="senha" rotulo="Nova senha" erro={e.senha} dica="Pelo menos 8 caracteres.">
        <input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} className="campo" aria-invalid={Boolean(e.senha)} />
      </Campo>
      <Campo id="confirmacao" rotulo="Repita a nova senha" erro={e.confirmacao}>
        <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" className="campo" aria-invalid={Boolean(e.confirmacao)} />
      </Campo>
      <button type="submit" className="botao botao-tinta w-full" disabled={salvando}>{salvando ? "Salvando…" : "Salvar nova senha"}</button>
    </form>
  );
}
