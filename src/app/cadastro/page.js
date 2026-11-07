import Link from "next/link";
import FormCadastro from "@/components/FormCadastro";
import { listarEstados } from "@/lib/dados";

export const metadata = { title: "Criar conta" };

// Cadastro de pessoa física ou ONG.  [RF01, RF02]
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Criar conta</h1>
      <p className="mt-2 text-lg text-tinta-suave">
        Com a conta você publica anúncios, recebe os avisos de quem viu seu animal e acompanha tudo no painel.
      </p>
      <div className="mt-8">
        <FormCadastro estados={listarEstados()} />
      </div>
      <p className="mt-8 text-center">
        Já tem conta? <Link href="/entrar" className="font-semibold underline underline-offset-4">Entrar</Link>
      </p>
    </div>
  );
}
