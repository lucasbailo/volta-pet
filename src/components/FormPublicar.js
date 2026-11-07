"use client";

// RF07, RF13, RF15: formulário único para os três tipos de anúncio.
import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { Campo, agoraParaInput } from "./Modal";
import { SeletorLocal } from "./Mapa";
import { Distancia } from "./Unidade";
import FotoAnimal from "./FotoAnimal";
import { textoFaixa, titulo } from "./CardAnuncio";
import { useCidadesDoEstado } from "./useCidadesDoEstado";
import { acaoBuscarParecidos, acaoPublicarAnuncio } from "@/app/acoes";
import { ESPECIES, EMOJI_ESPECIE, LIMITE_FOTOS, ROTULOS, zonasPara } from "@/lib/regras";
import { comprimirFoto } from "@/lib/fotos";

const TIPOS = [
  ["desaparecido", "Meu animal sumiu", "botao-cartaz"],
  ["encontrado", "Encontrei um animal", "botao-achado"],
  ["doacao", "Quero doar um animal", "botao-adocao"],
];

export default function FormPublicar({ tipoInicial, estados }) {
  const [estado, publicar, publicando] = useActionState(acaoPublicarAnuncio, {});
  const [tipo, setTipo] = useState(tipoInicial);
  const [especie, setEspecie] = useState("");
  const [perfil, setPerfil] = useState("");
  const { refUf, uf, cidades, trocarUf: carregarCidades } = useCidadesDoEstado();
  const [cidadeId, setCidadeId] = useState("");
  const [ponto, setPonto] = useState(null);
  const [centro, setCentro] = useState({ lat: -15.78, lng: -47.93, zoom: 4 });
  const [precisao, setPrecisao] = useState("aproximado");
  const [fotos, setFotos] = useState([]);
  const [erroFotos, setErroFotos] = useState("");
  const [agora] = useState(agoraParaInput);
  const topo = useRef(null);
  const e = estado.erros ?? {};

  useEffect(() => {
    if (Object.keys(e).length) topo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => fotos.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // RF14: antes de publicar um encontrado, procura desaparecidos parecidos perto do ponto marcado.
  const [parecidos, setParecidos] = useState({ chave: "", itens: [] });
  const chaveBusca = tipo === "encontrado" && especie && ponto ? `${especie}:${ponto.lat}:${ponto.lng}` : "";
  useEffect(() => {
    if (!chaveBusca) return;
    let cancelado = false;
    acaoBuscarParecidos(especie, ponto.lat, ponto.lng).then((itens) => {
      if (!cancelado) setParecidos({ chave: chaveBusca, itens });
    });
    return () => { cancelado = true; };
  }, [chaveBusca]); // eslint-disable-line react-hooks/exhaustive-deps
  const listaParecidos = chaveBusca && parecidos.chave === chaveBusca ? parecidos.itens : [];

  function trocarUf(novaUf) {
    setCidadeId("");
    carregarCidades(novaUf);
  }

  function trocarCidade(id) {
    setCidadeId(id);
    const c = cidades.find((x) => String(x.id) === id);
    if (c) setCentro({ lat: c.lat, lng: c.lng, zoom: 14, chave: c.id });
  }

  async function adicionarFotos(lista) {
    setErroFotos("");
    const novas = [];
    for (const arquivo of Array.from(lista).slice(0, LIMITE_FOTOS - fotos.length)) {
      if (!arquivo.type.startsWith("image/")) continue;
      try {
        const comprimida = await comprimirFoto(arquivo);
        novas.push({ arquivo: comprimida, url: URL.createObjectURL(comprimida) });
      } catch (err) {
        setErroFotos(err.message);
      }
    }
    if (lista.length + fotos.length > LIMITE_FOTOS) setErroFotos(`Use até ${LIMITE_FOTOS} fotos.`);
    setFotos((atual) => [...atual, ...novas]);
  }

  function enviar(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    fd.delete("seletor_fotos");
    for (const f of fotos) fd.append("fotos", f.arquivo);
    startTransition(() => publicar(fd));
  }

  const zonas = tipo === "desaparecido" && especie && perfil ? zonasPara(especie, perfil) : null;

  return (
    <form onSubmit={enviar} className="space-y-10" noValidate>
      <div ref={topo} className="scroll-mt-28" />
      {Object.keys(e).length > 0 && (
        <div role="alert" className="rounded-2xl border-l-4 border-alerta bg-alerta-claro p-4">
          <p className="font-bold">{e.geral ?? "Revise os campos destacados abaixo."}</p>
        </div>
      )}

      <fieldset>
        <legend className="titulo mb-3 text-2xl font-extrabold">O que você quer anunciar?</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map(([valor, rotulo]) => (
            <label key={valor} className="pilula text-lg">
              <input type="radio" name="tipo" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="space-y-5" aria-labelledby="t-animal">
        <h2 id="t-animal" className="text-2xl font-extrabold">Sobre o animal</h2>
        <fieldset>
          <legend className="rotulo">Espécie</legend>
          <div className="flex flex-wrap gap-2">
            {ESPECIES.map((x) => (
              <label key={x} className="pilula">
                <input type="radio" name="especie" value={x} checked={especie === x} onChange={() => setEspecie(x)} />
                <span aria-hidden="true">{EMOJI_ESPECIE[x]}</span> {ROTULOS.especie[x]}
              </label>
            ))}
          </div>
          {e.especie && <p className="erro">{e.especie}</p>}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="nome" rotulo="Nome" opcional={tipo === "encontrado"} erro={e.nome}
            dica={tipo === "encontrado" ? "Se tiver plaquinha com nome, coloque aqui." : undefined}>
            <input id="nome" name="nome" maxLength={60} className="campo" aria-invalid={Boolean(e.nome)} />
          </Campo>
          <Campo id="raca" rotulo="Raça" opcional erro={e.raca}>
            <input id="raca" name="raca" maxLength={60} className="campo" placeholder="Ex.: sem raça definida" />
          </Campo>
          <Campo id="sexo" rotulo="Sexo">
            <select id="sexo" name="sexo" className="campo" defaultValue="desconhecido">
              <option value="desconhecido">Não sei</option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
            </select>
          </Campo>
          <Campo id="porte" rotulo="Porte" opcional>
            <select id="porte" name="porte" className="campo" defaultValue="">
              <option value="">Não informar</option>
              <option value="pequeno">Pequeno</option>
              <option value="medio">Médio</option>
              <option value="grande">Grande</option>
            </select>
          </Campo>
          <Campo id="idade_valor" rotulo="Idade" opcional erro={e.idade_valor} dica="Aproximada, se não souber ao certo.">
            <div className="flex gap-2">
              <input id="idade_valor" name="idade_valor" type="number" min="0" max="400" className="campo w-28" />
              <select name="idade_unidade" className="campo" aria-label="Unidade da idade" defaultValue="anos">
                <option value="anos">anos</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </Campo>
          <Campo id="cor" rotulo="Cor" opcional erro={e.cor}>
            <input id="cor" name="cor" maxLength={60} className="campo" placeholder="Ex.: caramelo com peito branco" />
          </Campo>
        </div>
        <Campo id="sinais_particulares" rotulo="Sinais particulares" opcional erro={e.sinais_particulares}
          dica="Coleira, manchas, cicatrizes, comportamento. Ajuda a reconhecer.">
          <input id="sinais_particulares" name="sinais_particulares" maxLength={500} className="campo" />
        </Campo>
        <Campo id="descricao" rotulo="Descrição" opcional erro={e.descricao}>
          <textarea id="descricao" name="descricao" rows={4} maxLength={2000} className="campo"
            placeholder={tipo === "doacao" ? "Temperamento, rotina, cuidados especiais." : "Como aconteceu, como ele reage a pessoas, o que fazer se encontrá-lo."} />
        </Campo>
      </section>

      {tipo === "desaparecido" && (
        <section className="space-y-5" aria-labelledby="t-sumico">
          <h2 id="t-sumico" className="text-2xl font-extrabold">Sobre o desaparecimento</h2>
          <Campo id="data_evento" rotulo="Quando ele sumiu?" erro={e.data_evento}>
            <input id="data_evento" name="data_evento" type="datetime-local" max={agora} className="campo sm:w-72" aria-invalid={Boolean(e.data_evento)} />
          </Campo>
          <fieldset>
            <legend className="rotulo">Ele costuma sair de casa?</legend>
            <p className="dica mb-2">Isso muda bastante a distância que ele costuma percorrer e o tamanho da área de busca no mapa.</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROTULOS.perfilSaida).map(([valor, rotulo]) => (
                <label key={valor} className="pilula">
                  <input type="radio" name="perfil_saida" value={valor} checked={perfil === valor} onChange={() => setPerfil(valor)} />
                  {rotulo}
                </label>
              ))}
            </div>
            {e.perfil_saida && <p className="erro">{e.perfil_saida}</p>}
            {zonas && (
              <p className="mt-3 rounded-xl bg-cartaz/30 px-4 py-3">
                O mapa vai destacar até <strong><Distancia metros={zonas.interna_m} /></strong> (onde {zonas.interna_pct}% foram achados) e até{" "}
                <strong><Distancia metros={zonas.externa_m} /></strong> ({zonas.externa_pct}%).
              </p>
            )}
            {tipo === "desaparecido" && ["passaro", "outro"].includes(especie) && (
              <p className="dica mt-3">Para essa espécie ainda não há estudos de distância. O mapa vai mostrar só o último local visto.</p>
            )}
          </fieldset>
          <Campo id="recompensa" rotulo="Recompensa" opcional erro={e.recompensa} dica="Em reais. Será paga por você somente depois da devolução.">
            <input id="recompensa" name="recompensa" inputMode="decimal" className="campo sm:w-48" placeholder="Ex.: 200" />
          </Campo>
        </section>
      )}

      {tipo === "encontrado" && (
        <section className="space-y-5" aria-labelledby="t-achado">
          <h2 id="t-achado" className="text-2xl font-extrabold">Sobre o encontro</h2>
          <Campo id="data_evento" rotulo="Quando você o encontrou?" erro={e.data_evento}>
            <input id="data_evento" name="data_evento" type="datetime-local" max={agora} defaultValue={agora} className="campo sm:w-72" />
          </Campo>
          <fieldset>
            <legend className="rotulo">O animal está com você?</legend>
            <div className="flex flex-wrap gap-2">
              <label className="pilula"><input type="radio" name="animal_comigo" value="sim" defaultChecked /> Sim, está comigo</label>
              <label className="pilula"><input type="radio" name="animal_comigo" value="nao" /> Não, só vi</label>
            </div>
          </fieldset>
        </section>
      )}

      {tipo === "doacao" && (
        <section className="space-y-5" aria-labelledby="t-saude">
          <h2 id="t-saude" className="text-2xl font-extrabold">Saúde e convivência</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["vacinado", "É vacinado?", true],
              ["castrado", "É castrado?", true],
              ["vermifugado", "É vermifugado?"],
              ["convive_criancas", "Convive bem com crianças?"],
              ["convive_caes", "Convive bem com cães?"],
              ["convive_gatos", "Convive bem com gatos?"],
            ].map(([nome, pergunta, obrigatorio]) => (
              <fieldset key={nome}>
                <legend className="rotulo">{pergunta} {!obrigatorio && <span className="font-normal text-tinta-suave">(opcional)</span>}</legend>
                <div className="flex gap-2">
                  <label className="pilula"><input type="radio" name={nome} value="sim" /> Sim</label>
                  <label className="pilula"><input type="radio" name={nome} value="nao" /> Não</label>
                  {!obrigatorio && <label className="pilula"><input type="radio" name={nome} value="" defaultChecked /> Não sei</label>}
                </div>
                {e[nome] && <p className="erro">{e[nome]}</p>}
              </fieldset>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5" aria-labelledby="t-local">
        <h2 id="t-local" className="text-2xl font-extrabold">
          {tipo === "desaparecido" ? "Onde ele foi visto pela última vez?" : tipo === "encontrado" ? "Onde você o encontrou?" : "Onde ele está?"}
        </h2>
        <div className="flex flex-wrap gap-4">
          <Campo id="uf" rotulo="Estado">
            <select id="uf" ref={refUf} className="campo w-48" value={uf} onChange={(ev) => trocarUf(ev.target.value)}>
              <option value="">Escolha</option>
              {estados.map((x) => <option key={x.sigla} value={x.sigla}>{x.nome}</option>)}
            </select>
          </Campo>
          <Campo id="cidade_id" rotulo="Cidade" erro={e.cidade_id}>
            <select id="cidade_id" name="cidade_id" className="campo w-64" value={cidadeId} disabled={!uf} onChange={(ev) => trocarCidade(ev.target.value)}>
              <option value="">{uf ? "Escolha" : "Escolha o estado"}</option>
              {cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
        </div>
        <SeletorLocal key={centro.chave ?? "brasil"} inicial={centro} valor={ponto} aoMudar={setPonto} erro={e.ponto} altura="h-[360px]" />
        {listaParecidos.length > 0 && (
          <div role="status" className="rounded-2xl border-[1.5px] border-achado bg-achado-claro p-4">
            <p className="font-bold">Pode ser um destes? Eles sumiram perto daqui.</p>
            <p className="dica">Se for, use o botão &ldquo;Encontrei o animal&rdquo; no anúncio para avisar o tutor direto. Os links abrem em outra aba.</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {listaParecidos.map((p) => (
                <li key={p.id}>
                  <a href={`/anuncio/${p.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-folha p-2 hover:outline hover:outline-tinta/40">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      <FotoAnimal foto={p.foto} especie={p.especie} tipo={p.tipo} nome={titulo(p)} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">{titulo(p)}</span>
                      <span className="block text-sm text-tinta-suave">
                        {textoFaixa(p)}, a <Distancia metros={p.distancia_m} />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tipo !== "doacao" ? (
          <fieldset>
            <legend className="rotulo">O que mostrar para as outras pessoas?</legend>
            <div className="flex flex-wrap gap-2">
              <label className="pilula"><input type="radio" name="precisao" value="aproximado" checked={precisao === "aproximado"} onChange={() => setPrecisao("aproximado")} /> Local aproximado</label>
              <label className="pilula"><input type="radio" name="precisao" value="exato" checked={precisao === "exato"} onChange={() => setPrecisao("exato")} /> Local exato</label>
            </div>
            {precisao === "aproximado" && zonas && zonas.externa_m < 300 && (
              <p className="mt-2 rounded-xl bg-cartaz/30 px-4 py-3 text-[0.95rem]">
                Atenção: para esse perfil a área de busca é pequena (até <Distancia metros={zonas.externa_m} />), e o modo aproximado
                desloca o ponto em até 150 m. Se o local não for a sua casa, prefira o local exato para a busca ficar precisa.
              </p>
            )}
            <p className="dica mt-2">
              {precisao === "aproximado"
                ? "O mapa público mostra uma região de cerca de 150 m em volta do ponto. Bom quando o ponto é a sua casa."
                : "O ponto exato fica visível para todos. Use quando o local não revela seu endereço."}
            </p>
          </fieldset>
        ) : (
          <input type="hidden" name="precisao" value="aproximado" />
        )}
      </section>

      <section className="space-y-3" aria-labelledby="t-fotos">
        <h2 id="t-fotos" className="text-2xl font-extrabold">Fotos</h2>
        <p className="dica">Até {LIMITE_FOTOS} fotos. Fotos nítidas, de corpo inteiro e de frente ajudam a reconhecer.</p>
        {fotos.length > 0 && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {fotos.map((f, i) => (
              <li key={f.url} className="relative aspect-square overflow-hidden rounded-xl border border-linha">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFotos((l) => l.filter((x) => x !== f))}
                  className="absolute right-1.5 top-1.5 rounded-full bg-tinta/85 px-2 text-white" aria-label={`Remover foto ${i + 1}`}>×</button>
              </li>
            ))}
          </ul>
        )}
        {fotos.length < LIMITE_FOTOS && (
          <label className="botao botao-contorno cursor-pointer">
            Adicionar fotos
            <input type="file" name="seletor_fotos" accept="image/*" multiple className="sr-only"
              onChange={(ev) => { adicionarFotos(ev.target.files); ev.target.value = ""; }} />
          </label>
        )}
        {(erroFotos || e.fotos) && <p className="erro">{erroFotos || e.fotos}</p>}
      </section>

      <div className="border-t-[1.5px] border-tinta/10 pt-6">
        <button type="submit" className={`botao text-lg ${TIPOS.find((t) => t[0] === tipo)[2]}`} disabled={publicando}>
          {publicando ? "Publicando…" : "Publicar anúncio"}
        </button>
        <p className="dica mt-3">O anúncio fica no ar por 60 dias e pode ser renovado.</p>
      </div>
    </form>
  );
}
