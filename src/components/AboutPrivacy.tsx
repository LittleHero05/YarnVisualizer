import { forwardRef } from 'react';
import { SITE } from '../site';
import { useProject } from '../state/project';

// About & privacy (Ravelry API terms 2a-2c). A native <dialog>: Escape closes it for free.

function clearSaved() {
  void useProject.persist.clearStorage();
  window.location.reload();
}

export const AboutPrivacy = forwardRef<HTMLDialogElement>(function AboutPrivacy(_, ref) {
  const close = () => (ref && typeof ref === 'object' ? ref.current?.close() : undefined);
  const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;
  return (
    <dialog ref={ref} className="about" aria-labelledby="about-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="about-head">
        <h2 id="about-title">About &amp; privacy</h2>
        <button type="button" className="ghost small" onClick={close} aria-label="Close About & privacy">Close</button>
      </div>

      <p>{SITE.name} previews a sweater pattern in the yarn colors you pick and estimates how much yarn you need. It's free.</p>

      <h3>Your project</h3>
      <p>There are no accounts. Your project (pattern choice, colors, size) is saved only in your own browser.</p>
      <button type="button" className="ghost small" onClick={clearSaved}>Clear my saved project</button>

      <h3>Yarn photos</h3>
      <p>Photos you upload are read on your device to estimate a color. They're never uploaded or stored.</p>

      <h3>Ravelry data</h3>
      <p>
        Pattern and yarn data and photos come from Ravelry and belong to their owners. They're shown as-is and linked back to Ravelry.
        To reduce requests we keep a short-lived cache of up to about an hour and don't store them otherwise.
        Owners who want their content removed can contact {mail}.
      </p>

      <h3>Email list</h3>
      <p>If you join the email list, we keep your email address only to tell you about new tools like this one. Ask us to remove it anytime at {mail}.</p>

      <p className="muted small">
        {SITE.name} is an independent project by {SITE.provider}. Not affiliated with or endorsed by Ravelry.
      </p>
    </dialog>
  );
});
