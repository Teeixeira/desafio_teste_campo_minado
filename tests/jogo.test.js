import { readFileSync } from 'node:fs';
import { expect, test } from '@jest/globals';
import { COLUNAS, LINHAS, TOTAL_BOMBAS, criarJogo, executarAcao, obterVisao } from '../src/jogo.js';

const bombasFixture = JSON.parse(readFileSync(new URL('../fixtures/bombas.json', import.meta.url), 'utf8'));
const copiar = (valor) => structuredClone(valor);
const novo = (bombas = bombasFixture) => criarJogo({ bombas: copiar(bombas) });
const revelar = (estado, linha, coluna) => executarAcao(estado, { tipo: 'revelar', linha, coluna });
const marcar = (estado, linha, coluna) => executarAcao(estado, { tipo: 'marcar', linha, coluna });
const chaves = (posicoes) => new Set(posicoes.map(({ linha, coluna }) => `${linha},${coluna}`));
const aleatorioComSemente = (semente) => () => {
  semente = (semente * 1664525 + 1013904223) >>> 0;
  return semente / 0x100000000;
};

function bombasComContagemControlada(alvos, bombasFixas = []) {
  const protegidas = new Set();
  for (const { linha, coluna } of alvos) {
    for (let dl = -1; dl <= 1; dl++) for (let dc = -1; dc <= 1; dc++) {
      const l = linha + dl, c = coluna + dc;
      if (l >= 0 && l < LINHAS && c >= 0 && c < COLUNAS) protegidas.add(`${l},${c}`);
    }
  }
  const resultado = copiar(bombasFixas), usadas = chaves(resultado);
  for (let linha = 0; linha < LINHAS && resultado.length < TOTAL_BOMBAS; linha++) {
    for (let coluna = 0; coluna < COLUNAS && resultado.length < TOTAL_BOMBAS; coluna++) {
      const k = `${linha},${coluna}`;
      if (!protegidas.has(k) && !usadas.has(k)) { resultado.push({ linha, coluna }); usadas.add(k); }
    }
  }
  return resultado;
}

test('CT-01 — criar tabuleiro de 14 linhas por 18 colunas com 40 bombas', () => {
  const estado = criarJogo({ bombas: copiar(bombasFixture) });
  expect(estado).toMatchObject({ linhas: 14, colunas: 18, totalBombas: 40, estado: 'em_andamento', resultado: null });
  expect(estado.bombas).toHaveLength(40);
  expect(estado.reveladas).toEqual([]);
  expect(estado.bandeiras).toEqual([]);
});

test('CT-02 — criar partida padrão com 40 posições de bomba únicas dentro dos limites', () => {
  const estado = criarJogo({ aleatorio: () => 0.37 });
  expect(estado.bombas).toHaveLength(TOTAL_BOMBAS);
  expect(chaves(estado.bombas).size).toBe(TOTAL_BOMBAS);
  for (const { linha, coluna } of estado.bombas) {
    expect(linha).toBeGreaterThanOrEqual(0); expect(linha).toBeLessThan(LINHAS);
    expect(coluna).toBeGreaterThanOrEqual(0); expect(coluna).toBeLessThan(COLUNAS);
  }
});

test('CT-03 — copiar as bombas de entrada sem alterar o fixture recebido', () => {
  const entrada = copiar(bombasFixture), antes = copiar(entrada);
  const estado = criarJogo({ bombas: entrada });
  expect(entrada).toEqual(antes);
  estado.bombas[0].linha = 13;
  expect(entrada).toEqual(antes);
});

test('CT-04 — rejeitar lista com quantidade de bombas diferente de 40', () => {
  expect(() => criarJogo({ bombas: bombasFixture.slice(1) })).toThrow(expect.objectContaining({ code: 'QUANTIDADE_BOMBAS_INVALIDA' }));
  expect(() => criarJogo({ bombas: [...bombasFixture, { linha: 13, coluna: 17 }] })).toThrow(expect.objectContaining({ code: 'QUANTIDADE_BOMBAS_INVALIDA' }));
});

