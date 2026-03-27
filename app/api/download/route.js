import { startDownload } from '@/lib/downloader';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { url, quality } = await request.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL é obrigatória' }), { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (data) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error("Erro ao enviar SSE:", e);
          }
        };

        try {
          await startDownload(url, quality || "192", sendSSE);
          try { controller.close(); } catch (err) {}
        } catch (e) {
          console.error("Falha no download:", e);
          try {
            controller.close();
          } catch (err) {}
        }
        
        // Next.js Route Handlers streams must not be closed prematurely if async process is ongoing
        // since `startDownload` returns a Promise that completes when spawn gets triggered, wait, 
        // startDownload IS async but does it wait for the whole progress to finish?
        // Ah! startDownload returns jobId immediately after spawning!
        // We SHOULD NOT close the controller until `proc.on('close')` inside startDownload fires!
        // Let's modify startDownload to return a Promise that resolves on close.
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
