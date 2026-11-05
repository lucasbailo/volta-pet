# Especificação do Produto — Plataforma de Pets Desaparecidos e Doação

## 1. Visão geral

A plataforma reúne, em um só site, anúncios de animais desaparecidos, animais encontrados na rua e animais para adoção, com foco em localização. O diferencial é o mapa de busca: a partir do último local visto e do perfil do animal, o sistema desenha zonas onde ele tem mais chance de estar, com base em estudos científicos.

**Problema:** anúncios de pets perdidos e de adoção ficam espalhados em grupos de redes sociais, sem filtro por localização, sem histórico e sem orientação sobre onde procurar.

**Públicos:**

- Tutores que perderam um animal.
- Pessoas que encontraram ou avistaram um animal na rua.
- Pessoas e ONGs que querem doar animais.
- Pessoas interessadas em adotar.

**Escopo geográfico:** a primeira versão atende só o Brasil (estado e cidade), mas o modelo de dados já guarda o país em cada endereço, para permitir outros países no futuro sem refazer o banco.

**Nome e identidade visual:** a definir. Sugestões iniciais para discutir: VoltaPet, Rastro Pet, Patas de Volta, AcheiMeuPet (verificar disponibilidade de domínio e marca).

## 2. Perfis de usuário

O sistema tem quatro perfis; pessoa física e ONG são contas diferentes, com páginas e permissões próprias.

| Perfil | Precisa de conta? | O que pode fazer |
| --- | --- | --- |
| Visitante | Não | Ver os feeds, filtrar, ver mapas, enviar "Encontrei o animal" (com limite), denunciar anúncio |
| Pessoa física | Sim | Tudo do visitante + publicar desaparecido, encontrado e doação; atualizar avistamentos; marcar como encontrado ou adotado; receber contatos |
| ONG | Sim, com validação | Tudo da pessoa física + página pública da ONG, selo de verificada, chave PIX para doações em dinheiro, vínculo de irmãos entre animais |
| Administrador | Sim (interno) | Analisar denúncias, ocultar anúncios, aprovar ONGs, bloquear usuários |

O perfil de administrador não foi citado na ideia original, mas é necessário: alguém precisa revisar denúncias e validar as ONGs antes de dar o selo.

## 3. Módulos e funcionalidades

O site tem cinco módulos: três feeds de anúncios (Desaparecidos, Encontrados e Doação), a área das ONGs e o link da loja de tags.

### 3.1 Localização e feeds

- Filtro em cascata: país (fixo em Brasil na v1), estado e cidade.
- "Perto de você": ordena o feed por distância, usando a localização do dispositivo (com permissão) ou um local digitado pelo usuário.
- Feeds em ordem de publicação, com filtro por espécie: cachorro, gato, pássaro e outros.
- Abas por situação: Ativos, Encontrados (reencontros) e Expirados.

### 3.2 Desaparecidos

O card mostra foto, nome, espécie, raça, porte, cor, sinais particulares, data do desaparecimento, tempo desaparecido ("sumiu há 3 dias"), cidade, recompensa (se houver) e redes sociais do dono.

- O dono marca o último local visto no mapa e escolhe entre **local exato** ou **local aproximado** (o sistema desloca o ponto e mostra uma área, sem revelar o endereço).
- O dono informa o **perfil de saída** do animal (vive só dentro de casa, sai com supervisão, sai sozinho), que define o tamanho das zonas de busca.
- O mapa desenha duas zonas: a interna (mediana) e a externa (onde estão cerca de 75% dos casos). Detalhes na seção 5.
- O dono adiciona **novos avistamentos**; cada um vira um ponto com data no mapa, e as zonas passam a partir do avistamento mais recente.
- Alternância de unidade km/milha na exibição.
- Botão **"Encontrei o animal"** e botão **"Denunciar"** em todo card.
- Quando o animal volta, o dono marca **"Encontrado ✓"** e o anúncio vai para a página de reencontros.

### 3.3 Encontrados (animal achado na rua sem anúncio)

Quem achou ou resgatou um animal publica um card com foto, local, data e se o animal está com ele. Antes de publicar, o sistema mostra desaparecidos parecidos (mesma espécie, perto e recentes) para tentar um casamento direto.

### 3.4 Modal "Encontrei o animal"

- Não exige conta. Campos: nome, contato (telefone ou e-mail), local onde viu no mapa, data e hora, foto opcional, e a opção "vi o animal" ou "o animal está comigo".
- Caixa de consentimento obrigatória para repassar o contato ao dono (regra na seção 5).
- Disclaimer antigolpe visível antes do envio.
- Depois do envio, convite opcional para criar conta.

### 3.5 Doação

O card mostra foto, nome, espécie, raça, idade, porte, sexo, vacinado, castrado, vermifugado, temperamento (convive com crianças, gatos, cães), cidade e redes sociais do doador.

- Botão **"Quero adotar"** abre um formulário de interesse que vai para o doador; o doador decide quem contatar.
- Quando o animal é adotado, o doador marca **"Adotado ✓"**.

