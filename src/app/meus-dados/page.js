import Link from "next/link";
import FormExcluirDados from "@/components/FormExcluirDados";

export const metadata = { title: "Apagar meus dados" };

// Exclusão dos dados de quem enviou aviso ou pedido sem conta.  [RN03, RNF03]
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-8">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Apagar meus dados</h1>
      <p className="mt-3 text-lg">
        Se você enviou um &ldquo;Encontrei o animal&rdquo; ou um &ldquo;Quero adotar&rdquo;, pode apagar o seu nome, contato, mensagem e foto
        a qualquer momento. Apagamos tudo o que foi enviado com o e-mail que você confirmar.
      </p>
      <p className="mt-2 text-tinta-suave">
        Quem já recebeu o seu contato pode ter anotado; se for o caso, peça também a essa pessoa.{" "}
        <Link href="/privacidade" className="underline underline-offset-4">Ler a política de privacidade</Link>.
      </p>
      <div className="mt-8">
        <FormExcluirDados />
      </div>
    </div>
  );
}
