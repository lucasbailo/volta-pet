// Renova a sessão do Supabase a cada requisição, antes de a página ser montada.
// Server Components não conseguem gravar cookies; por isso a renovação acontece aqui.
// A permissão de cada ação continua sendo conferida no servidor (Server Actions e RLS).
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request) {
  let resposta = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return resposta; // modo local: nada a renovar

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista, cabecalhos) {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
        for (const [chaveCabecalho, valor] of Object.entries(cabecalhos ?? {})) resposta.headers.set(chaveCabecalho, valor);
      },
    },
  });
  // Valida o token e, se estiver vencendo, troca por um novo (gravado em setAll).
  await supabase.auth.getClaims();
  return resposta;
}

export const config = {
  // Fora: arquivos estáticos, imagens e o favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};
