import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tech MKT Manager',
  description: 'Marketing Budget & Campaign Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>{children}</MantineProvider>
      </body>
    </html>
  );
}
