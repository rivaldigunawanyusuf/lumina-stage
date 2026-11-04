import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * GET /api/scene?prompt=...
 *
 * Same-origin studio scene asset endpoint for the HTML5 Canvas / WebGL compositor.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = (searchParams.get('prompt') || '').toLowerCase();

  let backdropFile = 'backdrop_aura_studio.png';
  if (prompt.includes('slate') || prompt.includes('dark') || prompt.includes('neon') || prompt.includes('cold')) {
    backdropFile = 'backdrop_kinetix_studio.png';
  } else if (prompt.includes('marble') || prompt.includes('carrara') || prompt.includes('kitchen')) {
    backdropFile = 'backdrop_veloce_studio.png';
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'showcase', backdropFile);
    const bytes = fs.readFileSync(filePath);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Studio Scene load failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
