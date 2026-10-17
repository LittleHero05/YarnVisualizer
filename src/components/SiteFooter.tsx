import { useRef } from 'react';
import { SITE } from '../site';
import { AboutPrivacy } from './AboutPrivacy';

// Site footer: who runs this (it isn't Ravelry, terms 1e) and the About & privacy dialog.
export function SiteFooter() {
  const about = useRef<HTMLDialogElement>(null);
  return (
    <footer className="footer site-footer">
      <p className="footer-love">happy knitting ♡</p>
      <p className="footer-note">
        {SITE.name} is an independent project by {SITE.provider}. Not affiliated with or endorsed by Ravelry. Pattern and yarn data via the{' '}
        <a href="https://www.ravelry.com/api" target="_blank" rel="noreferrer">Ravelry API</a>.
      </p>
      <button type="button" className="link" aria-haspopup="dialog" onClick={() => about.current?.showModal()}>About &amp; privacy</button>
      <AboutPrivacy ref={about} />
    </footer>
  );
}
