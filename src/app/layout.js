import "./globals.css";
import Cabecalho from "@/components/Cabecalho";
import Rodape from "@/components/Rodape";
import { UnidadeProvider } from "@/components/Unidade";
import { MARCA } from "@/lib/marca";

export const metadata = {
  title: { default: `${MARCA.nome}: animais perdidos, achados e para adoção`, template: `%s | ${MARCA.nome}` },
  description: MARCA.slogan,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-tinta focus:px-4 focus:py-2 focus:text-white">
          Pular para o conteúdo
        </a>
        <UnidadeProvider>
          <Cabecalho />
          <main id="conteudo" className="flex-1">{children}</main>
          <Rodape />
        </UnidadeProvider>
      </body>
    </html>
  );
}
