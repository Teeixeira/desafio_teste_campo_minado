import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const porta = Number(process.env.PORT) || 3005;
const arquivos = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/browser.js', 'browser.js'], ['/styles.css', 'styles.css'], ['/src/jogo.js', 'src/jogo.js']]);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const arquivo = arquivos.get(url.pathname);
  if (!arquivo || req.method !== 'GET') { res.writeHead(404); return res.end('Não encontrado'); }
  try {
    const conteudo = await readFile(path.join(raiz, arquivo));
    res.writeHead(200, { 'content-type': tipos[path.extname(arquivo)], 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(conteudo);
  } catch { res.writeHead(500); res.end('Não foi possível carregar o jogo.'); }
}).listen(porta, '127.0.0.1', () => console.log(`Campo Minado disponível em http://127.0.0.1:${porta}`));
