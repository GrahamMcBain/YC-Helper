import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'claude-fit — Which Claude primitive fits your use case?',
  description:
    'An honest advisor for founders deciding how to build on the Claude Developer Platform. No install, no API key required.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#f0eee7]">
      <body className="bg-[#f0eee7]">{children}</body>
    </html>
  );
}
