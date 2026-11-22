export const LINHAS = 14;
export const COLUNAS = 18;
export const TOTAL_BOMBAS = 40;

const copiar = (valor) => structuredClone(valor);
const chave = (linha, coluna) => `${linha},${coluna}`;
const dentro = (linha, coluna) => Number.isInteger(linha) && Number.isInteger(coluna) && linha >= 0 && linha < LINHAS && coluna >= 0 && coluna < COLUNAS;
const vizinhos = (linha, coluna) => {
  const lista = [];
  for (let dl = -1; dl <= 1; dl++) for (let dc = -1; dc <= 1; dc++) {
    if (dl === 0 && dc === 0) continue;
    const l = linha + dl, c = coluna + dc;
    if (dentro(l, c)) lista.push({ linha: l, coluna: c });
  }
  return lista;
};
const erro = (codigo, mensagem = codigo) => Object.assign(new Error(mensagem), { code: codigo });

function validarBombas(bombas) {
  if (!Array.isArray(bombas)) throw new TypeError('bombas deve ser uma lista de coordenadas');
  if (bombas.length !== TOTAL_BOMBAS) throw erro('QUANTIDADE_BOMBAS_INVALIDA', `O tabuleiro deve ter exatamente ${TOTAL_BOMBAS} bombas`);
  const vistas = new Set();
  for (const pos of bombas) {
    if (!pos || typeof pos !== 'object' || Array.isArray(pos)) throw new TypeError('cada bomba deve ter linha e coluna');
    if (!Number.isInteger(pos.linha) || !Number.isInteger(pos.coluna)) throw new TypeError('coordenadas devem ser inteiras');
    if (!dentro(pos.linha, pos.coluna)) throw new RangeError('bomba fora do tabuleiro');
    const k = chave(pos.linha, pos.coluna);
    if (vistas.has(k)) throw erro('BOMBA_DUPLICADA', 'Duas bombas não podem ocupar a mesma casa');
    vistas.add(k);
  }
}

function gerarBombas(aleatorio = Math.random) {
  if (typeof aleatorio !== 'function') throw new TypeError('aleatorio deve ser uma função');
  const casas = Array.from({ length: LINHAS * COLUNAS }, (_, i) => i);
  for (let i = casas.length - 1; i > 0; i--) {
    const valor = aleatorio();
    if (typeof valor !== 'number' || valor < 0 || valor >= 1) throw new RangeError('aleatorio deve retornar um número entre 0 e 1');
    const j = Math.floor(valor * (i + 1));
    [casas[i], casas[j]] = [casas[j], casas[i]];
  }
  return casas.slice(0, TOTAL_BOMBAS).map((i) => ({ linha: Math.floor(i / COLUNAS), coluna: i % COLUNAS }));
}

export function criarJogo(opcoes = {}) {
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) throw new TypeError('opções inválidas');
  const bombas = opcoes.bombas === undefined ? gerarBombas(opcoes.aleatorio) : copiar(opcoes.bombas);
  validarBombas(bombas);
  return {
    linhas: LINHAS, colunas: COLUNAS, totalBombas: TOTAL_BOMBAS,
    bombas, reveladas: [], bandeiras: [],
    estado: 'em_andamento', resultado: null,
  };
}

function contarVizinhas(estado, linha, coluna) {
  const minas = new Set(estado.bombas.map((b) => chave(b.linha, b.coluna)));
  return vizinhos(linha, coluna).filter((v) => minas.has(chave(v.linha, v.coluna))).length;
}

function revelarArea(estado, inicio) {
  const minas = new Set(estado.bombas.map((b) => chave(b.linha, b.coluna)));
  const reveladas = new Set(estado.reveladas.map((v) => chave(v.linha, v.coluna)));
  const marcadas = new Set(estado.bandeiras.map((v) => chave(v.linha, v.coluna)));
  const fila = [inicio];
  while (fila.length) {
    const pos = fila.shift(), k = chave(pos.linha, pos.coluna);
    if (reveladas.has(k) || marcadas.has(k) || minas.has(k)) continue;
    reveladas.add(k);
    if (contarVizinhas(estado, pos.linha, pos.coluna) === 0) {
      for (const v of vizinhos(pos.linha, pos.coluna)) if (!reveladas.has(chave(v.linha, v.coluna))) fila.push(v);
    }
  }
  estado.reveladas = [...reveladas].map((k) => { const [linha, coluna] = k.split(',').map(Number); return { linha, coluna }; });
}

export function executarAcao(estado, acao) {
  if (!estado || typeof estado !== 'object' || !acao || typeof acao !== 'object') throw new TypeError('estado e ação são obrigatórios');
  if (estado.estado !== 'em_andamento') throw erro('JOGO_ENCERRADO', 'A partida já terminou');
  if (!['revelar', 'marcar'].includes(acao.tipo)) throw erro('ACAO_DESCONHECIDA', 'Ação desconhecida');
  if (!Number.isInteger(acao.linha) || !Number.isInteger(acao.coluna)) throw new TypeError('coordenadas devem ser inteiras');
  if (!dentro(acao.linha, acao.coluna)) throw new RangeError('coordenada fora do tabuleiro');

  const proximo = copiar(estado), pos = { linha: acao.linha, coluna: acao.coluna }, k = chave(pos.linha, pos.coluna);
  const minas = new Set(proximo.bombas.map((b) => chave(b.linha, b.coluna)));
  const reveladas = new Set(proximo.reveladas.map((v) => chave(v.linha, v.coluna)));
  const marcadas = new Set(proximo.bandeiras.map((v) => chave(v.linha, v.coluna)));

  if (acao.tipo === 'marcar') {
    if (reveladas.has(k)) throw erro('CASA_ABERTA', 'Não é possível marcar uma casa já aberta');
    proximo.bandeiras = marcadas.has(k)
      ? proximo.bandeiras.filter((v) => chave(v.linha, v.coluna) !== k)
      : [...proximo.bandeiras, pos];
    return proximo;
  }
  if (reveladas.has(k) || marcadas.has(k)) return proximo;

  if (minas.has(k)) {
    proximo.reveladas = [...proximo.reveladas, pos];
    proximo.estado = 'derrota'; proximo.resultado = 'derrota';
  } else {
    revelarArea(proximo, pos);
    if (proximo.reveladas.length === LINHAS * COLUNAS - TOTAL_BOMBAS) {
      proximo.estado = 'vitoria'; proximo.resultado = 'vitoria';
    }
  }
  return proximo;
}

export function obterVisao(estado) {
  const minas = new Set(estado.bombas.map((b) => chave(b.linha, b.coluna)));
  const reveladas = new Set(estado.reveladas.map((v) => chave(v.linha, v.coluna)));
  const bandeiras = new Set(estado.bandeiras.map((v) => chave(v.linha, v.coluna)));
  const exibirMinas = estado.estado === 'derrota';
  return {
    linhas: LINHAS, colunas: COLUNAS, totalBombas: TOTAL_BOMBAS,
    bandeiras: estado.bandeiras.length, restantes: TOTAL_BOMBAS - estado.bandeiras.length,
    estado: estado.estado, resultado: estado.resultado,
    tabuleiro: Array.from({ length: LINHAS }, (_, linha) => Array.from({ length: COLUNAS }, (_, coluna) => {
      const k = chave(linha, coluna), revelada = reveladas.has(k), bomba = minas.has(k);
      return {
        linha, coluna, revelada, marcada: bandeiras.has(k),
        numero: revelada && !bomba ? contarVizinhas(estado, linha, coluna) : null,
        bomba: (revelada && bomba) || (exibirMinas && bomba),
      };
    })),
  };
}
