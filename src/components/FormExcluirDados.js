"use client";

// Pedido de exclusão: confirma o e-mail com código de 6 dígitos e apaga avisos e pedidos.  [RN03, RNF03]
import { useActionState, useState } from "react";
import { Campo } from "./Modal";
import { acaoEnviarCodigo, acaoExcluirMeusDados } from "@/app/acoes";

export default function FormExcluirDados() {
  const [estado, excluir, excluindo] = useActionState(acaoExcluirMeusDados, {});
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [envio, setEnvio] = useState({ enviado: false, local: null, erro: "", enviando: false });
  const e = estado.erros ?? {};

  if (estado.ok) {
    const total = estado.avisos + estado.pedidos;
    return (
      <div role="status" className="rounded-2xl bg-adocao-claro p-6">
        <p className="text-lg font-bold">
          {total === 0
            ? "Não havia avisos nem pedidos com esse e-mail."
            : `Pronto: apagamos ${estado.avisos} ${estado.avisos === 1 ? "aviso" : "avisos"} e ${estado.pedidos} ${estado.pedidos === 1 ? "pedido" : "pedidos"} enviados com esse e-mail.`}
        </p>
        <p className="mt-1">O código de confirmação também foi apagado.</p>
      </div>
    );
  }

  async function pedirCodigo() {
    setEnvio((x) => ({ ...x, enviando: true, erro: "" }));
    const r = await acaoEnviarCodigo(email);
    setEnvio({ enviado: !r.erro, local: r.codigoLocal ?? null, erro: r.erro ?? "", enviando: false });
  }

  return (
    <form action={excluir} className="space-y-5 rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-6" noValidate>
      <Campo id="email" rotulo="E-mail usado no aviso ou pedido" erro={e.email || envio.erro}>
        <div className="flex gap-2">
          <input id="email" name="email" type="email" className="campo" autoComplete="email" value={email}
            onChange={(ev) => setEmail(ev.target.value)} aria-invalid={Boolean(e.email || envio.erro)} />
          <button type="button" className="botao botao-contorno botao-pequeno shrink-0" onClick={pedirCodigo} disabled={envio.enviando || !email}>
            {envio.enviado ? "Reenviar código" : "Enviar código"}
          </button>
        </div>
      </Campo>

      <Campo id="codigo" rotulo="Código de confirmação" erro={e.codigo}
        dica={envio.enviado ? "Enviamos um código de 6 números para o seu e-mail." : "Confirmamos que o e-mail é seu antes de apagar."}>
        <input id="codigo" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="campo w-40 tracking-[0.3em]"
          value={codigo} onChange={(ev) => setCodigo(ev.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(e.codigo)} />
        {envio.local && (
          <p className="mt-2 rounded-lg border border-dashed border-tinta/40 px-3 py-2 text-sm">
            Modo local: o código é <strong>{envio.local}</strong> (no site publicado ele chega por e-mail).
          </p>
        )}
      </Campo>

      <div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="confirmacao" className="mt-1 h-5 w-5 shrink-0 accent-tinta" aria-invalid={Boolean(e.confirmacao)} />
          <span>Entendo que a exclusão não pode ser desfeita e que o responsável pelo anúncio deixa de ver o meu contato aqui no site.</span>
        </label>
        {e.confirmacao && <p className="erro" role="alert">{e.confirmacao}</p>}
      </div>

      <button type="submit" className="botao botao-tinta w-full" disabled={excluindo}>
        {excluindo ? "Apagando…" : "Apagar meus dados"}
      </button>
    </form>
  );
}
