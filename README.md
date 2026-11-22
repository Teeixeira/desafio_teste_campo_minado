# Testes do jogo Campo Minado

Projeto de Campo Minado com tabuleiro de **18 colunas × 14 linhas** e **40 bombas**. A suíte em JavaScript com Jest segue o padrão dos demais desafios: casos sequenciais `CT-XX` que servem de especificação para o professor implementar seu próprio algoritmo. O jogo também pode ser aberto no navegador local para partidas manuais.

## Participantes do grupo

| Nome | RA |
|---|---|
| Leonardo Teixeira de Carvalho | 24159859-2 |
| Matheus Eduardo Polizelli | 24129411-2 |


## Requisitos e execução

Requer Node.js 22 e npm.

```sh
npm install
npm test
```

Para abrir o jogo localmente:

```sh
npm start
```

Acesse [http://127.0.0.1:3005](http://127.0.0.1:3005). Use o botão esquerdo para abrir uma casa e o direito para colocar ou retirar uma bandeira. Abrir uma bomba, inclusive no primeiro clique, encerra a partida sem reposicionar as bombas. O botão de novo jogo cria outra distribuição aleatória.

## Regras cobertas pelos testes

- Dimensões fixas de 14 linhas × 18 colunas, coordenadas iniciadas em zero e exatamente 40 bombas únicas dentro do tabuleiro.
- Contagem das bombas nas oito casas vizinhas, inclusive em cantos e bordas.
- Abrir uma bomba, inclusive no primeiro clique, causa derrota sem reposicionamento; ao perder, as bombas são mostradas e as casas seguras fechadas continuam ocultas.
- Abrir um número revela somente aquela casa; abrir uma casa vazia expande a área conectada. Casas abertas não podem receber bandeira nem ser abertas novamente.
- Bandeiras podem ser colocadas e retiradas, inclusive em casas seguras, e não precisam parar em 40. Marcá-las corretamente não vence: é preciso revelar as 212 casas seguras.
- Partidas encerradas bloqueiam ações e a visão pública não revela bombas escondidas durante o jogo.
- Validação de listas de bombas, ações e coordenadas.

## Identificação dos casos de teste

Cada cenário tem um identificador único no formato **CT-XX**, como nos outros jogos do repositório. O fixture `fixtures/bombas.json` prepara situações controladas de casas específicas. Os casos CT-19 e CT-20 também testam o gerador em 100 distribuições determinísticas, cobrindo repetibilidade por semente, variação entre partidas e presença de bombas em todas as casas, linhas e colunas. A interface usa posições aleatórias e mantém sempre as 40 bombas.

## API esperada pela suíte

Implemente em `src/jogo.js` as funções `criarJogo(opcoes?)`, `executarAcao(estado, acao)` e `obterVisao(estado)`. As ações usam `{ tipo: 'revelar'|'marcar', linha, coluna }`, com linhas de `0` a `13` e colunas de `0` a `17`. `criarJogo` aceita opcionalmente as `bombas` para preparar partidas determinísticas ou uma função `aleatorio` para gerar uma distribuição repetível. Com uma mesma semente/função aleatória, a geração deve reproduzir o campo; sementes diferentes devem poder resultar em campos diferentes. Ações retornam um novo estado sem alterar o anterior.

## Organização

- `tests/jogo.test.js`: casos Jest `CT-01` a `CT-26`.
- `fixtures/bombas.json`: 40 coordenadas fixas usadas nos cenários de teste.
- `src/jogo.js`: motor do jogo importado pela suíte e pela interface.
- `server.js`, `index.html`, `browser.js`, `styles.css`: servidor local e interface do navegador.
