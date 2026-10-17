import { useState } from 'react';
import { renderCard, type CardSummary } from '../export/card';

/** Download or print the current sweater with a summary of the specs, as one image. */
export function ExportPanel({ summary, viewBox, fileName }: { summary: CardSummary; viewBox: string; fileName: string }) {
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const [error, setError] = useState('');

  async function makePng(): Promise<string> {
    const svg = document.querySelector<SVGSVGElement>('svg.garment');
    const stage = document.querySelector('.canvas-wrap');
    if (!svg || !stage) throw new Error('Preview not found');
    const canvas = await renderCard(svg, viewBox, getComputedStyle(stage).backgroundColor, summary);
    return canvas.toDataURL('image/png');
  }

  async function download() {
    setBusy('download');
    setError('');
    try {
      const a = document.createElement('a');
      a.href = await makePng();
      a.download = fileName;
      a.click();
    } catch {
      setError('Couldn’t create the image. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function print() {
    // Open the window during the click so pop-up blockers allow it, then fill it in.
    const win = window.open('', '_blank');
    setBusy('print');
    setError('');
    try {
      const png = await makePng();
      if (!win) throw new Error('blocked');
      win.document.title = summary.title;
      win.document.body.style.margin = '0';
      const img = win.document.createElement('img');
      img.src = png;
      img.alt = summary.title;
      img.style.width = '100%';
      img.onload = () => {
        win.focus();
        win.print();
      };
      win.document.body.appendChild(img);
    } catch {
      win?.close();
      setError('Couldn’t open the print view. Allow pop-ups, or download the image instead.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel export-panel">
      <h2>Save your plan</h2>
      <p className="muted small">An image of your sweater ({summary.subtitle.split(' · ')[0].toLowerCase()} view as shown) with size, gauge and yarn amounts. Good for printing or taking to the yarn shop.</p>
      <div className="row">
        <button type="button" onClick={download} disabled={busy !== null}>{busy === 'download' ? 'Making image…' : 'Download image'}</button>
        <button type="button" className="ghost" onClick={print} disabled={busy !== null}>{busy === 'print' ? 'Preparing…' : 'Print'}</button>
      </div>
      {error && <p className="notice error small" role="alert">{error}</p>}
    </section>
  );
}
