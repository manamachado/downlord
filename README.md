# 🎵 CRATE — YouTube MP3 Downloader

App local para baixar músicas e playlists do YouTube Music em MP3.

## Pré-requisitos

Instale antes de rodar:

### 1. Node.js
https://nodejs.org (v18+)

### 2. yt-dlp
```bash
# Windows (via winget)
winget install yt-dlp

# Mac
brew install yt-dlp

# Linux
sudo apt install yt-dlp
# ou
pip install yt-dlp
```

### 3. FFmpeg
Necessário para converter para MP3.

```bash
# Windows — baixe em https://ffmpeg.org/download.html e adicione ao PATH
# ou via winget:
winget install ffmpeg

# Mac
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

---

## Rodando com Docker (recomendado)

Não precisa instalar Node, yt-dlp ou FFmpeg na máquina — tudo roda dentro do container.

```bash
# Build + sobe o container
docker compose up --build

# Ou em background
docker compose up --build -d
```

Abra http://localhost:3000 no browser.

```bash
# Parar
docker compose down

# Ver logs
docker compose logs -f
```

Os MP3s ficam salvos na pasta `downloads/` da sua máquina (volume mapeado).

---

## Rodando sem Docker

### Pré-requisitos

```bash
# yt-dlp
winget install yt-dlp   # Windows
brew install yt-dlp     # Mac
pip install yt-dlp      # Linux

# FFmpeg
winget install ffmpeg   # Windows
brew install ffmpeg     # Mac
sudo apt install ffmpeg # Linux
```

```bash
npm install
npm start
```

---

## Funcionalidades

- ✅ Download de música individual
- ✅ Download de playlist inteira
- ✅ Escolha de qualidade: 128 / 192 / 320 kbps
- ✅ Progresso em tempo real (SSE)
- ✅ Biblioteca de arquivos baixados
- ✅ Histórico de downloads

---

## Estrutura

```
ytmp3/
├── server.js        # Backend Express + yt-dlp
├── package.json
├── public/
│   └── index.html   # Frontend
└── downloads/       # Arquivos MP3 gerados
```

---

## Observações

- Os arquivos ficam salvos na pasta `downloads/`
- O histórico é em memória — reseta ao reiniciar o servidor
- Funciona com URLs do YouTube e YouTube Music
