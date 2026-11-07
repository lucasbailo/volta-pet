"use client";

// Cadastro de pessoa física ou ONG.  [RF01, RF02, RNF03]
import Link from "next/link";
import { useActionState, useState } from "react";
import { Campo } from "./Modal";
import { useCidadesDoEstado } from "./useCidadesDoEstado";
import { acaoCadastrar } from "@/app/acoes";

export default function FormCadastro({ estados }) {
  const [estado, cadastrar, cadastrando] = useActionState(acaoCadastrar, {});
  const v = estado.valores ?? {};
  const [tipo, setTipo] = useState(v.tipo ?? "pessoa");
  const { refUf, uf, cidades, trocarUf } = useCidadesDoEstado();
  const e = estado.erros ?? {};
  const ong = tipo === "ong";

  if (estado.ok) {
    return (
      <div role="status" className="space-y-3 rounded-2xl bg-adocao-claro p-6">
        <p className="text-xl font-bold">Falta só confirmar o e-mail.</p>
        <p className="text-lg">
          Enviamos um link para <strong>{estado.email}</strong>. Clique nele para ativar a conta. Se não aparecer em alguns minutos, olhe a caixa de spam.
        </p>
        {ong && <p>Depois da confirmação, a nossa equipe confere o CNPJ. Até lá, a página da ONG aparece como &ldquo;Cadastro em análise&rdquo;.</p>}
      </div>
    );
  }

  return (
    <form action={cadastrar} className="space-y-8" noValidate>
      {e.geral && <p role="alert" className="rounded-xl border-l-4 border-alerta bg-alerta-claro p-3">{e.geral}</p>}

      <fieldset>
        <legend className="rotulo">Tipo de conta</legend>
        <div className="flex flex-wrap gap-2">
          <label className="pilula"><input type="radio" name="tipo" value="pessoa" checked={!ong} onChange={() => setTipo("pessoa")} /> Pessoa</label>
          <label className="pilula"><input type="radio" name="tipo" value="ong" checked={ong} onChange={() => setTipo("ong")} /> ONG</label>
        </div>
        {ong && <p className="dica mt-2">ONGs ganham página pública e selo de verificada depois que a nossa equipe confere o CNPJ.</p>}
      </fieldset>

      <section className="space-y-5" aria-label="Dados da conta">
        <Campo id="nome" rotulo={ong ? "Nome da ONG" : "Seu nome"} erro={e.nome}>
          <input id="nome" name="nome" maxLength={100} autoComplete={ong ? "organization" : "name"} className="campo" defaultValue={v.nome} aria-invalid={Boolean(e.nome)} />
        </Campo>
        {ong && (
          <>
            <Campo id="cnpj" rotulo="CNPJ" erro={e.cnpj}>
              <input id="cnpj" name="cnpj" inputMode="numeric" maxLength={18} className="campo sm:w-64" placeholder="00.000.000/0000-00" defaultValue={v.cnpj} aria-invalid={Boolean(e.cnpj)} />
            </Campo>
            <Campo id="descricao" rotulo="Sobre a ONG" erro={e.descricao} dica="Aparece na página pública: o que vocês fazem e onde atuam.">
              <textarea id="descricao" name="descricao" rows={3} maxLength={2000} className="campo" defaultValue={v.descricao} aria-invalid={Boolean(e.descricao)} />
            </Campo>
            <Campo id="chave_pix" rotulo="Chave PIX para doações" opcional erro={e.chave_pix} dica="Só aparece depois da verificação.">
              <input id="chave_pix" name="chave_pix" maxLength={100} className="campo" defaultValue={v.chave_pix} />
            </Campo>
          </>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="email" rotulo="E-mail" erro={e.email}>
            <input id="email" name="email" type="email" autoComplete="email" className="campo" defaultValue={v.email} aria-invalid={Boolean(e.email)} />
          </Campo>
          <Campo id="senha" rotulo="Senha" erro={e.senha} dica="Pelo menos 8 caracteres.">
            <input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} className="campo" aria-invalid={Boolean(e.senha)} />
          </Campo>
          <Campo id="telefone" rotulo="Telefone" opcional erro={e.telefone} dica="Não aparece no site.">
            <input id="telefone" name="telefone" type="tel" autoComplete="tel" className="campo" defaultValue={v.telefone} />
          </Campo>
        </div>
        <div className="flex flex-wrap gap-4">
          <Campo id="uf" rotulo="Estado">
            <select id="uf" ref={refUf} className="campo w-48" value={uf} onChange={(ev) => trocarUf(ev.target.value)}>
              <option value="">Escolha</option>
              {estados.map((x) => <option key={x.sigla} value={x.sigla}>{x.nome}</option>)}
            </select>
          </Campo>
          <Campo id="cidade_id" rotulo="Cidade" erro={e.cidade_id}>
            <select id="cidade_id" name="cidade_id" className="campo w-64" disabled={!uf} key={`${uf}-${v.cidade_id ?? ""}`} defaultValue={v.cidade_id ?? ""} aria-invalid={Boolean(e.cidade_id)}>
              <option value="">{uf ? "Escolha" : "Escolha o estado"}</option>
              {cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="t-redes">
        <h2 id="t-redes" className="text-xl font-extrabold">Redes sociais <span className="font-normal text-tinta-suave">(opcional)</span></h2>
        <p className="dica -mt-3">Aparecem nos seus anúncios, para as pessoas confirmarem quem você é.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Campo id="instagram" rotulo="Instagram" opcional erro={e.instagram}>
            <input id="instagram" name="instagram" className="campo" placeholder="@usuario" defaultValue={v.instagram} />
          </Campo>
          <Campo id="facebook" rotulo="Facebook" opcional erro={e.facebook}>
            <input id="facebook" name="facebook" className="campo" placeholder="usuario" defaultValue={v.facebook} />
          </Campo>
          <Campo id="site" rotulo="Site" opcional erro={e.site}>
            <input id="site" name="site" type="url" className="campo" placeholder="https://" defaultValue={v.site} aria-invalid={Boolean(e.site)} />
          </Campo>
        </div>
      </section>

      <div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="aceite" className="mt-1 h-5 w-5 shrink-0 accent-tinta" aria-invalid={Boolean(e.aceite)} />
          <span>Li e aceito a <Link href="/privacidade" target="_blank" className="underline underline-offset-4">política de privacidade</Link>.</span>
        </label>
        {e.aceite && <p className="erro" role="alert">{e.aceite}</p>}
      </div>

      <button type="submit" className="botao botao-tinta w-full text-lg" disabled={cadastrando}>{cadastrando ? "Criando conta…" : "Criar conta"}</button>
    </form>
  );
}
