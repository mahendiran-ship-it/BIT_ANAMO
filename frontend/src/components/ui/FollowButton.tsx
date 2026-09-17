import React, { useState } from 'react';
import { Eye, Check, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

interface FollowButtonProps {
  address: string;
  isInitiallyFollowed?: boolean;
  onFollowChange?: (isFollowed: boolean) => void;
  size?: 'sm' | 'md';
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  address,
  isInitiallyFollowed = false,
  onFollowChange,
  size = 'md'
}) => {
  const [isFollowed, setIsFollowed] = useState(isInitiallyFollowed);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);

    try {
      if (isFollowed) {
        await api.unfollowAddress(address);
        setIsFollowed(false);
        onFollowChange?.(false);
      } else {
        await api.followAddress(address);
        setIsFollowed(true);
        onFollowChange?.(true);
      }
    } catch (err) {
      console.error('Failed to toggle follow status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isSmall = size === 'sm';

  if (isFollowed) {
    return (
      <button
        onClick={toggleFollow}
        disabled={isLoading}
        title="Click to unfollow"
        className={`inline-flex items-center gap-1.5 rounded-lg font-mono font-bold transition-all border
          bg-intel-emerald/15 text-intel-emerald border-intel-emerald/40 hover:bg-intel-emerald/25
          ${isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-xs'}
        `}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
        <span>FOLLOWING ✓</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={isLoading}
      title="Follow this address across future blocks"
      className={`inline-flex items-center gap-1.5 rounded-lg font-mono font-bold transition-all border
        bg-btc-primary/10 text-btc-primary border-btc-primary/40 hover:bg-btc-primary hover:text-white shadow-sm hover:shadow-glow-btc/40
        ${isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-xs'}
      `}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Eye className="w-3.5 h-3.5" />
      )}
      <span>FOLLOW</span>
    </button>
  );
};
