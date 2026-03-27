import { NextResponse } from 'next/server';
import { fetchInfo } from '@/lib/downloader';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    const info = await fetchInfo(url);
    return NextResponse.json(info);
  } catch (error) {
    console.error("Erro no /api/info:", error);
    return NextResponse.json({ error: error.message || 'Erro ao processar URL' }, { status: 500 });
  }
}
