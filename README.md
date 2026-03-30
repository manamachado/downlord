# downlord

O downlord é um utilitário de sistema moderno desenhado para baixar e organizar canais de áudio e vídeo, convertendo playlists e vídeos de plataformas nativas (como Spotify, YouTube, Instagram, TikTok, X/Twitter e Vimeo) diretamente para o seu diretório virtual seguro, o cofre (`downloads/`).

A nova versão é impulsionada através da robusta Edge Network do **Next.js (App Router)** e processada usando utilitários avançados de extração de ffmpeg & yt-dlp. A interface é puramente controlada e dinamizada através do React (Hooks de Client-side), ostentando o design fluid 'Midnight Glass' sobre o Tailwind CSS nativo.

## Funcionalidades
- Download e Extração MP3 automática do YouTube.
- Download e Extração MP4 automática do YouTube.
- Suporte estendido multiplataforma (Reels do Instagram, vídeos do TikTok, threads do Twitter/X e vídeos do Vimeo).
- Suporte para captura de Playlists do Spotify sem auxilio de APIs ou Login!
- Nomenclatura higienizada e processada individualmente baseada em Metadados.
- UI Dark Mode com renderização Server-Sent Events (SSE) para stream real-time do processo binário no Backend.

## Como Executar
O downlord requer um backend Linux/Unix configurado com ffmpeg e bibliotecas Python por motivos do Core Extractor. Portanto, o uso pretendido é através do **Docker**.

1. Mapeie a pasta `/downloads`
2. Construa a Imagem (Standalone Next.js) e lance o Container:

```bash
docker compose up -d --build
```
3. Acesse a GUI em `http://localhost:3000`

## Arquitetura
- Frontend: `React` / `Tailwind CSS 4.0`
- Backend Edge: `Next.js API Route Handlers`
- Dependências Críticas: `yt-dlp`, `ffmpeg`, `spotify-url-info`
- Paradigma API: `ReadableStream` & SSE Web Standard
