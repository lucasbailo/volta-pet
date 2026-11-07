import Link from "next/link";
import { Suspense } from "react";
import { FormEntrar } from "@/components/FormsConta";

export const metadata = { title: "Entrar" };

// Login.  [RF03]
export default function Page({ searchParams }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl font-extrabold">Entrar</h1>
      <Suspense fallback={<div className="mt-8 h-72 animate-pulse rounded-2xl bg-folha" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
      <p className="mt-8 rounded-2xl bg-folha p-5 text-center">
        Ainda não tem conta? <Link href="/cadastro" className="font-semibold underline underline-offset-4">Criar conta</Link>
      </p>
    </div>
  );
}

const MENSAGENS = {
  confirmado: { tipo: "ok", texto: "E-mail confirmado. Entre com a sua senha." },
  link_invalido: { tipo: "erro", texto: "Este link expirou ou já foi usado. Entre com a sua senha ou peça um novo link." },
};

async function Conteudo({ searchParams }) {
  const { proximo, aviso } = await searchParams;
  const m = MENSAGENS[aviso];
  return (
    <div className="mt-8 space-y-6">
      {m && (
        <p role="status" className={`rounded-xl p-3 ${m.tipo === "ok" ? "bg-adocao-claro text-adocao" : "border-l-4 border-alerta bg-alerta-claro"}`}>
          {m.texto}
        </p>
      )}
      <FormEntrar proximo={proximo} />
    </div>
  );
}
