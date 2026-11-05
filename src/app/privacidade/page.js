import Link from "next/link";
import { MARCA } from "@/lib/marca";
import { REGRAS_EXPIRACAO, JANELA_AVISO_ANONIMO_DIAS } from "@/lib/regras";

export const metadata = { title: "Privacidade" };

// Política de privacidade  [RN03, RN04, RN07, RNF03]
// Os prazos vêm de src/lib/regras.js para o texto nunca ficar diferente do que o sistema faz.
const { validade, remocao } = REGRAS_EXPIRACAO.desaparecido;

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-10 pt-8 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-extrabold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Privacidade</h1>
      <p className="text-lg text-tinta-suave">
        Como o {MARCA.nome} trata os seus dados, em linguagem simples, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>

      <h2>Quais dados guardamos e para quê</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome, e-mail, telefone, cidade e redes sociais que você escolher mostrar. ONGs informam também CNPJ,
          descrição e chave PIX. Servem para publicar anúncios e para as pessoas falarem com você.
        </li>
        <li>
          <strong>Anúncios:</strong> dados e fotos do animal, cidade e o ponto no mapa. No modo &ldquo;local aproximado&rdquo;, o mapa público
          mostra um ponto deslocado entre 50 e 150 m; o ponto exato só você vê.
        </li>
        <li>
          <strong>&ldquo;Encontrei o animal&rdquo; e &ldquo;Quero adotar&rdquo;:</strong> nome, e-mail, telefone (opcional), mensagem, foto
          (opcional) e o local marcado. Só são enviados com a sua autorização, marcada no formulário.
        </li>
        <li>
          <strong>Denúncias:</strong> o motivo e os detalhes que você escrever. Não pedimos nome nem e-mail.
        </li>
        <li>
          <strong>Proteção contra abuso:</strong> para limitar avisos sem conta a 1 a cada {JANELA_AVISO_ANONIMO_DIAS} dias, guardamos
          um código embaralhado (hash) do endereço IP, nunca o IP em si.
        </li>
      </ul>

      <h2>Quem vê o seu contato</h2>
      <p>
        O contato de quem envia &ldquo;Encontrei o animal&rdquo; ou &ldquo;Quero adotar&rdquo; vai <strong>só para o responsável pelo anúncio</strong>,
        no painel dele (e, quando disponível, por e-mail). Ele nunca aparece no anúncio público. A foto enviada junto também só é mostrada ao responsável.
      </p>
      <p>Não vendemos nem repassamos dados para publicidade.</p>

      <h2>Por quanto tempo</h2>
      <ul>
        <li>Anúncios ficam no ar por {validade} dias e podem ser renovados. Sem renovação, são apagados {remocao} dias depois de expirar.</li>
        <li>Avisos e pedidos são apagados junto com o anúncio a que se referem, ou antes, se você pedir.</li>
        <li>O hash do IP é apagado depois de {JANELA_AVISO_ANONIMO_DIAS} dias.</li>
        <li>Códigos de confirmação de e-mail valem 15 minutos e são apagados em até 1 dia.</li>
      </ul>

      <h2>O que não guardamos</h2>
      <ul>
        <li>
          Sua localização no botão &ldquo;Perto de mim&rdquo;: o navegador pede permissão, usamos a posição arredondada (cerca de 100 m)
          só para ordenar a lista e não gravamos nada.
        </li>
        <li>A preferência entre km e milhas fica só no seu navegador.</li>
      </ul>

      <h2>Serviços de terceiros</h2>
      <p>
        Os mapas vêm do OpenStreetMap: para desenhar o mapa, o seu navegador busca as imagens nos servidores deles, que recebem o seu IP.
        O site e o banco de dados ficam em serviços de hospedagem contratados para isso.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados e retirar a autorização que deu a qualquer momento.
      </p>
      <ul>
        <li>
          <strong>Enviou um aviso ou pedido sem conta?</strong>{" "}
          <Link href="/meus-dados" className="font-semibold underline underline-offset-4">Apague seus dados aqui</Link>, confirmando o seu e-mail.
        </li>
        <li>
          <strong>Tem conta?</strong>
          {MARCA.emailPrivacidade
            ? <> Para corrigir dados ou apagar a conta, escreva para <a href={`mailto:${MARCA.emailPrivacidade}`} className="font-semibold underline">{MARCA.emailPrivacidade}</a>.</>
            : " Para corrigir dados ou apagar a conta, use o canal de contato que será informado nesta página."}
        </li>
      </ul>
      <p className="text-sm text-tinta-suave">Última atualização: novembro de 2026.</p>
    </article>
  );
}
