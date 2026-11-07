import Link from "next/link";
import { FormRecuperarSenha } from "@/components/FormsConta";

export const metadata = { title: "Recuperar senha" };

// Pedido de link para criar nova senha.  [RF03]
export default function Page() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl font-extrabold">Esqueci minha senha</h1>
      <p className="mt-2 text-lg text-tinta-suave">Digite o e-mail da sua conta. Enviamos um link para você criar uma nova senha.</p>
      <div className="mt-8">
        <FormRecuperarSenha />
      </div>
      <p className="mt-8 text-center"><Link href="/entrar" className="underline underline-offset-4">Voltar para entrar</Link></p>
    </div>
  );
}
