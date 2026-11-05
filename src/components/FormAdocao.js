"use client";

// RF16: "Quero adotar". O pedido vai só para o doador.
import Link from "next/link";
import { useActionState, useState } from "react";
import Modal, { Campo } from "./Modal";
import { acaoPedidoAdocao } from "@/app/acoes";

export default function FormAdocao({ anuncioId, nomeAnimal, usuario }) {
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState(0);
  return (
    <>
      <button type="button" className="botao botao-adocao w-full text-lg" onClick={() => { setChave((k) => k + 1); setAberto(true); }}>
        Quero adotar
      </button>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo={`Adotar ${nomeAnimal}`}>
        <Formulario key={chave} anuncioId={anuncioId} usuario={usuario} aoFechar={() => setAberto(false)} />
      </Modal>
    </>
  );
}

function Formulario({ anuncioId, usuario, aoFechar }) {
  const [estado, enviar, enviando] = useActionState(acaoPedidoAdocao, {});
  const e = estado.erros ?? {};
  const v = estado.valores ?? {};
  if (estado.ok) {
    return (
      <div className="space-y-4">
        <p className="text-lg">Pedido enviado. O doador vai analisar e entrar em contato pelo e-mail ou telefone que você informou.</p>
        <button type="button" className="botao botao-tinta" onClick={aoFechar}>Fechar</button>
      </div>
    );
  }
  return (
    <form action={enviar} className="space-y-5" noValidate>
      <input type="hidden" name="anuncio_id" value={anuncioId} />
      {e.geral && <p className="erro" role="alert">{e.geral}</p>}
      <Campo id="ad-mensagem" rotulo="Conte um pouco sobre você e sua casa" erro={e.mensagem}>
        <textarea id="ad-mensagem" name="mensagem" rows={4} maxLength={1000} className="campo" defaultValue={v.mensagem}
          placeholder="Ex.: moro em apartamento telado, já tenho uma gata castrada e trabalho em casa." aria-invalid={Boolean(e.mensagem)} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="ad-nome" rotulo="Seu nome" erro={e.nome}>
          <input id="ad-nome" name="nome" className="campo" autoComplete="name" defaultValue={v.nome ?? usuario?.nome ?? ""} aria-invalid={Boolean(e.nome)} />
        </Campo>
        <Campo id="ad-telefone" rotulo="Telefone" opcional>
          <input id="ad-telefone" name="telefone" type="tel" className="campo" autoComplete="tel" defaultValue={v.telefone} />
        </Campo>
      </div>
      <Campo id="ad-email" rotulo="Seu e-mail" erro={e.email}>
        <input id="ad-email" name="email" type="email" className="campo" autoComplete="email" defaultValue={v.email} aria-invalid={Boolean(e.email)} />
      </Campo>
      <div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consentimento" className="mt-1 h-5 w-5 shrink-0 accent-tinta" defaultChecked={v.consentimento === "on"} />
          <span>Autorizo enviar meu nome e contato ao doador. Eles não ficam visíveis para mais ninguém.{" "}
            <Link href="/privacidade" target="_blank" className="underline underline-offset-4">Como usamos seus dados</Link>.</span>
        </label>
        {e.consentimento && <p className="erro" role="alert">{e.consentimento}</p>}
      </div>
      <button type="submit" className="botao botao-tinta w-full" disabled={enviando}>{enviando ? "Enviando pedido…" : "Enviar pedido"}</button>
    </form>
  );
}
