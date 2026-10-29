import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,16);
export function versionSite({html,js,css,core}) {
  js=js.replace(/'\.\/catalog-core\.mjs(?:\?v=[^']*)?'/,`'./catalog-core.mjs?v=${hash(core)}'`);
  html=html.replace(/src="\.\/voices\.js(?:\?v=[^"]*)?"/,`src="./voices.js?v=${hash(js)}"`)
    .replace(/href="\.\/voices\.css(?:\?v=[^"]*)?"/,`href="./voices.css?v=${hash(css)}"`);
  return {html,js};
}
if (process.argv[1]===fileURLToPath(import.meta.url)) {
  const file=name=>new URL(`../docs/${name}`,import.meta.url);
  const html=readFileSync(file('index.html'),'utf8'), js=readFileSync(file('voices.js'),'utf8');
  const result=versionSite({html,js,css:readFileSync(file('voices.css'),'utf8'),core:readFileSync(file('catalog-core.mjs'),'utf8')});
  if (process.argv.includes('--check')) {
    if (html!==result.html || js!==result.js) throw new Error('Run node tools/version-site.mjs after changing website assets.');
  } else {
    writeFileSync(file('index.html'),result.html);
    writeFileSync(file('voices.js'),result.js);
  }
}
