/* Empaquetador sin dependencias: src/*.js + src/shell.html -> dist/index.html */
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src'), DIST = path.join(__dirname, 'dist');

const parts = fs.readdirSync(SRC)
  .filter(f => /^\d\d-.*\.js$/.test(f))
  .sort();

if (!parts.length) { console.error('No se encontraron modulos en src/'); process.exit(1); }

const bundle = parts.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
fs.writeFileSync(path.join(SRC, 'bundle.js'), bundle);

const shell = fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8');
if (!shell.includes('/*__GAME__*/')) { console.error('shell.html no contiene el marcador /*__GAME__*/'); process.exit(1); }

const html = shell.replace('/*__GAME__*/', bundle.replace(/<\/script>/g, '<\\/script>'));
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);

console.log('Modulos:', parts.join(', '));
console.log('dist/index.html ->', (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
