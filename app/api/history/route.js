import { NextResponse } from 'next/server';
import { history } from '@/lib/downloader';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(history);
}

export async function DELETE() {
  history.length = 0;
  return NextResponse.json({ success: true });
}
