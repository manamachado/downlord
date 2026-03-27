"use client";

import { useState, useEffect, useRef } from "react";
import { Music, Download, Check, AlertCircle, Loader2, PlayCircle, HardDrive, RefreshCcw, Trash2 } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [quality, setQuality] = useState("192");
  const [activeJob, setActiveJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [files, setFiles] = useState([]);
  
  const progressRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (Array.isArray(data)) setFiles(data);
    } catch (error) {
      console.error("Erro ao carregar arquivos:", error);
    }
  };

  const handleUrlChange = async (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setInfo(null);

    if (newUrl.length > 10 && (newUrl.includes("youtube.com") || newUrl.includes("youtu.be") || newUrl.includes("spotify.com"))) {
      setLoadingInfo(true);
      try {
        const res = await fetch("/api/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: newUrl }),
        });
        const data = await res.json();
        if (data.title) setInfo(data);
      } catch (err) {
        console.error("Link verification failed", err);
      }
      setLoadingInfo(false);
    }
  };

  const startDownload = async () => {
    if (!url) return;
    
    setActiveJob("starting");
    setProgress(0);
    setLogs([]);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, quality }),
      });

      if (!response.body) throw new Error("Sem resposta do servidor");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); 

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            try {
              const data = JSON.parse(part.replace("data: ", ""));
              
              if (data.type === "started") {
                setActiveJob(data.jobId);
              } else if (data.type === "progress") {
                setProgress(data.percent);
                setLogs(prev => [...prev, data.raw]);
              } else if (data.type === "log") {
                setLogs(prev => [...prev, data.message]);
              } else if (data.type === "file") {
                setLogs(prev => [...prev, `🎵 Finalizado: ${data.fileName}`]);
              } else if (data.type === "done") {
                setActiveJob("done");
                fetchFiles();
              } else if (data.type === "error") {
                setActiveJob("error");
                setLogs(prev => [...prev, `❌ ERRO: ${data.message}`]);
              }
            } catch (err) {
              console.error("Error parsing event:", err);
            }
          }
        }
      }
    } catch (err) {
      setActiveJob("error");
      setLogs(prev => [...prev, `❌ Erro de conexão: ${err.message}`]);
    }
  };

  const formatSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const deleteFile = async (filename) => {
    try {
      await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      fetchFiles();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 min-h-screen pb-20">
      <header className="flex items-center gap-4 py-10 mb-8 border-b border-white/5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Music className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-jakarta">SoundVault</h1>
          <p className="text-zinc-400 text-sm">Download Local Engine</p>
        </div>
      </header>

      <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl mb-10">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-400" /> Baixar Nova Música
        </h2>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Cole o link do YouTube ou Playlist do Spotify"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 pl-12 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-inter"
              value={url}
              onChange={handleUrlChange}
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              {loadingInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mt-2">
            <div className="flex gap-3">
              {["320", "192", "128"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    quality === q
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50"
                      : "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10"
                  }`}
                >
                  {q} kbps
                </button>
              ))}
            </div>

            <button
              onClick={startDownload}
              disabled={!url || activeJob === "starting" || (typeof activeJob === "string" && activeJob.includes("-"))}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
            >
              Iniciar Conversão
            </button>
          </div>
        </div>

        {info && !loadingInfo && (
          <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Check className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-100">{info.title}</h3>
              <p className="text-zinc-400 text-sm mt-1">
                {info.isPlaylist ? `Playlist detectada com ${info.count} faixas.` : "Vídeo único detectado."} Formato alvo: {quality} kbps
              </p>
            </div>
          </div>
        )}

        {/* Progress & Logs UI */}
        {activeJob && activeJob !== "error" && (
          <div className="mt-8 border-t border-white/5 pt-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-300 font-medium">Extraindo Áudio...</span>
              <span className="text-pink-400 font-bold">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-black/50 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div 
              ref={progressRef}
              className="bg-black/60 font-mono text-xs text-zinc-400 p-4 rounded-xl min-h-[120px] max-h-[250px] border border-white/5 overflow-y-auto whitespace-pre-wrap flex flex-col gap-1"
            >
              {logs.length === 0 ? "Aguardando inicialização..." : logs.map((log, i) => (
                <div key={i} className={`${log.includes("Finalizado") ? "text-emerald-400" : log.includes("ERRO") ? "text-rose-400" : ""}`}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-pink-400" /> Biblioteca Local
          </h2>
          <button onClick={fetchFiles} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
          {files.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">
              <p>O cofre está vazio.</p>
              <p className="text-sm mt-1">Comece colando um link acima.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {files.map((file) => (
                <li key={file.name} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-200 font-medium truncate">{file.name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{formatSize(file.sizeBytes)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                    <a 
                      href={file.path} 
                      download 
                      className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-lg text-sm font-medium transition-colors"
                    >
                      Salvar
                    </a>
                    <button 
                      onClick={() => deleteFile(file.name)}
                      className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                      title="Deletar localmente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