### 3.6 ONGs

- Conta própria com CNPJ, página pública com todos os animais, selo de verificada (após aprovação do administrador) e chave PIX para doações em dinheiro.
- **Irmãos para adoção conjunta:** a ONG vincula animais como irmãos, e o card mostra "tem 2 irmãos disponíveis" com link para eles.

### 3.7 Loja de tags

Na v1, um link para a loja externa. Opção em estudo: tag com QR Code que abre a página do pet no site; se o pet estiver desaparecido, a página mostra o anúncio e o botão "Encontrei o animal".

## 4. Requisitos funcionais

São 24 requisitos; a prioridade separa o que entra na entrega do Projeto Integrador (Alta) do que pode ficar como trabalho futuro (Baixa).

| ID | Requisito | Perfil | Prioridade |
| --- | --- | --- | --- |
| RF01 | Cadastrar conta de pessoa física (nome, e-mail, senha, telefone, cidade, redes sociais opcionais) | Visitante | Alta |
| RF02 | Cadastrar conta de ONG (dados da PF + CNPJ, descrição, chave PIX) | Visitante | Alta |
| RF03 | Fazer login, logout e recuperar senha | Todos | Alta |
| RF04 | Filtrar feeds por país, estado e cidade | Todos | Alta |
| RF05 | Ordenar feed por proximidade (GPS ou local manual) | Todos | Média |
| RF06 | Filtrar feeds por espécie | Todos | Alta |
| RF07 | Publicar anúncio de desaparecido com fotos, perfil de saída e último local (exato ou aproximado) | PF, ONG | Alta |
| RF08 | Exibir mapa com zonas de busca calculadas pela espécie e perfil | Todos | Alta |
| RF09 | Alternar unidade de distância entre km e milha | Todos | Baixa |
| RF10 | Adicionar avistamentos ao anúncio e recalcular as zonas | Dono do anúncio | Média |
| RF11 | Enviar "Encontrei o animal" sem conta, com consentimento | Todos | Alta |
| RF12 | Notificar o dono sobre novos avisos (no site e por e-mail) | Sistema | Alta |
| RF13 | Publicar anúncio de animal encontrado na rua | PF, ONG | Alta |
| RF14 | Sugerir desaparecidos parecidos ao publicar um encontrado | Sistema | Média |
| RF15 | Publicar anúncio de doação | PF, ONG | Alta |
| RF16 | Enviar formulário "Quero adotar" ao doador | Todos | Alta |
| RF17 | Marcar anúncio como Encontrado ou Adotado | Dono do anúncio | Alta |
| RF18 | Exibir página de reencontros | Todos | Média |
| RF19 | Expirar anúncios e pedir confirmação ao dono | Sistema | Média |
| RF20 | Denunciar anúncio e exibir selo "Denunciado, em análise" | Todos | Alta |
| RF21 | Moderar denúncias, ocultar anúncios e bloquear usuários | Administrador | Média |
| RF22 | Aprovar ONG e conceder selo de verificada | Administrador | Média |
| RF23 | Vincular animais da ONG como irmãos | ONG | Baixa |
| RF24 | Exibir link da loja de tags | Todos | Baixa |

## 5. Regras de negócio

### RN01 – Zonas de busca

Cada zona sai de um estudo; a zona interna é a mediana (metade dos animais foi achada ali dentro) e a externa é o percentil 75.

