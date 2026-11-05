"use client";

// RF11: "Encontrei o animal". Sem conta: confirma o e-mail com código (RN07).
import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import Modal, { Campo, agoraParaInput } from "./Modal";
import { SeletorLocal } from "./Mapa";
import { acaoEnviarAviso, acaoEnviarCodigo } from "@/app/acoes";
import { comprimirFoto } from "@/lib/fotos";

// modo "encontrei": alguém viu um animal desaparecido.
// modo "dono": o tutor reconhece um animal publicado como encontrado.
export default function ModalEncontrei({ anuncioId, nomeAnimal, centro, usuario, modo = "encontrei" }) {
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState(0);
  return (
    <>
      <button type="button" className={`botao w-full text-lg ${modo === "dono" ? "botao-achado" : "botao-cartaz"}`} onClick={() => { setChave((k) => k + 1); setAberto(true); }}>
        {modo === "dono" ? "Este animal é meu" : "Encontrei o animal"}
      </button>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo={modo === "dono" ? "Este animal é seu?" : `Você viu ${nomeAnimal}?`}>
        <Formulario key={chave} anuncioId={anuncioId} centro={centro} usuario={usuario} modo={modo} aoFechar={() => setAberto(false)} />
      </Modal>
    </>
  );
}

function Formulario({ anuncioId, centro, usuario, modo, aoFechar }) {
  const dono = modo === "dono";
  const [estado, enviar, enviando] = useActionState(acaoEnviarAviso, {});
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [codigo, setCodigo] = useState({ enviado: false, local: null, erro: "", enviando: false });
  const [ponto, setPonto] = useState(null);
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [visto] = useState(agoraParaInput);
  const [foto, setFoto] = useState(null); // { arquivo, url } já comprimida
  const [erroFoto, setErroFoto] = useState("");
  const e = estado.erros ?? {};
  const v = estado.valores ?? {};

  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto.url); }, [foto]);

  if (estado.ok) {
    return (
      <div className="space-y-4">
        <p className="text-lg">
          {dono ? "Mensagem enviada. Quem encontrou o animal recebeu seu contato e pode falar com você." : "Aviso enviado. O responsável recebeu seus dados de contato e pode falar com você."}
        </p>
        {!usuario && (
          <p className="rounded-xl bg-papel p-4">
            Quer acompanhar outros anúncios e avisar mais vezes?{" "}
            <Link href="/entrar" className="font-semibold underline">Crie uma conta</Link>.
          </p>
        )}
        <button type="button" className="botao botao-tinta" onClick={aoFechar}>Fechar</button>
      </div>
    );
  }

  async function pedirCodigo() {
    setCodigo((c) => ({ ...c, enviando: true, erro: "" }));
    const r = await acaoEnviarCodigo(email);
    setCodigo({ enviado: !r.erro, local: r.codigoLocal ?? null, erro: r.erro ?? "", enviando: false });
  }

  async function escolherFoto(arquivo) {
    setErroFoto("");
    if (!arquivo?.type.startsWith("image/")) return;
    try {
      const comprimida = await comprimirFoto(arquivo);
      setFoto({ arquivo: comprimida, url: URL.createObjectURL(comprimida) });
    } catch (err) {
      setErroFoto(err.message);
    }
  }

  // A foto comprimida fica no estado; ela entra no envio no lugar do arquivo original.
  function aoEnviar(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    fd.delete("seletor_foto");
    if (foto) fd.set("foto", foto.arquivo);
    startTransition(() => enviar(fd));
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-5" noValidate>
      <input type="hidden" name="anuncio_id" value={anuncioId} />
      <p role="note" className="rounded-xl border-l-4 border-alerta bg-alerta-claro p-3 text-[0.95rem]">
        {dono
          ? "Para proteger o animal, quem o encontrou pode pedir fotos antigas ou um detalhe que só o tutor conhece. Nunca pague para recebê-lo de volta."
          : "Cuidado com golpes: o responsável nunca deve pedir dinheiro antes de ver o animal. Se combinarem a entrega, escolham um lugar público."}
      </p>
      {e.geral && <p className="erro" role="alert">{e.geral}</p>}
      {estado.exigeConta && (
        <p><Link href="/entrar" className="botao botao-tinta botao-pequeno">Criar conta</Link></p>
      )}

      {!dono && (
      <fieldset className="space-y-2">
        <legend className="rotulo">O que aconteceu?</legend>
        <div className="flex flex-wrap gap-2">
          <label className="pilula"><input type="radio" name="animal_comigo" value="nao" defaultChecked={v.animal_comigo !== "sim"} /> Vi o animal</label>
          <label className="pilula"><input type="radio" name="animal_comigo" value="sim" defaultChecked={v.animal_comigo === "sim"} /> O animal está comigo</label>
        </div>
      </fieldset>
      )}

      <Campo id="visto_em" rotulo={dono ? "Quando ele sumiu?" : "Quando?"} erro={e.visto_em}>
        <input id="visto_em" name="visto_em" type="datetime-local" className="campo" defaultValue={v.visto_em ?? visto} max={visto} aria-invalid={Boolean(e.visto_em)} />
      </Campo>

      {!dono && (
        <div>
          <p className="rotulo">Onde? <span className="font-normal text-tinta-suave">(opcional, mas ajuda muito)</span></p>
          <SeletorLocal inicial={{ ...centro, zoom: 15 }} valor={ponto} aoMudar={setPonto} altura="h-[220px]" />
        </div>
      )}

      <Campo id="mensagem" rotulo="Detalhes" opcional erro={e.mensagem}>
        <textarea id="mensagem" name="mensagem" rows={3} maxLength={1000} className="campo" defaultValue={v.mensagem}
          placeholder={dono ? "Ex.: ele tem uma cicatriz na pata traseira e atende por Bob. Tenho fotos dele." : "Ex.: estava embaixo de um carro na rua de trás, parecia assustado."} />
      </Campo>

      <div>
        <p className="rotulo">Foto <span className="font-normal text-tinta-suave">(opcional)</span></p>
        <p className="dica mb-2">{dono ? "Uma foto antiga com o animal ajuda a provar que ele é seu." : "Uma foto ajuda o responsável a reconhecer o animal."} Só o responsável vê.</p>
        {foto ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt="Foto escolhida" className="h-20 w-20 rounded-xl object-cover" />
            <button type="button" className="botao botao-contorno botao-pequeno" onClick={() => setFoto(null)}>Remover foto</button>
          </div>
        ) : (
          <label className="botao botao-contorno botao-pequeno cursor-pointer">
            Escolher foto
            <input type="file" name="seletor_foto" accept="image/*" className="sr-only"
              onChange={(ev) => { escolherFoto(ev.target.files?.[0]); ev.target.value = ""; }} />
          </label>
        )}
        {(erroFoto || e.foto) && <p className="erro" role="alert">{erroFoto || e.foto}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nome" rotulo="Seu nome" erro={e.nome}>
          <input id="nome" name="nome" className="campo" autoComplete="name" defaultValue={v.nome ?? usuario?.nome ?? ""} aria-invalid={Boolean(e.nome)} />
        </Campo>
        <Campo id="telefone" rotulo="Telefone" opcional erro={e.telefone}>
          <input id="telefone" name="telefone" type="tel" className="campo" autoComplete="tel" defaultValue={v.telefone} />
        </Campo>
      </div>

      <Campo id="email" rotulo="Seu e-mail" erro={e.email}>
        <div className="flex gap-2">
          <input id="email" name="email" type="email" className="campo" autoComplete="email" value={email}
            onChange={(ev) => setEmail(ev.target.value)} aria-invalid={Boolean(e.email)} />
          {!usuario && (
            <button type="button" className="botao botao-contorno botao-pequeno shrink-0" onClick={pedirCodigo} disabled={codigo.enviando || !email}>
              {codigo.enviado ? "Reenviar código" : "Enviar código"}
            </button>
          )}
        </div>
      </Campo>

      {!usuario && (
        <Campo id="codigo" rotulo="Código de confirmação" erro={e.codigo || codigo.erro}
          dica={codigo.enviado ? "Enviamos um código de 6 números para o seu e-mail." : "Como você não tem conta, confirmamos o e-mail antes de enviar o aviso."}>
          <input id="codigo" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="campo w-40 tracking-[0.3em]"
            value={codigoDigitado} onChange={(ev) => setCodigoDigitado(ev.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(e.codigo)} />
          {codigo.local && (
            <p className="mt-2 rounded-lg border border-dashed border-tinta/40 px-3 py-2 text-sm">
              Modo local: o código é <strong>{codigo.local}</strong> (no site publicado ele chega por e-mail).
            </p>
          )}
        </Campo>
      )}

      <div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consentimento" className="mt-1 h-5 w-5 shrink-0 accent-tinta" defaultChecked={v.consentimento === "on"} />
          <span>Autorizo enviar meu nome e contato {dono ? "a quem encontrou o animal" : "ao responsável pelo anúncio"}. Eles não ficam visíveis para mais ninguém.{" "}
            <Link href="/privacidade" target="_blank" className="underline underline-offset-4">Como usamos seus dados</Link>.</span>
        </label>
        {e.consentimento && <p className="erro" role="alert">{e.consentimento}</p>}
      </div>

      <button type="submit" className="botao botao-tinta w-full" disabled={enviando}>
        {enviando ? "Enviando…" : dono ? "Enviar mensagem" : "Enviar aviso"}
      </button>
    </form>
  );
}
