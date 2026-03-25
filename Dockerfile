FROM node:20-slim

# Instala ffmpeg, python3, pip e dependências do yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    --no-install-recommends \
    && pip3 install -q yt-dlp --break-system-packages \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências Node
COPY package.json .
RUN npm install --omit=dev

# Copia o restante
COPY server.js .
COPY public/ ./public/

# Pasta de downloads (será montada como volume)
RUN mkdir -p /app/downloads

EXPOSE 3000

CMD ["node", "server.js"]
