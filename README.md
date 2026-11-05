# VoltaPet (nome provisório)

Site de animais desaparecidos, encontrados e para adoção — Projeto Integrador.
Next.js 16 + Tailwind + Leaflet/OpenStreetMap.

## Rodar no seu computador
Requisitos: Node.js LTS (20 ou mais novo).

```bash
npm install
npm run dev
```
Abra http://localhost:3000

## Modo local (sem Supabase)
- Os dados ficam em `.dados-locais/banco.json` (criado na primeira execução, com anúncios de exemplo).
  Para recomeçar do zero, apague a pasta `.dados-locais`.
- O botão **"Modo local"** no topo alterna entre a conta de demonstração (Ana) e um visitante sem conta.
- No aviso "Encontrei o animal" sem conta, o código de verificação aparece na tela (no site publicado ele irá por e-mail).

## Estrutura
- `src/app/` — páginas e `acoes.js` (validação e regras no servidor)
- `src/components/` — cards, filtros, mapas, formulários e modais
- `src/lib/regras.js` — zonas de busca (RN01) e prazos (RN02)
- `src/lib/dados/` — acesso aos dados. Hoje `local.js`; depois `supabase.js`, trocando só `index.js`
- `src/lib/marca.js` — nome do site e link da loja de tags

## Pendências
- Conectar Supabase (login, banco, fotos, e-mails) — o SQL já está pronto na pasta `banco/`
- Publicar na Vercel e versionar no GitHub
- Telas de ONG (página pública, vincular irmãos) e de administração (denúncias, aprovação de ONGs)
