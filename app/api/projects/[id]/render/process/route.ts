import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderProjectVideo } from '@/lib/render-video';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[render/process] Starting render for project ${id}`);

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Cloudinary not configured: gracefully mark as draft
      console.warn('[render/process] Cloudinary not configured. Cannot render.');
      await prisma.project.update({
        where: { id },
        data: { status: 'draft' },
      });
      return NextResponse.json({
        success: true,
        status: 'draft',
        message: 'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to enable video rendering.',
      });
    }

    const renderUrl = await renderProjectVideo(id);

    await prisma.project.update({
      where: { id },
      data: {
        status: 'completed',
        renderUrl,
      },
    });

    console.log(`[render/process] Project ${id} rendered: ${renderUrl}`);

    return NextResponse.json({ success: true, status: 'completed', renderUrl });
  } catch (error) {
    console.error(`[render/process] Error for project ${id}:`, error);

    await prisma.project.update({
      where: { id },
      data: { status: 'failed' },
    }).catch(console.error);

    return NextResponse.json({ error: 'Render processing failed' }, { status: 500 });
  }
}
