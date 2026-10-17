// Builds a shareable/printable PNG: the sweater as currently shown plus a summary of the specs.

export interface CardColor {
  letter: string;
  hex: string;
  name: string;
  amount: string;
}

export interface CardSummary {
  title: string;
  subtitle: string;
  specs: [string, string][];
  colors: CardColor[];
  total: string;
  footer: string;
  site: string;
}

const W = 1200;
const H = 1600;
const INK = '#22332a';
const MUTED = '#5f7166';
const MOSS = '#3e7a4f';
const PAPER = '#f7f6ee';
const CARD = '#fffef8';
const YELLOW = '#ffd84d';

/** Copy of the on-screen garment SVG framed to the whole garment, with interactive bits removed. */
function garmentSnapshot(svg: SVGSVGElement, viewBox: string, width: number, height: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // CSS classes don't apply inside an <img>, so bake in the outline color.
  const src = svg.querySelectorAll<SVGElement>('.part-outline');
  clone.querySelectorAll<SVGElement>('.part-outline').forEach((el, i) => {
    if (src[i]) el.setAttribute('stroke', getComputedStyle(src[i]).stroke);
  });
  clone.querySelectorAll('.zone').forEach((el) => el.remove());
  clone.setAttribute('viewBox', viewBox);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('style');
  clone.removeAttribute('class');
  return new XMLSerializer().serializeToString(clone);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Wraps text to `maxWidth`, returns the y after the last line. */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = w;
      if (++lines === maxLines - 1) break;
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

export async function renderCard(svg: SVGSVGElement, viewBox: string, stageBg: string, s: CardSummary): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load('64px "Instrument Serif"'),
    document.fonts.load('600 20px Inter'),
    document.fonts.load('400 20px Inter'),
    document.fonts.load('700 30px Caveat'),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Dot-grid paper
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#cfd8c4';
  for (let y = 11; y < H; y += 22) for (let x = 11; x < W; x += 22) ctx.fillRect(x, y, 2, 2);

  const pad = 64;
  // Brand
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(pad + 14, pad + 12, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = '34px "Instrument Serif", Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('swatch journal', pad + 40, pad + 13);
  ctx.textAlign = 'right';
  ctx.font = '600 15px Inter, sans-serif';
  ctx.fillStyle = MOSS;
  ctx.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase(), W - pad, pad + 13);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Title
  ctx.fillStyle = INK;
  ctx.font = '68px "Instrument Serif", Georgia, serif';
  let y = wrap(ctx, s.title, pad, pad + 110, W - pad * 2, 70, 2);
  ctx.font = '400 21px Inter, sans-serif';
  ctx.fillStyle = MUTED;
  y = wrap(ctx, s.subtitle, pad, y - 18, W - pad * 2, 28, 2) + 10;

  // Garment on its stage
  const boxY = y;
  const boxH = 700;
  roundRect(ctx, pad, boxY, W - pad * 2, boxH, 22);
  ctx.fillStyle = stageBg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  const [, , vbw, vbh] = viewBox.split(/\s+/).map(Number);
  const fit = Math.min((W - pad * 2 - 40) / vbw, (boxH - 40) / vbh);
  const gw = vbw * fit, gh = vbh * fit;
  const markup = garmentSnapshot(svg, viewBox, gw * 2, gh * 2);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    ctx.drawImage(img, (W - gw) / 2, boxY + (boxH - gh) / 2, gw, gh);
  } finally {
    URL.revokeObjectURL(url);
  }
  y = boxY + boxH + 44;

  // Specs (left) and colors (right) on a card
  const cardH = Math.max(s.specs.length * 46, s.colors.length * 56 + 70) + 70;
  roundRect(ctx, pad, y, W - pad * 2, cardH, 22);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.stroke();
  const colX = pad + 32, col2X = W / 2 + 10;
  let ly = y + 52;
  for (const [k, v] of s.specs) {
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText(k.toUpperCase(), colX, ly);
    ctx.font = '26px "Instrument Serif", Georgia, serif';
    ctx.fillStyle = INK;
    ctx.fillText(v, colX + 190, ly + 2, col2X - colX - 220);
    ly += 46;
  }
  let ry = y + 52;
  ctx.font = '600 14px Inter, sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText('YARN TO BUY', col2X, ry);
  ry += 34;
  for (const c of s.colors) {
    ctx.beginPath();
    ctx.arc(col2X + 16, ry - 6, 16, 0, Math.PI * 2);
    ctx.fillStyle = c.hex;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = '600 19px Inter, sans-serif';
    ctx.fillText(`${c.letter}  ${c.name}`, col2X + 44, ry - 8, W - pad - 32 - col2X - 44);
    ctx.font = '400 16px Inter, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText(c.amount, col2X + 44, ry + 14);
    ry += 56;
  }
  ctx.font = '30px "Instrument Serif", Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText(`Total ${s.total}`, col2X, ry + 6);
  ctx.lineWidth = 2;
  y += cardH + 40;

  // Footer
  ctx.font = '700 28px Caveat, cursive';
  ctx.fillStyle = MOSS;
  ctx.fillText('Colors are approximate and may vary. Swatch first!', pad, y);
  ctx.font = '400 15px Inter, sans-serif';
  ctx.fillStyle = MUTED;
  wrap(ctx, s.footer, pad, y + 34, W - pad * 2, 22, 2);
  ctx.textAlign = 'right';
  ctx.font = '600 15px Inter, sans-serif';
  ctx.fillStyle = INK;
  ctx.fillText(s.site, W - pad, H - 36);
  ctx.textAlign = 'left';

  // Trim unused space at the bottom so short summaries don't leave a gap.
  const used = Math.min(H, y + 110);
  if (used >= H) return canvas;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = used;
  const octx = out.getContext('2d')!;
  octx.drawImage(canvas, 0, 0);
  octx.font = '600 15px Inter, sans-serif';
  octx.textAlign = 'right';
  octx.fillStyle = INK;
  octx.fillText(s.site, W - pad, used - 30);
  return out;
}
