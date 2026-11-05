/** Baris pengaturan dengan sakelar (sw() di HTML). */
export function Switch({ on, title, sub, onToggle }: { on: boolean; title: string; sub: string; onToggle: () => void }) {
  return (
    <div className="srow">
      <div>
        <h4>{title}</h4>
        <p>{sub}</p>
      </div>
      <button className={`sw${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={title} onClick={onToggle} />
    </div>
  );
}

/** Grup tombol segmen (tb() di HTML). */
export function SegTabs({ labels, current, label, onPick }: { labels: readonly string[]; current: number; label: string; onPick: (i: number) => void }) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {labels.map((t, i) => (
        <button key={t} className={i === current ? 'on' : undefined} aria-pressed={i === current} onClick={() => onPick(i)}>
          {t}
        </button>
      ))}
    </div>
  );
}
