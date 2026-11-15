// Finds identifiers used in the frontend that are never declared or imported (typos, missing imports).
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', 'frontend');
const parser = require(path.join(root, 'node_modules/@babel/parser'));
const traverse = require(path.join(root, 'node_modules/@babel/traverse')).default;
const GLOBALS = new Set(['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'console', 'fetch', 'alert', 'URL', 'URLSearchParams', 'Promise', 'Set', 'Map', 'Date', 'Math', 'JSON', 'Number', 'String', 'Array', 'Object', 'Boolean', 'Error', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Intl', 'FormData', 'Blob', 'Event', 'indexedDB', 'crypto', 'location', 'history', 'confirm', 'prompt', 'undefined', 'NaN', 'Infinity', 'isNaN', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent', 'requestAnimationFrame', 'process', 'import', 'atob', 'btoa', 'Uint8Array', 'TextEncoder', 'AbortController', 'HTMLElement', 'Image', 'IDBKeyRange', 'structuredClone', 'matchMedia', 'getComputedStyle', 'MutationObserver', 'Notification', 'CustomEvent', 'ResizeObserver', 'DOMException']);
let bad = 0;
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.jsx?$/.test(f)) continue;
    const ast = parser.parse(fs.readFileSync(p, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, { ReferencedIdentifier(pth) {
      const n = pth.node.name;
      if (pth.scope.hasBinding(n) || GLOBALS.has(n)) return;
      if (pth.node.type === 'JSXIdentifier' && /^[a-z]/.test(n)) return; // html tags
      console.log(`${path.relative(root, p)}:${pth.node.loc.start.line}  "${n}" is not defined`); bad++;
    } });
  }
})(path.join(root, 'src'));
console.log(bad ? `${bad} problem(s)` : 'No undefined names found.');
process.exit(bad ? 1 : 0);
