import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import spotifyUrlInfo from 'spotify-url-info';

const { getTracks, getData } = spotifyUrlInfo(fetch);

// Determine the root directory to store downloads
// In standalone Docker it will be at /app/downloads
export const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

export async function fetchInfo(url) {
  if (!url) throw new Error("URL obrigatória");

  if (url.includes("spotify.com")) {
    try {
      const data = await getData(url);
      const isPlaylist = data.type === 'playlist' || data.type === 'album';
      const tracks = await getTracks(url);

      return {
        isPlaylist,
        count: tracks.length,
        title: data.name || data.title || "Spotify",
        items: tracks.map((t, idx) => ({
          id: t.id || idx.toString(),
          title: `${t.artist || t.artists?.[0]?.name || ''} - ${t.name}`
        }))
      };
    } catch (e) {
      throw new Error(`Erro ao buscar do Spotify: ${e.message}`);
    }
  }

  return new Promise((resolve, reject) => {
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
        return reject(new Error("Falha ao obter informações do yt-dlp: " + errorOutput));
      }
      try {
        const lines = output.trim().split("\n").filter(Boolean);
        const items = lines.map((line) => JSON.parse(line));
        const isPlaylist = items.length > 1;
        resolve({
          isPlaylist,
          count: items.length,
          title: isPlaylist ? (items[0]?.playlist_title || "Playlist") : items[0]?.title,
          items: items.map((i) => ({ id: i.id, title: i.title || i.id })),
        });
      } catch (e) {
        reject(new Error("Erro ao parsear resposta: " + e.message));
      }
    });
  });
}

// Memory History
export const history = [];

export async function startDownload(url, options, sendSSE) {
  const { type = "audio", quality = "192" } = typeof options === 'string' ? { quality: options } : options;
  const jobId = uuidv4();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${jobId}_%(autonumber)s_%(title)s.%(ext)s`);

  // Video quality
  const videoHeightMap = { "1080p": "1080", "720p": "720", "480p": "480", "360p": "360" };
  const targetHeight = videoHeightMap[quality] || "720";

  // Audio Quality map: 0 = best, 5 = mid, 9 = worst
  const qualityMap = { "320": "0", "192": "5", "128": "7" };
  const ytQuality = qualityMap[quality] || "5";

  let args = [];
  let batchFilePath = null;
  let spotifyTracks = null;
  const isVideo = type === "video" && !url.includes("spotify.com");

  try {
    if (url.includes("spotify.com")) {
      const tracks = await getTracks(url);
      if (!tracks || tracks.length === 0) {
        throw new Error("Nenhuma faixa encontrada no Spotify.");
      }
      spotifyTracks = tracks;

      batchFilePath = path.join(DOWNLOADS_DIR, `batch_${jobId}.txt`);
      const queries = tracks.map(t => {
        const artist = t.artist || (t.artists && t.artists[0] ? t.artists[0].name : "");
        return `ytsearch1:${artist} - ${t.name}`;
      }).join("\n");

      fs.writeFileSync(batchFilePath, queries, "utf-8");

      args = [
        "-a", batchFilePath,
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", ytQuality,
        "--no-playlist-reverse",
        "--newline",
        "--progress",
        "-o", outputTemplate,
        "--no-warnings",
      ];
    } else {
      if (isVideo) {
        args = [
          url,
          "-f", `bestvideo[height<=${targetHeight}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best`,
          "--merge-output-format", "mp4",
          "--no-playlist-reverse",
          "--newline",
          "--progress",
          "-o", outputTemplate,
          "--no-warnings",
        ];
      } else {
        args = [
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
      }
    }
  } catch (e) {
    sendSSE({ type: "error", message: e.message });
    throw e;
  }

  sendSSE({ type: "started", jobId });

  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args);
    let downloadedFiles = [];

    proc.stdout.on("data", (d) => {
      const text = d.toString();
      const progressMatch = text.match(/\[download\]\s+([\d.]+)%/);
      let destMatch = text.match(/\[ExtractAudio\] Destination: (.+\.mp3)/);
      if (!destMatch) {
        destMatch = text.match(/\[Merger\] Merging formats into "(.+\.mp4)"/);
      }
      if (!destMatch) {
        destMatch = text.match(/\[download\] Destination: (.+\.mp4)/);
      }

      if (progressMatch) {
        sendSSE({ type: "progress", percent: parseFloat(progressMatch[1]), raw: text.trim() });
      }
      if (destMatch) {
        let filePath = destMatch[1].trim();
        let fileName = path.basename(filePath);

        downloadedFiles.push(fileName);
        sendSSE({ type: "file", fileName, filePath: `/downloads/${fileName}` });
      }
    });

    proc.stderr.on("data", (d) => {
      sendSSE({ type: "log", message: d.toString().trim() });
    });

    proc.on("close", (code) => {
      if (batchFilePath && fs.existsSync(batchFilePath)) {
        try { fs.unlinkSync(batchFilePath); } catch (e) { }
      }

      const finalFiles = downloadedFiles.map(fileName => {
        let finalName = fileName.replace(/^[a-f0-9-]+_\d{5}_/, "");

        if (spotifyTracks) {
          const matchIdx = fileName.match(/_(\d{5})_/);
          if (matchIdx) {
            const idx = parseInt(matchIdx[1], 10) - 1;
            const track = spotifyTracks[idx];
            if (track) {
              const artist = track.artist || (track.artists && track.artists[0] ? track.artists[0].name : "");
              const safeName = `${artist} - ${track.name}`.replace(/[\\/:*?"<>|]/g, "_");
              finalName = `${safeName}.mp3`;
            }
          }
        }

        const oldPath = path.join(DOWNLOADS_DIR, fileName);
        const newPath = path.join(DOWNLOADS_DIR, finalName);

        try {
          if (oldPath !== newPath && fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            return finalName;
          }
        } catch (e) {
          console.error("Rename failed on close:", e);
        }
        return fileName;
      });

      if (code === 0) {
        const entry = {
          id: jobId,
          url,
          quality,
          files: finalFiles,
          date: new Date().toISOString(),
          status: "success",
        };
        history.unshift(entry);
        if (history.length > 50) history.pop();
        sendSSE({ type: "done", files: finalFiles });
        resolve(jobId);
      } else {
        sendSSE({ type: "error", message: "Download falhou" });
        reject(new Error("Download falhou com código " + code));
      }
    });
  });
}
