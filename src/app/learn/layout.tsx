import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn Astronomy — Interactive Guides, Quizzes & Deep Space Field Guide | Stellar',
  description:
    'Learn astronomy the interactive way: guided field guides, quizzes and deep-space explainers for beginners and seasoned stargazers alike on Stellar.',
  alternates: { canonical: '/learn' },
  openGraph: {
    title: 'Learn Astronomy — Interactive Guides, Quizzes & Deep Space Field Guide | Stellar',
    description:
      'Interactive field guides, quizzes and deep-space explainers for beginners and seasoned stargazers alike.',
    url: 'https://stellarr.club/learn',
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="sr-only">Learn Astronomy — Interactive Guides, Quizzes &amp; Field Guide</h1>
      {children}
    </>
  );
}
