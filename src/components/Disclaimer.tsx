export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? 'disclaimer compact' : 'disclaimer'} role="note">
      {compact ? 'Approximate. Colors may vary.' : 'Colors are approximate and may vary from the actual yarn. Screens, dye lots and lighting all change how a color looks, so check a physical swatch before you buy.'}
    </p>
  );
}