test('CT-05 — rejeitar bombas repetidas, fora do tabuleiro ou com coordenadas inválidas', () => {
  const repetida = copiar(bombasFixture); repetida[39] = copiar(repetida[0]);
  expect(() => criarJogo({ bombas: repetida })).toThrow(expect.objectContaining({ code: 'BOMBA_DUPLICADA' }));
  for (const pos of [{ linha: -1, coluna: 0 }, { linha: 14, coluna: 0 }, { linha: 0, coluna: 18 }]) {
    const lista = copiar(bombasFixture); lista[0] = pos;
    expect(() => criarJogo({ bombas: lista })).toThrow(RangeError);
  }
  const fracionaria = copiar(bombasFixture); fracionaria[0].coluna = 1.5;
  expect(() => criarJogo({ bombas: fracionaria })).toThrow(TypeError);
});

test('CT-06 — bomba no primeiro clique causa derrota sem reposicionar nenhuma bomba', () => {
  const antes = novo();
  const depois = revelar(antes, 0, 0);
  expect(depois).toMatchObject({ estado: 'derrota', resultado: 'derrota' });
  expect(depois.reveladas).toContainEqual({ linha: 0, coluna: 0 });
  expect(depois.bombas).toEqual(antes.bombas);
  expect(obterVisao(depois).tabuleiro.flat().filter((c) => c.bomba)).toHaveLength(40);
});

test('CT-07 — calcular corretamente as vizinhas em cantos, bordas, centro e áreas vazias', () => {
  const alvos = [{ linha: 0, coluna: 0 }, { linha: 0, coluna: 7 }, { linha: 7, coluna: 7 }, { linha: 13, coluna: 17 }];
  const bombas = bombasComContagemControlada(alvos, [
    { linha: 0, coluna: 1 },
    { linha: 1, coluna: 6 }, { linha: 1, coluna: 7 }, { linha: 0, coluna: 8 },
    { linha: 6, coluna: 6 }, { linha: 6, coluna: 7 }, { linha: 7, coluna: 8 }, { linha: 8, coluna: 8 },
  ]);
  const esperados = [[0, 0, 1], [0, 7, 3], [7, 7, 4], [13, 17, 0]];
  for (const [linha, coluna, numero] of esperados) {
    let estado = novo(bombas);
    estado = revelar(estado, linha, coluna);
    expect(obterVisao(estado).tabuleiro[linha][coluna].numero).toBe(numero);
  }
});

test('CT-08 — revelar casa segura e mostrar o número correto sem expor bombas ocultas', () => {
  let estado = novo();
  estado = revelar(estado, 2, 4);
  const tela = obterVisao(estado);
  expect(tela.tabuleiro[2][4]).toMatchObject({ revelada: true, marcada: false, numero: 4, bomba: false });
  expect(tela.tabuleiro[0][0]).toMatchObject({ revelada: false, bomba: false, numero: null });
});

test('CT-09 — marcar e desmarcar casa com bandeira sem revelar seu conteúdo', () => {
  let estado = novo();
  estado = marcar(estado, 0, 0);
  expect(obterVisao(estado).tabuleiro[0][0]).toMatchObject({ marcada: true, revelada: false, bomba: false });
  expect(obterVisao(estado)).toMatchObject({ bandeiras: 1, restantes: 39 });
  estado = marcar(estado, 0, 0);
  expect(obterVisao(estado)).toMatchObject({ bandeiras: 0, restantes: 40 });
});

test('CT-10 — não revelar casa marcada até que a bandeira seja removida', () => {
  let estado = marcar(novo(), 13, 17);
  estado = revelar(estado, 13, 17);
  expect(estado.reveladas).toEqual([]);
  estado = marcar(estado, 13, 17);
  estado = revelar(estado, 13, 17);
  expect(estado.reveladas.length).toBeGreaterThan(0);
});

test('CT-11 — revelar casa vazia abre a área contígua e os números que a delimitam', () => {
  const estado = revelar(novo(), 13, 17);
  const tela = obterVisao(estado);
  expect(estado.reveladas.length).toBeGreaterThan(1);
  expect(tela.tabuleiro[13][17].numero).toBe(0);
  expect(estado.reveladas.some(({ linha, coluna }) => tela.tabuleiro[linha][coluna].numero > 0)).toBe(true);
});

test('CT-12 — revelar bomba após a primeira jogada encerra em derrota e revela as bombas', () => {
  let estado = revelar(novo(), 2, 4);
  estado = revelar(estado, 0, 1);
  expect(estado).toMatchObject({ estado: 'derrota', resultado: 'derrota' });
  const tela = obterVisao(estado);
  expect(tela.tabuleiro[0][1]).toMatchObject({ revelada: true, bomba: true });
  expect(tela.tabuleiro[0][0].bomba).toBe(true);
  expect(tela.tabuleiro.flat().filter((c) => c.bomba)).toHaveLength(40);
  expect(tela.tabuleiro[13][17].numero).toBeNull();
});

