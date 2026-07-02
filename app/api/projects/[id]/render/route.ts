import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== session.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.status === 'completed' && project.renderUrl) {
      return NextResponse.json({ success: true, status: 'completed', renderUrl: project.renderUrl });
    }

    await prisma.project.update({
      where: { id },
      data: { status: 'processing' },
    });

    // Trigger async rendering via fetch (non-blocking)
    // In production, this should connect to:
    //   - Remotion (server-side React video rendering)
    //   - Shotstack (cloud video editing API)
    //   - Cloudinary video generation
    // See /docs/rendering.md for integration guide
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    fetch(`${baseUrl}/api/projects/${id}/render/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(err => console.error('[render] Trigger error:', err));

    return NextResponse.json({ success: true, status: 'processing' });
  } catch (error) {
    console.error('[render] Error:', error);
    return NextResponse.json({ error: 'Failed to trigger render' }, { status: 500 });
  }
}
