import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google';

// Sky Tonight runs its own type system (spec-locked), scoped to this page only
// via the variable classes below — it does not touch the global Orbitron/Geist.
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--sky-serif',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--sky-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--sky-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const skyFontVars = `${cormorant.variable} ${inter.variable} ${jetbrains.variable}`;
