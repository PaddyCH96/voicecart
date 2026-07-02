import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const ad = await prisma.ad.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        inputAudioUrl: true,
        outputAudioUrl: true,
        transcript: true,
        generatedText: true,
        createdAt: true,
      },
    });

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json(ad);
  } catch (error) {
    console.error('Get ad error:', error);
    return NextResponse.json({ error: 'Failed to fetch ad' }, { status: 500 });
  }
}
