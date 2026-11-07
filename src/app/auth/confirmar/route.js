// Destino dos links enviados pelo Supabase Auth (confirmação de cadastro e nova senha).
// Aceita os dois formatos: ?code= (padrão, PKCE) e ?token_hash=&type= (modelo de e-mail personalizado).
import { NextResponse } from "next/server";
import { confirmarSessao } from "@/lib/dados";

const TIPOS = ["signup", "recovery", "email", "email_change", "invite", "magiclink"];

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type");
  const proximo = url.searchParams.get("proximo") ?? "/painel";
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/painel"; // só caminhos do site

  const valido = (code || (tokenHash && TIPOS.includes(tipo))) && (await confirmarSessao({ code, tokenHash, tipo }));
  return NextResponse.redirect(new URL(valido ? destino : "/entrar?aviso=link_invalido", url.origin));
}
