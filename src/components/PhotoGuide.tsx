/** Grade de padronização: linha central, linhas horizontais e prumo visual. Não faz diagnóstico postural. */
export function PhotoGuide() {
  return (
    <svg viewBox="0 0 30 40" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none">
      <g stroke="currentColor" strokeWidth="0.1" fill="none" opacity="0.7">
        <line x1="15" y1="0" x2="15" y2="40" />
        {[8, 16, 24, 32].map((y) => <line key={y} x1="0" y1={y} x2="30" y2={y} strokeDasharray="0.6 0.6" />)}
        <line x1="10" y1="0" x2="10" y2="40" strokeDasharray="0.6 0.6" /><line x1="20" y1="0" x2="20" y2="40" strokeDasharray="0.6 0.6" />
      </g>
    </svg>
  );
}