test('CT-13 — vitória ocorre quando todas as 212 casas sem bomba são reveladas', () => {
  const bombas = novo().bombas;
  const minas = chaves(bombas);
  let estado = novo(bombas);
  for (let linha = 13; linha >= 0 && estado.estado === 'em_andamento'; linha--) {
    for (let coluna = 17; coluna >= 0 && estado.estado === 'em_andamento'; coluna--) {
      if (!minas.has(`${linha},${coluna}`)) estado = revelar(estado, linha, coluna);
    }
  }
  expect(estado).toMatchObject({ estado: 'vitoria', resultado: 'vitoria' });
  expect(estado.reveladas).toHaveLength(LINHAS * COLUNAS - TOTAL_BOMBAS);
});

test('CT-14 — repetir revelação não altera estado nem penaliza o jogador', () => {
  const estado = revelar(novo(), 3, 4);
  expect(revelar(estado, 3, 4)).toEqual(estado);
});

test('CT-15 — bloquear ações depois da vitória ou derrota', () => {
  const bombas = novo().bombas, minas = chaves(bombas);
  let vitoria = novo(bombas);
  for (let linha = 13; linha >= 0 && vitoria.estado === 'em_andamento'; linha--) {
    for (let coluna = 17; coluna >= 0 && vitoria.estado === 'em_andamento'; coluna--) if (!minas.has(`${linha},${coluna}`)) vitoria = revelar(vitoria, linha, coluna);
  }
  expect(() => revelar(vitoria, 13, 17)).toThrow(expect.objectContaining({ code: 'JOGO_ENCERRADO' }));
  let derrota = revelar(novo(), 2, 4);
  derrota = revelar(derrota, 0, 1);
  expect(() => marcar(derrota, 13, 16)).toThrow(expect.objectContaining({ code: 'JOGO_ENCERRADO' }));
});

test('CT-16 — rejeitar ação desconhecida, coordenadas inválidas e estado ausente', () => {
  const estado = novo();
  expect(() => executarAcao(estado, { tipo: 'cavar', linha: 0, coluna: 0 })).toThrow(expect.objectContaining({ code: 'ACAO_DESCONHECIDA' }));
  expect(() => revelar(estado, -1, 0)).toThrow(RangeError);
  expect(() => revelar(estado, 14, 0)).toThrow(RangeError);
  expect(() => revelar(estado, 0, 18)).toThrow(RangeError);
  expect(() => revelar(estado, 1.2, 0)).toThrow(TypeError);
  expect(() => executarAcao(null, { tipo: 'revelar', linha: 0, coluna: 0 })).toThrow(TypeError);
});

test('CT-17 — obter visão em cópia e ocultar posição e número das bombas não reveladas', () => {
  const estado = novo();
  const visao = obterVisao(estado);
  expect(visao.tabuleiro).toHaveLength(14);
  expect(visao.tabuleiro.every((linha) => linha.length === 18)).toBe(true);
  expect(visao.tabuleiro[0][0]).toMatchObject({ revelada: false, marcada: false, numero: null, bomba: false });
  for (const casa of visao.tabuleiro.flat()) expect(casa).toMatchObject({ revelada: false, numero: null, bomba: false });
  visao.tabuleiro[0][0].marcada = true;
  expect(estado.bandeiras).toEqual([]);
});

test('CT-18 — preservar as posições das bombas fornecidas ao abrir uma casa segura', () => {
  const estado = novo();
  const proximo = revelar(estado, 13, 17);
  expect(proximo.bombas).toEqual(estado.bombas);
});

test('CT-19 — mesma semente reproduz o mesmo campo e sementes diferentes variam a distribuição', () => {
  const a = criarJogo({ aleatorio: aleatorioComSemente(2026) });
  const b = criarJogo({ aleatorio: aleatorioComSemente(2026) });
  const c = criarJogo({ aleatorio: aleatorioComSemente(2027) });
  expect(a.bombas).toEqual(b.bombas);
  expect(a.bombas).not.toEqual(c.bombas);
});

