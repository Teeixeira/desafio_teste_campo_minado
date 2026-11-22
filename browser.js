import { criarJogo, executarAcao, obterVisao } from './src/jogo.js';

const $ = (id) => document.getElementById(id);
let jogo = criarJogo();
let segundos = 0;
let iniciou = false;
const grade = $('board');

function desenhar() {
  const visao = obterVisao(jogo);
  $('mine-count').textContent = String(visao.restantes).padStart(3, '0');
  $('face').textContent = visao.estado === 'vitoria' ? '😎' : visao.estado === 'derrota' ? '😵' : iniciou ? '😮' : '🙂';
  $('timer').textContent = String(segundos).padStart(3, '0');
  $('game-message').textContent = visao.estado === 'vitoria' ? 'Campo limpo! Você venceu.' : visao.estado === 'derrota' ? 'Kabum! Uma bomba explodiu. Inicie um novo jogo para tentar novamente.' : iniciou ? 'Use os números para deduzir onde estão as bombas.' : 'Abra uma casa para começar. Uma bomba no primeiro clique encerra a partida.';
  grade.dataset.estado = visao.estado;
  grade.innerHTML = visao.tabuleiro.flat().map((c) => {
    const classes = ['cell'];
    if (c.revelada) classes.push('revealed');
    if (c.marcada) classes.push('flagged');
    if (c.bomba) classes.push('mine');
    if (c.revelada && c.numero) classes.push(`number-${c.numero}`);
    let conteudo = c.marcada && !c.revelada ? '⚑' : c.bomba ? '✹' : c.revelada && c.numero ? String(c.numero) : '';
    const desabilitada = visao.estado !== 'em_andamento' || c.revelada;
    return `<button class="${classes.join(' ')}" type="button" role="gridcell" data-row="${c.linha}" data-col="${c.coluna}" aria-label="Linha ${c.linha + 1}, coluna ${c.coluna + 1}${c.revelada ? c.bomba ? ', bomba' : `, ${c.numero} bombas ao redor` : c.marcada ? ', marcada com bandeira' : ', fechada'}" ${desabilitada ? 'disabled' : ''}>${conteudo}</button>`;
  }).join('');
  if (visao.estado === 'vitoria') $('face').title = 'Você venceu!';
  else if (visao.estado === 'derrota') $('face').title = 'Uma bomba explodiu';
}

grade.addEventListener('click', (event) => {
  const celula = event.target.closest('.cell');
  if (!celula || celula.disabled) return;
  iniciou = true;
  jogo = executarAcao(jogo, { tipo: 'revelar', linha: Number(celula.dataset.row), coluna: Number(celula.dataset.col) });
  desenhar();
});
grade.addEventListener('contextmenu', (event) => {
  const celula = event.target.closest('.cell');
  if (!celula || celula.disabled) return;
  event.preventDefault();
  jogo = executarAcao(jogo, { tipo: 'marcar', linha: Number(celula.dataset.row), coluna: Number(celula.dataset.col) });
  desenhar();
});
$('new-game').addEventListener('click', () => { jogo = criarJogo(); segundos = 0; iniciou = false; desenhar(); });
setInterval(() => { if (iniciou && jogo.estado === 'em_andamento') { segundos = Math.min(999, segundos + 1); $('timer').textContent = String(segundos).padStart(3, '0'); } }, 1000);
desenhar();
