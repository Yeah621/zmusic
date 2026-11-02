import { Icon, ICON_NAMES } from '@/components/icons/Icon';
import { T } from '@/data/mock';
import { genArt } from '@/lib/cover-art';
import { fmt } from '@/lib/format';

// Sementara: uji dasar Fase 0 (tema, font, ikon, cover generatif, data contoh). Diganti di P1-03.
export default function Page() {
  return (
    <main className="pn gl" style={{ position: 'fixed', inset: 12, padding: 28 }}>
      <h2>ZMusic · uji dasar Fase 0</h2>
      <p>Periksa tema (ikuti sistem), font, ikon, cover, dan data contoh.</p>
      <h2>Ikon ({ICON_NAMES.length})</h2>
      <div className="tiles">
        {ICON_NAMES.map((n) => (
          <div className="stat" key={n}>
            <b><Icon name={n} /></b>
            <p>{n}</p>
          </div>
        ))}
      </div>
      <h2>Cover generatif · {T.length} lagu</h2>
      <div className="row2">
        {T.map((x) => (
          <div className="card" key={x.i}>
            <div className="cv" style={{ backgroundImage: genArt(x.h, x.i), backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <h4>{x.t}</h4>
            <p>{x.a} · {fmt(x.d)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
