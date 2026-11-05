import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p aria-hidden="true" className="text-6xl">🐾</p>
      <h1 className="mt-4 text-4xl font-extrabold">Página não encontrada</h1>
      <p className="mt-3 text-lg text-tinta-suave">O anúncio pode ter sido removido ou o endereço está errado.</p>
      <Link href="/desaparecidos" className="botao botao-tinta mt-8">Ver animais desaparecidos</Link>
    </div>
  );
}
