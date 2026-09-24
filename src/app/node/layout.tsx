import { Barlow_Condensed } from 'next/font/google';

// The observatory console's labels and controls; only /node pages load it.
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow',
  weight: ['500', '600', '700'],
  display: 'swap',
});

export default function NodeLayout({ children }: { children: React.ReactNode }) {
  return <div className={barlowCondensed.variable} style={{ display: 'contents' }}>{children}</div>;
}
