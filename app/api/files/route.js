import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DOWNLOADS_DIR } from '@/lib/downloader';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR)
      .filter(f => !f.startsWith('.') && (f.endsWith('.mp3') || f.endsWith('.webm') || f.endsWith('.m4a') || f.endsWith('.mp4') || f.endsWith('.mkv')))
      .map(f => {
        const stats = fs.statSync(path.join(DOWNLOADS_DIR, f));
        return {
          name: f,
          sizeBytes: stats.size,
          createdAt: stats.birthtime,
          path: `/downloads/${f}`
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json(files);
  } catch (error) {
    console.error("Erro ao listar arquivos:", error);
    return NextResponse.json({ error: 'Erro ao listar arquivos' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { filename } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: 'Nome do arquivo é obrigatório' }, { status: 400 });
    }

    const filepath = path.join(DOWNLOADS_DIR, path.basename(filename));
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar arquivo' }, { status: 500 });
  }
}
