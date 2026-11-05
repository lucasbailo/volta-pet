# VoltaPet — contexto para o Claude Code

Projeto Integrador (Programação Web, UNISA — ADS/GTI). Site para anúncios de animais
**desaparecidos**, **encontrados** e **para adoção**, com foco em localização.
Diferencial: mapa com **zonas de busca** baseadas em estudos científicos.
O código-fonte vai para um artigo acadêmico (ABNT), então mantenha-o legível e comentado em português.

Especificação completa (requisitos RF/RNF e regras RN): @docs/especificacao.md
Regras do Next.js 16 instalado: @AGENTS.md

## Comandos
- `npm run dev` — servidor local em http://localhost:3000
- `npm run build` — sempre rode antes de dar uma tarefa por concluída
- `npm run lint` — precisa passar sem erros
- Apagar `.dados-locais/` recria o banco local com os dados de exemplo

## Stack
Next.js 16 (App Router, JavaScript, sem TypeScript) · React 19 · Tailwind 4 · Leaflet + react-leaflet
(OpenStreetMap) · fontes via @fontsource. Futuro: Supabase (Postgres + PostGIS, Auth, Storage) e Vercel.

## Next.js 16 — cuidados (Cache Components está ligado)
- `params` e `searchParams` são Promises: use `await`.
- Leitura de dados, `cookies()`, `headers()` e `new Date()`/`Date.now()` em Server Components:
  chame `await connection()` e deixe o componente dentro de `<Suspense>` (padrão: página fina + componente async interno).
- Leaflet só no navegador: importar via `next/dynamic` com `ssr: false` dentro de um Client Component (ver `src/components/Mapa.js`).
- Em dúvida, leia `node_modules/next/dist/docs/`.

## Arquitetura
- `src/app/` — páginas; `src/app/acoes.js` — Server Actions (validação + regras do servidor)
- `src/components/` — UI (cards, filtros, mapas, modais, formulários)
- `src/lib/regras.js` — zonas de busca (RN01), prazos (RN02), rótulos
- `src/lib/geo.js`, `src/lib/formatacao.js` — distância (Haversine), fuso America/Sao_Paulo, km/milhas
- `src/lib/dados/` — **única porta de acesso a dados**. Telas e ações importam de `@/lib/dados`, nunca de `local.js`.
  - `local.js`: implementação atual em arquivo JSON (`.dados-locais/banco.json`) e fotos em `.dados-locais/fotos`.
  - Para o Supabase: criar `supabase.js` com **as mesmas funções exportadas** e trocar a linha em `index.js`.
- `banco/` — SQL do Supabase pronto e testado (schema, RLS, funções, storage, cron, seeds, 5.571 cidades) e `diagrama.dbml`.
  As funções do SQL espelham `local.js` (ex.: `definir_local`, `zonas_do_anuncio`, `pode_enviar_aviso_anonimo`).

## Regras de negócio que não podem quebrar
- RN01 zonas: gato só dentro de casa 39 m/137 m; gato sai sozinho 300 m/1.609 m; gato geral 50/500 (Huang et al., 2018);
  cão 122 m (42%)/1.609 m (70%) (Kremer, 2021). Pássaros/outros sem zona. Zonas partem do avistamento mais recente.
- RN02: anúncios valem 60 dias, lembrete no dia 30, depois vão para "Expirados"; removidos 180 dias após expirar. Renovação +60.
- RN03/LGPD: contato de quem envia "Encontrei o animal" ou "Quero adotar" só vai ao dono do anúncio e exige consentimento.
- RN04: "local aproximado" desloca o ponto público 50–150 m; o ponto exato só o dono vê (no banco: tabela separada).
- RN05: recompensa é só informativa; avisos antigolpe nos cards e modais.
- RN06: uma denúncia já mostra "Denunciado, em análise" e vai para o administrador.
- RN07: sem conta, 1 aviso por e-mail/telefone/IP a cada 30 dias, com código de 6 dígitos; IP guardado só como hash, por 30 dias.
- RN08: irmãos são vínculo simétrico; adotados somem da lista.
- Status do anúncio, selo de denúncia e validade nunca são alterados direto pelo usuário — só por funções do servidor.

## Convenções
- Nomes de arquivos, funções, variáveis e textos em **português**; textos da interface em pt-BR, voz ativa, botões dizem o que fazem.
- Datas exibidas sempre com `timeZone: "America/Sao_Paulo"` (usar `src/lib/formatacao.js`).
- Cores e fontes: tokens em `src/app/globals.css` (`tinta`, `papel`, `cartaz` = desaparecido, `achado` = encontrado,
  `adocao` = adoção, `alerta`). Classes utilitárias: `.botao`, `.campo`, `.rotulo`, `.pilula`, `.modal`.
- Acessibilidade: rótulos ligados aos campos, `aria-invalid` em erros, foco visível, navegação por teclado.
- Comente requisitos nas funções (ex.: `// RF10`, `// RN04`) para facilitar o artigo.

## Modo local
Botão "Modo local" no cabeçalho alterna entre Ana (pessoa, admin), a ONG Patas Unidas e visitante sem conta
(cookie `modo_local` = `ana` | `ong` | `visitante`). Use o perfil da ONG para testar irmãos e a página da ONG.
O código de verificação aparece na tela fora de produção. Login real (`/entrar`) chega com o Supabase.

## Feito
- Página pública da ONG (`/ong/[id]`), lista de ONGs verificadas (`/ongs`) e tela para vincular irmãos
  (`/anuncio/[id]/irmaos`, RF23). Vínculo par a par, igual a `vincular_irmaos`/`desvincular_irmaos` do SQL.
- Moderação (`/admin`, só admin): fila de denúncias (confirmar oculta o anúncio; descartar tira o selo se não houver
  outra pendente) e aprovação de ONGs (RF21, RF22). Espelha `revisar_denuncia` e `revisar_ong`. O painel lista as
  novidades por tipo (aviso, pedido, lembrete, expirado, denúncia confirmada/descartada).
- LGPD: `/privacidade` (prazos lidos de `regras.js`) e `/meus-dados`, onde quem enviou aviso/pedido sem conta
  confirma o e-mail com código e apaga avisos, pedidos, fotos e notificações ligadas (RN03, RNF03).
- Foto opcional no "Encontrei o animal" (comprimida no navegador por `src/lib/fotos.js`; apagada se o aviso for recusado).
- RF14 antes de publicar: o formulário mostra desaparecidos parecidos assim que espécie e ponto são marcados.

## Próximos passos (em ordem)
1. Supabase: `src/lib/dados/supabase.js`, Auth (cadastro/login, RF01–RF03), Storage para fotos (fotos de aviso em
   bucket privado), e-mail do código e notificações (RF12). Junto: bloquear usuários (resto do RF21), que exige
   coluna em `perfis`, função no SQL e checagem nas ações de publicar/enviar.
2. GitHub + Vercel (variáveis de ambiente; chave secreta nunca com prefixo `NEXT_PUBLIC_`).
3. Pendências de produto: nome/identidade definitivos, escolha da tag (com QR Code?), link da loja e
   e-mail de privacidade (`emailPrivacidade`) em `src/lib/marca.js`.
