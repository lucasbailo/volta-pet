import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { FormNovaSenha } from "@/components/FormsConta";
import { obterUsuarioAtual } from "@/lib/dados";

export const metadata = { title: "Nova senha" };

// Chega aqui pelo link do e-mail de recuperação, que já abre uma sessão.  [RF03]
export default function Page() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl font-extrabold">Criar nova senha</h1>
      <Suspense fallback={<div className="mt-8 h-60 animate-pulse rounded-2xl bg-folha" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  await connection();
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    return (
      <p className="mt-6 text-lg">
        O link expirou ou já foi usado. <Link href="/recuperar-senha" className="font-semibold underline underline-offset-4">Peça um novo link</Link>.
      </p>
    );
  }
  return (
    <div className="mt-8">
      <FormNovaSenha />
    </div>
  );
}
