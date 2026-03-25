const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;
const DOWNLOADS_DIR = path.join(__dirname, "downloads");

if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/downloads", express.static(DOWNLOADS_DIR));

// In-memory history store
const history = [];

// SSE clients for progress streaming
const sseClients = {};

// ─── SSE endpoint ────────────────────────────────────────────────────────────
app.get("/api/progress/:jobId", (req, res) => {
  const { jobId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients[jobId] = res;

  req.on("close", () => {
    delete sseClients[jobId];
  });
});

function sendSSE(jobId, data) {
  const client = sseClients[jobId];
  if (client) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// ─── Get playlist/video info ─────────────────────────────────────────────────
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL obrigatória" });

  const args = [
    "--dump-json",
    "--flat-playlist",
    "--no-warnings",
    url,
  ];

  const proc = spawn("yt-dlp", args);
  let output = "";
  let errorOutput = "";

  proc.stdout.on("data", (d) => (output += d.toString()));
  proc.stderr.on("data", (d) => (errorOutput += d.toString()));

  proc.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: "Falha ao obter informações", details: errorOutput });
    }
    try {
      const lines = output.trim().split("\n").filter(Boolean);
      const items = lines.map((line) => JSON.parse(line));
      const isPlaylist = items.length > 1;
      res.json({
        isPlaylist,
        count: items.length,
        title: isPlaylist ? (items[0]?.playlist_title || "Playlist") : items[0]?.title,
        items: items.map((i) => ({ id: i.id, title: i.title || i.id })),
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao parsear resposta", details: e.message });
    }
  });
});

// ─── Download endpoint ────────────────────────────────────────────────────────
app.post("/api/download", (req, res) => {
  const { url, quality = "192" } = req.body;
  if (!url) return res.status(400).json({ error: "URL obrigatória" });

  const jobId = uuidv4();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${jobId}_%(playlist_index)s_%(title)s.%(ext)s`);

  // Quality map: 0 = best, 5 = mid, 9 = worst
  const qualityMap = { "320": "0", "192": "5", "128": "7" };
  const ytQuality = qualityMap[quality] || "5";

  const args = [
    url,
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", ytQuality,
    "--no-playlist-reverse",
    "--newline",
    "--progress",
    "-o", outputTemplate,
    "--no-warnings",
  ];

  res.json({ jobId });

  const proc = spawn("yt-dlp", args);
  let downloadedFiles = [];

  proc.stdout.on("data", (d) => {
    const text = d.toString();
    // Parse progress lines
    const progressMatch = text.match(/\[download\]\s+([\d.]+)%/);
    const destMatch = text.match(/\[ExtractAudio\] Destination: (.+\.mp3)/);

    if (progressMatch) {
      sendSSE(jobId, { type: "progress", percent: parseFloat(progressMatch[1]), raw: text.trim() });
    }
    if (destMatch) {
      const filePath = destMatch[1].trim();
      const fileName = path.basename(filePath);
      downloadedFiles.push(fileName);
      sendSSE(jobId, { type: "file", fileName, filePath: `/downloads/${fileName}` });
    }
  });

  proc.stderr.on("data", (d) => {
    sendSSE(jobId, { type: "log", message: d.toString().trim() });
  });

  proc.on("close", (code) => {
    if (code === 0) {
      // Save to history
      const entry = {
        id: jobId,
        url,
        quality,
        files: downloadedFiles,
        date: new Date().toISOString(),
        status: "success",
      };
      history.unshift(entry);
      if (history.length > 50) history.pop();
      sendSSE(jobId, { type: "done", files: downloadedFiles });
    } else {
      sendSSE(jobId, { type: "error", message: "Download falhou" });
    }
    // Close SSE
    setTimeout(() => {
      const client = sseClients[jobId];
      if (client) {
        client.end();
        delete sseClients[jobId];
      }
    }, 2000);
  });
});

// ─── History ──────────────────────────────────────────────────────────────────
app.get("/api/history", (req, res) => {
  res.json(history);
});

app.delete("/api/history", (req, res) => {
  history.length = 0;
  res.json({ ok: true });
});

// ─── List downloaded files ────────────────────────────────────────────────────
app.get("/api/files", (req, res) => {
  const files = fs.readdirSync(DOWNLOADS_DIR)
    .filter((f) => f.endsWith(".mp3"))
    .map((f) => ({
      name: f,
      url: `/downloads/${f}`,
      size: fs.statSync(path.join(DOWNLOADS_DIR, f)).size,
      date: fs.statSync(path.join(DOWNLOADS_DIR, f)).mtime,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(files);
});

app.listen(PORT, () => {
  console.log(`\n🎵 YT MP3 rodando em http://localhost:${PORT}\n`);
});
