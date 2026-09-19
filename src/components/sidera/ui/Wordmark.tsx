import Link from 'next/link';

type WordmarkProps = {
  /** sm for the top bar, md for a plate or share image, lg for a hero. */
  size?: 'sm' | 'md' | 'lg';
  /** When set, the mark is a link (the top bar passes '/'). */
  href?: string;
  /** Render as the page's h1 — only on a page whose title is the name itself. */
  asHeading?: boolean;
  className?: string;
};

/**
 * The Sidera wordmark: the name set in the serif, in capitals, widely
 * tracked. Text, not an image — no logo file exists yet. The accessible name
 * is "Sidera".
 */
export default function Wordmark({ size = 'sm', href, asHeading = false, className = '' }: WordmarkProps) {
  const cls = `sd-wordmark sd-wordmark--${size} ${className}`.trim();
  if (href) {
    return (
      <Link href={href} className={cls} aria-label="Sidera, home">
        Sidera
      </Link>
    );
  }
  return asHeading ? <h1 className={cls}>Sidera</h1> : <span className={cls}>Sidera</span>;
}
