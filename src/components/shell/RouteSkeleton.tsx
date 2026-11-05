/** Kerangka pemuatan rute (skel() di HTML); dipakai oleh app/(app)/loading.tsx. */
export function RouteSkeleton() {
  return (
    <>
      <div className="sk" style={{ height: 32, width: '40%', margin: '32px 0 18px' }} />
      <div className="row">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n}>
            <div className="sk skc" />
            <div className="sk" style={{ height: 14, margin: '12px 0 6px' }} />
            <div className="sk" style={{ height: 12, width: '60%' }} />
          </div>
        ))}
      </div>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="sk" style={{ height: 56, margin: '10px 0' }} />
      ))}
    </>
  );
}
