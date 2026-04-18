import type { CSSProperties, ReactNode } from 'react';

type Variant = 'content' | 'wide' | 'fullscreen';

const widths: Record<Variant, string> = {
  content: 'max-w-3xl',
  wide: 'max-w-6xl',
  fullscreen: 'max-w-none',
};

export default function PageContainer({
  children,
  variant = 'content',
  className = '',
  style,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${widths[variant]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
