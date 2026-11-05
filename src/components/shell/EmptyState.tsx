'use client';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/icons/Icon';
import { Reveal } from './Reveal';

interface Props {
  icon: IconName;
  title: string;
  text: string;
  href?: string;
  cta?: string;
}

/** Keadaan kosong (empty() di HTML). */
export function EmptyState({ icon, title, text, href, cta }: Props) {
  return (
    <Reveal className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      <p>{text}</p>
      {href ? (
        <Link className="btn b1" href={href}>
          {cta}
        </Link>
      ) : null}
    </Reveal>
  );
}

/** Halaman yang butuh akun (gate() di HTML). */
export function GateEmpty({ title, text }: { title: string; text: string }) {
  return <EmptyState icon="lock" title={title} text={text} href="/login" cta="Masuk" />;
}
