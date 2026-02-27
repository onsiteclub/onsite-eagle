import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'packages.json');
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      return NextResponse.json({ source: 'generated', data });
    }
    return NextResponse.json({ source: 'empty', data: [] });
  } catch {
    return NextResponse.json({ source: 'error', data: [] }, { status: 500 });
  }
}
