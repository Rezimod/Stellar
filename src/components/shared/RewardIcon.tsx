import { Ticket, Moon, Globe, Star, Sparkles, Trophy, Compass, Telescope } from 'lucide-react';

const iconMap: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  '🎫': { Icon: Ticket, color: 'text-[#FFD166]' },
  '🌕': { Icon: Moon, color: 'text-[#FFD166]' },
  '🪐': { Icon: Globe, color: 'text-[#818cf8]' },
  '🌟': { Icon: Star, color: 'text-[#FFD166]' },
  '✨': { Icon: Sparkles, color: 'text-[#7A5FFF]' },
  '🏆': { Icon: Trophy, color: 'text-[#FFD166]' },
  '⭐': { Icon: Star, color: 'text-[#FFD166]' },
  '🧭': { Icon: Compass, color: 'text-[#818cf8]' },
  '🎟️': { Icon: Ticket, color: 'text-[#FFD166]' },
  '🔭': { Icon: Telescope, color: 'text-[#818cf8]' },
};

export default function RewardIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  const entry = iconMap[emoji];
  const IconComp = entry?.Icon || Star;
  const color = entry?.color || 'text-[#FFD166]';

  return (
    <div className="w-9 h-9 rounded-full bg-[#0F1F3D] border border-[rgba(99,102,241,0.1)] flex items-center justify-center flex-shrink-0">
      <IconComp size={size} className={color} />
    </div>
  );
}
