'use client';

import { useFollow } from '@/hooks/useFollow';

interface Props {
  wallet: string | null;
  size?: 'sm' | 'md';
  authPrompt?: () => void;
}

export default function FollowButton({ wallet, size = 'sm', authPrompt }: Props) {
  const { isFollowing, loading, saving, canFollow, isSelf, toggle } = useFollow(wallet);

  if (isSelf) return null;
  if (loading || !wallet) {
    return (
      <span
        className="follow-btn follow-btn-skel"
        aria-hidden
        style={{ minWidth: size === 'md' ? 96 : 76 }}
      />
    );
  }

  const label = isFollowing ? 'Following' : 'Follow';

  return (
    <button
      type="button"
      className={`follow-btn ${isFollowing ? 'is-following' : ''} ${size}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canFollow) {
          authPrompt?.();
          return;
        }
        toggle();
      }}
      disabled={saving}
      aria-pressed={isFollowing}
    >
      {label}
    </button>
  );
}
