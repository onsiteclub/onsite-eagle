import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'docs.json');
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      return NextResponse.json({ source: 'generated', count: data.length, data });
    }
    return NextResponse.json({ source: 'empty', count: 0, data: [] });
  } catch {
    return NextResponse.json({ source: 'error', count: 0, data: [] }, { status: 500 });
  }
}
