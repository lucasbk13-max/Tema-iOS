// Gera todos os arquivos do tema Noir: ícones, papéis de parede, pacote SnowBoard e prévia.
// Uso: npm run build
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = require(require.resolve('playwright', { paths: [process.execPath, '/usr/lib/node_modules', '/usr/local/lib/node_modules'] }))); }
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const theme = JSON.parse(readFileSync('src/theme.json', 'utf8'));
const apps = JSON.parse(readFileSync('src/apps.json', 'utf8'));
const P = theme.palette;
const ICONS = 'node_modules/lucide-static/icons';

const OUT = 'dist';
const DIRS = {
  shortcuts: join(OUT, 'icons'),
  wallpapers: join(OUT, 'wallpapers'),
  snow: join(OUT, 'snowboard', 'Library', 'Themes', `${theme.name}.theme`),
};
rmSync(OUT, { recursive: true, force: true });
Object.values(DIRS).forEach((d) => mkdirSync(d, { recursive: true }));
mkdirSync(join(DIRS.snow, 'IconBundles'), { recursive: true });

// Extrai o conteúdo interno do SVG do Lucide (sem a tag <svg> externa).
function glyph(name) {
  const svg = readFileSync(join(ICONS, `${name}.svg`), 'utf8');
  return svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
}

// Ícone: quadrado cheio (o iOS aplica a máscara arredondada), com um leve degradê e o glifo em traço fino.
function iconSvg(name, size) {
  const g = theme.icon.glyphScale * size;
  const off = (size - g) / 2;
  const s = g / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.tileEdge}"/>
      <stop offset="1" stop-color="${P.tile}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${off} ${off}) scale(${s})" fill="none" stroke="${P.text}"
     stroke-width="${theme.icon.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${glyph(name)}</g>
</svg>`;
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');

// Papéis de parede desenhados em canvas, na resolução do iPhone Pro Max (1290×2796).
const W = 1290, H = 2796;
const wallpaperScript = `
function noise(ctx, amount) {
  const img = ctx.getImageData(0, 0, ${W}, ${H}); const d = img.data;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * amount; d[i] += n; d[i+1] += n; d[i+2] += n; }
  ctx.putImageData(img, 0, 0);
}
const designs = {
  void(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ${W}, ${H});
    const g = ctx.createRadialGradient(${W}/2, ${H}*0.18, 0, ${W}/2, ${H}*0.18, ${H}*0.7);
    g.addColorStop(0, '#16161a'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, ${W}, ${H}); noise(ctx, 10);
  },
  horizon(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ${W}, ${H});
    const y = ${H} * 0.64;
    const glow = ctx.createRadialGradient(${W}/2, y, 0, ${W}/2, y, ${W}*0.9);
    glow.addColorStop(0, 'rgba(220,220,228,0.10)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, ${W}, ${H});
    const line = ctx.createLinearGradient(0, 0, ${W}, 0);
    line.addColorStop(0, 'rgba(237,237,239,0)'); line.addColorStop(0.5, 'rgba(237,237,239,0.55)'); line.addColorStop(1, 'rgba(237,237,239,0)');
    ctx.fillStyle = line; ctx.fillRect(0, y, ${W}, 2); noise(ctx, 8);
  },
  grid(ctx) {
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, ${W}, ${H});
    ctx.fillStyle = '#34343a'; const step = 86;
    for (let y = step / 2; y < ${H}; y += step) for (let x = step / 2; x < ${W}; x += step) {
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    const v = ctx.createRadialGradient(${W}/2, ${H}/2, ${W}*0.3, ${W}/2, ${H}/2, ${H}*0.65);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, ${W}, ${H});
  },
  orbit(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ${W}, ${H});
    const cx = ${W} * 0.85, cy = ${H} * 0.78;
    for (let i = 1; i <= 14; i++) {
      ctx.strokeStyle = 'rgba(237,237,239,' + (0.16 - i * 0.009) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, i * 150, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#EDEDEF'; ctx.beginPath(); ctx.arc(cx - 450, cy - 0, 7, 0, Math.PI * 2); ctx.fill();
    noise(ctx, 8);
  },
};`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function renderSvg(svg, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: file });
}

// 1) Ícones para o app Atalhos (512px) e para o SnowBoard (180px, formato <bundle>-large.png).
for (const app of apps) {
  await renderSvg(iconSvg(app.icon, 512), 512, join(DIRS.shortcuts, `${slug(app.name)}.png`));
  await renderSvg(iconSvg(app.icon, 180), 180, join(DIRS.snow, 'IconBundles', `${app.bundle}-large.png`));
}
console.log(`ícones: ${apps.length}`);

// 2) Papéis de parede.
await page.setViewportSize({ width: W, height: H });
const names = ['void', 'horizon', 'grid', 'orbit'];
for (const n of names) {
  await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas>
    <script>{ ${wallpaperScript}; designs['${n}'](document.getElementById('c').getContext('2d')); }</script></body></html>`);
  await page.locator('#c').screenshot({ path: join(DIRS.wallpapers, `noir-${n}.png`) });
}
console.log(`papéis de parede: ${names.length}`);

