export const metadata = { title: "Entrar" };

// Login e cadastro chegam junto com o Supabase Auth.
export default function Page() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-4xl font-extrabold">Entrar ou criar conta</h1>
      <p className="mt-4 text-lg text-tinta-suave">
        O cadastro será ativado quando o site estiver conectado ao Supabase. No modo local, use o botão no topo da página para alternar entre a conta de demonstração e um visitante.
      </p>
    </div>
  );
}
