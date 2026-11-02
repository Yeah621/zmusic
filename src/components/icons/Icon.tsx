export const ICON_NAMES = [
  'home',
  'search',
  'lib',
  'user',
  'heart',
  'moon',
  'sun',
  'play',
  'pause',
  'next',
  'prev',
  'shuffle',
  'repeat',
  'vol',
  'bell',
  'x',
  'clock',
  'down',
  'more',
  'list',
  'plus',
  'share',
  'mute',
  'send',
  'upload',
  'alert',
  'grip',
  'trash',
  'settings',
  'edit',
  'mic',
  'check',
  'eye',
  'lock',
  'music',
  'logout',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** Padanan ic(n) di HTML: <svg class="i" aria-hidden="true"><use href="#i-n"/></svg> */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="i" aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