// 3) Metadados do SnowBoard e pacote .deb (se o dpkg-deb estiver disponível).
writeFileSync(join(DIRS.snow, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PackageName</key><string>${theme.name}</string>
  <key>ThemeType</key><string>Icons</string>
</dict>
</plist>
`);
mkdirSync(join(OUT, 'snowboard', 'DEBIAN'), { recursive: true });
writeFileSync(join(OUT, 'snowboard', 'DEBIAN', 'control'), `Package: com.noir.theme
Name: ${theme.name}
Version: ${theme.version}
Architecture: iphoneos-arm
Description: Tema escuro e minimalista para iOS.
Section: Themes
Depends: com.spark.snowboard
Author: Noir
Maintainer: Noir
`);
try {
  execSync(`dpkg-deb -Zgzip --root-owner-group -b ${join(OUT, 'snowboard')} ${join(OUT, `noir_${theme.version}_iphoneos-arm.deb`)}`, { stdio: 'pipe' });
  console.log('pacote .deb gerado');
} catch { console.log('dpkg-deb indisponível: pacote .deb não gerado (a pasta snowboard/ continua utilizável)'); }

// 4) Prévia da tela inicial.
const dock = ['Telefone', 'Safari', 'Mensagens', 'Música'];
const grid = apps.filter((a) => !dock.includes(a.name)).slice(0, 20);
const icon64 = (a) => `data:image/svg+xml;base64,${Buffer.from(iconSvg(a.icon, 180)).toString('base64')}`;
const cell = (a, label = true) => `<div class="app"><img src="${icon64(a)}">${label ? `<span>${a.name}</span>` : ''}</div>`;
const wp = readFileSync(join(DIRS.wallpapers, 'noir-horizon.png')).toString('base64');
await page.setViewportSize({ width: 430, height: 932 });
await page.setContent(`<html><head><style>
  body{margin:0;width:430px;height:932px;background:#000;
       font-family:-apple-system,'SF Pro Text','Inter',system-ui,sans-serif;color:${P.text};position:relative;overflow:hidden}
  .status{display:flex;justify-content:space-between;padding:18px 34px 0;font-weight:600;font-size:16px}
  .widget{margin:28px 24px 8px;padding:20px 22px;border-radius:24px;background:rgba(20,20,22,.72);border:1px solid ${P.line}}
  .widget .t{font-size:52px;font-weight:200;letter-spacing:-1px;line-height:1}
  .widget .d{color:${P.muted};font-size:14px;margin-top:8px;text-transform:uppercase;letter-spacing:2px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);row-gap:22px;padding:18px 24px}
  .app{display:flex;flex-direction:column;align-items:center;gap:6px}
  .app img{width:62px;height:62px;border-radius:15px;border:1px solid ${P.line}}
  .app span{font-size:11px;color:${P.text}}
  .dock{position:absolute;left:14px;right:14px;bottom:14px;padding:16px 10px;border-radius:32px;
        background:rgba(20,20,22,.6);backdrop-filter:blur(20px);display:grid;grid-template-columns:repeat(4,1fr)}
  #wp{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1}
</style></head><body>
  <img id="wp" src="data:image/png;base64,${wp}">
  <div class="status"><span>9:41</span><span>●●●</span></div>
  <div class="widget"><div class="t">09:41</div><div class="d">Segunda · 9 de novembro</div></div>
  <div class="grid">${grid.map((a) => cell(a)).join('')}</div>
  <div class="dock">${apps.filter((a) => dock.includes(a.name)).map((a) => cell(a, false)).join('')}</div>
</body></html>`);
await page.waitForFunction(() => document.getElementById('wp').complete);
await page.screenshot({ path: 'preview.png' });
await browser.close();
console.log('prévia: preview.png');
if (!existsSync('preview.png')) process.exit(1);
