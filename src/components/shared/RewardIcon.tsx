import { Ticket, Moon, Globe, Star, Sparkles, Trophy, Compass, Telescope } from 'lucide-react';

const iconMap: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  '🎫': { Icon: Ticket, color: 'text-[var(--terracotta)]' },
  '🌕': { Icon: Moon, color: 'text-[var(--terracotta)]' },
  '🪐': { Icon: Globe, color: 'text-[var(--terracotta)]' },
  '🌟': { Icon: Star, color: 'text-[var(--terracotta)]' },
  '✨': { Icon: Sparkles, color: 'text-[var(--terracotta)]' },
  '🏆': { Icon: Trophy, color: 'text-[var(--terracotta)]' },
  '⭐': { Icon: Star, color: 'text-[var(--terracotta)]' },
  '🧭': { Icon: Compass, color: 'text-[var(--terracotta)]' },
  '🎟️': { Icon: Ticket, color: 'text-[var(--terracotta)]' },
  '🔭': { Icon: Telescope, color: 'text-[var(--terracotta)]' },
};

export default function RewardIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  const entry = iconMap[emoji];
  const IconComp = entry?.Icon || Star;
  const color = entry?.color || 'text-[var(--terracotta)]';

  return (
    <div className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[rgba(232, 130, 107,0.1)] flex items-center justify-center flex-shrink-0">
      <IconComp size={size} className={color} />
    </div>
  );
}
