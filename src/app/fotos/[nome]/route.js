// Serve as fotos salvas no modo local (no Supabase, virão do Storage).
import { lerFoto } from "@/lib/dados";

const TIPOS = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };

export async function GET(_req, { params }) {
  const { nome } = await params;
  const bytes = await lerFoto(nome);
  if (!bytes) return new Response("Foto não encontrada", { status: 404 });
  return new Response(bytes, {
    headers: { "Content-Type": TIPOS[nome.split(".").pop()], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
