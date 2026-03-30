import './globals.css';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata = {
  title: 'downlord | Offline Music & Video Downloader',
  description: 'Baixe músicas e vídeos do YouTube e Spotify com máxima qualidade.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="antialiased min-h-screen bg-[#09090b] text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
