import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'claude-fit — Which Claude primitive fits your use case?',
  description:
    'An honest advisor for founders deciding how to build on the Claude Developer Platform. No install, no API key required.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#F9F7F4]">
      <body className="bg-[#F9F7F4]">{children}</body>
    </html>
  );
}
