# downlord

O downlord é um utilitário moderno desenhado para baixar e organizar canais de áudio e vídeo, convertendo playlists e conteúdos de plataformas (como Spotify, YouTube, Instagram, TikTok, X/Twitter e Vimeo) diretamente para o seu diretório virtual seguro, o cofre (`downloads/`).

A aplicação é impulsionada pela robusta rede do **Next.js (App Router)** e processada no backend usando utilitários avançados de extração de ffmpeg & yt-dlp. A interface é puramente controlada e dinamizada através do React, ostentando o design fluido 'Midnight Glass' criado em cima do Tailwind CSS 4.0.

## 🚀 Funcionalidades Atuais
- **Download de Áudio (MP3):** Multi-qualidades disponíveis (320kbps, 192kbps e 128kbps).
- **Download de Vídeo (MP4):** Multi-qualidades disponíveis (1080p, 720p, 480p e 360p).
- **Suporte Multiplataforma Amplo:** YouTube, Reels do Instagram, vídeos do TikTok, threads do Twitter/X e vídeos do Vimeo.
- **Suporte a Playlists do Spotify:** Captura direta de Músicas e Playlists do Spotify sem depender de chaves de API oficiais ou Login.
- **Feedback em Tempo Real (SSE):** UI baseada em Server-Sent Events para stream real-time do processo de download (incluindo logs da engine e progresso percentual).
- **Gerenciador de Cofre (Biblioteca Local):** Espaço para explorar os arquivos que estão salvos, verificar peso (em MBs), com a opção de salvar em sua máquina de forma persistente ou apagar diretamente pela aplicação.
- **Processamento Automático:** Nomenclatura higienizada e processada individualmente baseada em Metadados.

## ⚙️ Como Executar
O downlord requer um backend Linux/Unix configurado de fábrica com ffmpeg e bibliotecas Python devido aos Extratores principais. Portanto, a implantação suportada e pretendida é através do **Docker**.

1. Garanta e mapeie a pasta onde guardará seus downloads: `/downloads`
2. Construa a Imagem (Standalone Next.js) e lance o Container:

```bash
docker compose up -d --build
```
3. Acesse a GUI em `http://localhost:3000`

## 🏗️ Arquitetura
- Frontend: `React 19` / `Tailwind CSS 4.0`
- Backend API: `Next.js API Route Handlers`
- Dependências Críticas: `yt-dlp`, `ffmpeg`, `spotify-url-info`
- Paradigma API: `ReadableStream` & Servidor SSE Padrão Web