| Espécie e perfil | Zona interna | Zona externa | Fonte |
| --- | --- | --- | --- |
| Gato que vive só dentro de casa | 39 m | 137 m | [Huang et al., 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5789300) |
| Gato que sai sozinho | 300 m | 1.609 m | [Huang et al., 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5789300) |
| Gato com perfil desconhecido | 50 m | 500 m | [Huang et al., 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5789300) |
| Cão | 122 m (42% dos casos) | 1.609 m (70% dos casos) | [Kremer, 2021](https://www.frontiersin.org/articles/10.3389/fvets.2021.669428/full#h5) |
| Pássaros e outros | Sem zona | Sem zona | Mostrar só o ponto |

- Os valores de gatos vêm de um estudo com 1.210 gatos perdidos; o mesmo estudo recomenda busca de até 200 m para gatos que vivem dentro de casa e até 2 km para os que saem sozinhos.
- Para cães, o estudo de Kremer (2021), publicado na Frontiers in Veterinary Science, analisou cães recolhidos pelo abrigo de Dallas (EUA): 42% estavam a menos de 400 pés (cerca de 122 m) de casa e 70% a menos de 1 milha (1.609 m). Como os percentuais não são mediana e percentil 75, as zonas de cães usam esses dois cortes, e o mapa informa o percentual de cada zona. Os dados vêm de uma única cidade; vale citar essa limitação no artigo.
- Os valores ficam numa tabela de configuração do banco, não no código, para serem ajustados sem nova versão.

### RN02 – Expiração de anúncios de desaparecidos

No mesmo estudo, 34% dos gatos foram achados vivos até o dia 7, 50% até o dia 30 e 56% até o dia 61, com pouco aumento depois disso.

1. No dia 30, o dono recebe um lembrete para atualizar o anúncio.
2. No dia 60, o anúncio vai para a aba Expirados e o dono é perguntado se ainda procura; se sim, renova por mais 60 dias.
3. Sem resposta, o anúncio é removido 180 dias depois de expirar.

Anúncios de doação expiram em 60 dias; o criador pode renovar por mais 60 dias sempre que quiser. Sem renovação, seguem a mesma regra de remoção do passo 3.

### RN03 – Dados de quem encontrou (LGPD)

- O contato de quem envia "Encontrei o animal" **nunca aparece no card público**; ele vai só para o dono, por notificação no site e por e-mail.
- O envio exige marcar a caixa "Autorizo repassar meu contato ao responsável pelo anúncio".
- Quem enviou pode pedir a exclusão dos seus dados a qualquer momento.

### RN04 – Privacidade do local

No modo "local aproximado", o ponto público é deslocado aleatoriamente entre 50 e 150 m do ponto real.

- Sem zonas de busca (pássaros e outros), o mapa mostra uma área em volta do ponto deslocado, não um pino.
- Com zonas de busca, o público vê as zonas a partir do ponto deslocado, e o mapa avisa que o centro pode estar até 150 m fora do local real.
- O ponto exato fica guardado à parte e só o dono o vê; para ele, as zonas partem do ponto exato.

### RN05 – Antigolpe e recompensa

- Disclaimer fixo nos cards com recompensa e no modal: nunca pague nada antes de ver o animal pessoalmente; marque o encontro em local público e vá acompanhado.
- A recompensa é só informativa: o site não intermedeia pagamento.

### RN06 – Denúncias

- Uma denúncia já coloca o selo "Denunciado, em análise" no anúncio e o envia para a fila do administrador.
- O administrador confirma (anúncio ocultado) ou descarta (selo removido); o dono é avisado.
- Risco: com uma única denúncia, alguém mal-intencionado pode marcar anúncios verdadeiros. A revisão rápida do administrador reduz esse risco, e o texto neutro do selo não acusa o dono antes da análise.

### RN07 – Limite de avisos sem conta

- O primeiro aviso sem conta é aceito após confirmar o e-mail com um código.
- Um segundo aviso do mesmo e-mail, telefone ou IP em 30 dias exige criar conta.
- O IP é dado pessoal na LGPD: guardar apenas um hash dele e apagar após 30 dias.

### RN08 – Irmãos

O vínculo é simétrico: se A é irmão de B, B é irmão de A. Quando um irmão é adotado, ele some da lista dos demais.

## 6. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF01 | Layout responsivo, pensado primeiro para celular (a maioria vai acessar na rua) |
| RNF02 | Senhas guardadas com hash; site servido só por HTTPS |
| RNF03 | Adequação à LGPD: consentimento explícito, política de privacidade e exclusão de dados a pedido |
| RNF04 | Fotos comprimidas no envio, com limite de tamanho e de quantidade por anúncio |
| RNF05 | Feed carregado em páginas (rolagem infinita ou paginação) |
| RNF06 | Banco preparado para vários países (país em todo endereço) e textos centralizados para futura tradução |
| RNF07 | Parâmetros de zona e de expiração configuráveis, sem alterar código |
| RNF08 | Acessibilidade básica: contraste, textos alternativos nas fotos, navegação por teclado |
| RNF09 | Código-fonte versionado em repositório público (exigência do manual do Projeto Integrador) |

## 7. Fora do escopo e pendências

**Fica para trabalhos futuros** (entra nas considerações finais do artigo):

- Outros países além do Brasil.
- Pagamento de recompensa ou doação em dinheiro dentro do site.
- Árvore genealógica completa (pais, avós, primos).
- Venda das tags dentro do site (carrinho e pagamento).
- Aplicativo móvel nativo e notificações push.
- Reconhecimento de animais por foto para casar desaparecidos e encontrados.

**Pendências:**

- [ ] Escolher a tag (com QR Code ou não) e o fornecedor

**A definir, sem bloquear o escopo:**

- [ ] Definir nome, domínio e identidade visual
- [ ] Validar o escopo com o professor orientador

## Fontes

- [Huang, L. et al. Search Methods Used to Locate Missing Cats and Locations Where Missing Cats Are Found. Animals, v. 8, n. 1, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5789300)
- [Kremer, T. A New Web-Based Tool for RTO-Focused Animal Shelter Data Analysis. Frontiers in Veterinary Science, 2021](https://www.frontiersin.org/articles/10.3389/fvets.2021.669428/full#h5)
- [HASS – New Study: Most Lost Dogs Are Found Less Than a Mile From Their Homes (2021)](https://www.humananimalsupportservices.org/blog/help-get-more-lost-dogs-back-to-their-families/)