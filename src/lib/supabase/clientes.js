// Clientes do Supabase usados no servidor.
//  - clienteUsuario: age em nome de quem está logado (sessão nos cookies). O RLS do banco vale.
//  - clienteServico: usa a chave secreta e ignora o RLS. Só para o que o servidor precisa
//    fazer sozinho: gravar avisos/pedidos/denúncias, códigos de verificação e fotos privadas.
import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const CHAVE_SECRETA = process.env.SUPABASE_SECRET_KEY;

export async function clienteUsuario() {
  // A sessão é sempre da requisição atual, e o Supabase Auth lê o relógio para checar o token.
  // connection() avisa o Next 16 (Cache Components) que isso não pode ser pré-renderizado.
  await connection();
  const loja = await cookies();
  return createServerClient(SUPABASE_URL, CHAVE_PUBLICA, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll(lista) {
        // Em Server Components não dá para gravar cookies; o proxy.js renova a sessão nesses casos.
        try {
          for (const { name, value, options } of lista) loja.set(name, value, options);
        } catch {}
      },
    },
  });
}

let servico;
export function clienteServico() {
  if (!CHAVE_SECRETA) throw new Error("Defina SUPABASE_SECRET_KEY no .env.local.");
  servico ??= createClient(SUPABASE_URL, CHAVE_SECRETA, { auth: { persistSession: false, autoRefreshToken: false } });
  return servico;
}
