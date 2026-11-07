// Envio de e-mails do site pelo Resend (código de verificação e avisos ao dono).  [RF12, RN07]
// Sem RESEND_API_KEY o envio é ignorado: em desenvolvimento o código aparece na tela.
import "server-only";
import { MARCA } from "./marca";

const REMETENTE = process.env.EMAIL_REMETENTE ?? `${MARCA.nome} <nao-responda@voltapet.lucasbailo.com>`;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const emailConfigurado = () => Boolean(process.env.RESEND_API_KEY);

// Devolve true se o Resend aceitou a mensagem. Erros são registrados, não lançados:
// um e-mail que falha não deve desfazer o aviso já gravado.
export async function enviarEmail({ para, assunto, texto }) {
  if (!emailConfigurado()) return false;
  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: REMETENTE, to: [para], subject: assunto, text: texto }),
    });
    if (!resposta.ok) console.error("Resend recusou o e-mail:", resposta.status, await resposta.text());
    return resposta.ok;
  } catch (erro) {
    console.error("Falha ao enviar e-mail:", erro);
    return false;
  }
}

const rodape = `\n\n—\n${MARCA.nome} · ${SITE_URL}\nNunca pague nada antes de ver o animal pessoalmente.`;

export function emailCodigo(codigo) {
  return {
    assunto: `Seu código: ${codigo}`,
    texto: `Seu código de confirmação é ${codigo}.\n\nEle vale por 15 minutos. Se não foi você que pediu, ignore este e-mail.${rodape}`,
  };
}

// O e-mail não leva o contato de quem enviou: ele fica só no painel (RN03).
export function emailNovidade(tipo, nomeAnimal) {
  const aviso = tipo === "aviso_encontrei";
  return {
    assunto: aviso ? `Novo aviso sobre ${nomeAnimal}` : `Novo pedido de adoção para ${nomeAnimal}`,
    texto: `${aviso ? `Alguém enviou um aviso sobre ${nomeAnimal}.` : `Alguém quer adotar ${nomeAnimal}.`}\n\n`
      + `Veja a mensagem e o contato no seu painel: ${SITE_URL}/painel${rodape}`,
  };
}