test('CT-20 — distribuições aleatórias variadas mantêm 40 bombas únicas e alcançam todo o tabuleiro', () => {
  const linhasComBomba = new Set(), colunasComBomba = new Set(), campos = new Set();
  const frequenciaLinhas = Array(LINHAS).fill(0), frequenciaColunas = Array(COLUNAS).fill(0);
  const frequenciaCasas = Array.from({ length: LINHAS }, () => Array(COLUNAS).fill(0));
  for (let semente = 1; semente <= 100; semente++) {
    const bombas = criarJogo({ aleatorio: aleatorioComSemente(semente) }).bombas;
    expect(bombas).toHaveLength(TOTAL_BOMBAS);
    expect(chaves(bombas).size).toBe(TOTAL_BOMBAS);
    campos.add(bombas.map(({ linha, coluna }) => `${linha},${coluna}`).sort().join('|'));
    for (const { linha, coluna } of bombas) {
      expect(linha).toBeGreaterThanOrEqual(0); expect(linha).toBeLessThan(LINHAS);
      expect(coluna).toBeGreaterThanOrEqual(0); expect(coluna).toBeLessThan(COLUNAS);
      linhasComBomba.add(linha); colunasComBomba.add(coluna);
      frequenciaLinhas[linha]++; frequenciaColunas[coluna]++;
      frequenciaCasas[linha][coluna]++;
    }
  }
  expect(campos.size).toBeGreaterThan(1);
  expect(linhasComBomba.size).toBe(LINHAS);
  expect(colunasComBomba.size).toBe(COLUNAS);
  expect(Math.min(...frequenciaLinhas)).toBeGreaterThan(0);
  expect(Math.min(...frequenciaColunas)).toBeGreaterThan(0);
  expect(Math.min(...frequenciaCasas.flat())).toBeGreaterThan(0);
});

test('CT-21 — marcar as 40 bombas não vence sem revelar as 212 casas seguras', () => {
  let estado = novo();
  for (const bomba of bombasFixture) estado = marcar(estado, bomba.linha, bomba.coluna);
  expect(estado).toMatchObject({ estado: 'em_andamento' });
  expect(estado.reveladas).toHaveLength(0);
  estado = revelar(estado, 13, 17);
  expect(estado).toMatchObject({ estado: 'vitoria', resultado: 'vitoria' });
  expect(estado.reveladas).toHaveLength(212);
  expect(estado.bandeiras).toHaveLength(40);
});

test('CT-22 — permitir mais bandeiras que bombas sem encerrar a partida', () => {
  let estado = novo();
  for (const bomba of bombasFixture) estado = marcar(estado, bomba.linha, bomba.coluna);
  estado = marcar(estado, 13, 17);
  expect(estado.bandeiras).toHaveLength(41);
  expect(estado.estado).toBe('em_andamento');
  expect(estado.reveladas).toHaveLength(0);
  expect(obterVisao(estado).restantes).toBe(-1);
});

test('CT-23 — abrir uma casa numerada revela somente ela e impede marcá-la depois', () => {
  const estado = revelar(novo(), 3, 4);
  expect(estado.reveladas).toHaveLength(1);
  expect(obterVisao(estado).tabuleiro[3][4]).toMatchObject({ revelada: true, numero: 1 });
  expect(() => marcar(estado, 3, 4)).toThrow(expect.objectContaining({ code: 'CASA_ABERTA' }));
});

test('CT-24 — ao perder, mostrar as 40 bombas sem expor casas seguras ainda fechadas', () => {
  let estado = revelar(novo(), 3, 4);
  estado = revelar(estado, 2, 3);
  expect(estado.estado).toBe('derrota');
  const visao = obterVisao(estado);
  expect(visao.tabuleiro.flat().filter((c) => c.bomba)).toHaveLength(40);
  expect(visao.tabuleiro[13][17]).toMatchObject({ revelada: false, bomba: false, numero: null });
});

test('CT-25 — rejeitar coluna ausente ou que não seja um número inteiro', () => {
  for (const coluna of [undefined, '1', 0.5, null]) {
    expect(() => executarAcao(novo(), { tipo: 'revelar', linha: 0, coluna })).toThrow(TypeError);
  }
});

test('CT-26 — executar ação sem alterar o estado anterior nem a ação recebida', () => {
  const estado = novo(), acao = { tipo: 'revelar', linha: 3, coluna: 4 };
  const estadoAntes = copiar(estado), acaoAntes = copiar(acao);
  const proximo = executarAcao(estado, acao);
  expect(estado).toEqual(estadoAntes);
  expect(acao).toEqual(acaoAntes);
  expect(proximo).not.toBe(estado);
});
