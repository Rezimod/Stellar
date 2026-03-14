import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'solana' | 'ghost' | 'cyan' | 'brass';
  children: ReactNode;
}

const variants = {
  primary: 'bg-[#c9a84c] hover:bg-[#d4b05c] text-black font-semibold',
  brass: 'bg-gradient-to-r from-[#c9a84c] to-[#a07840] hover:from-[#d4b05c] hover:to-[#b08848] text-black font-semibold',
  solana: 'bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-[#8030ee] hover:to-[#10d080] text-white font-semibold',
  cyan: 'bg-gradient-to-r from-[#0e7490] to-[#22d3ee] hover:from-[#0a5f78] hover:to-[#18b8d4] text-white font-semibold',
  ghost: 'border border-[#1a2d4d] hover:border-[#c9a84c] text-slate-300 hover:text-[#c9a84c] bg-transparent',
};

export default function Button({ variant = 'primary', children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        px-4 py-2.5 rounded-lg transition-all duration-200
        ${variants[variant]}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
