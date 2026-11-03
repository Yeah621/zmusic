'use client';
import { Icon } from '@/components/icons/Icon';
import { toggleLikeWithToast } from '@/lib/actions';
import { useLibraryStore } from '@/stores/library';

export function LikeButton({ index, className = 'lk' }: { index: number; className?: string }) {
  const liked = useLibraryStore((s) => s.likes.includes(index));
  return (
    <button
      className={`${className}${liked ? ' on' : ''}`}
      aria-label="Suka"
      aria-pressed={liked}
      onClick={(e) => {
        e.stopPropagation();
        toggleLikeWithToast(index);
      }}
    >
      <Icon name="heart" />
    </button>
  );
}
