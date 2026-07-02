import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // Require CRON_SECRET for endpoint security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const now = new Date();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stale = await prisma.ad.findMany({
      where: {
        status: 'processing',
        createdAt: { lte: fiveMinutesAgo },
      },
      select: { id: true },
    });

    if (stale.length > 0) {
      await prisma.ad.updateMany({
        where: { id: { in: stale.map((a: { id: string }) => a.id) } },
        data: { status: 'failed' },
      });
      await prisma.adProcessingJob.updateMany({
        where: { adId: { in: stale.map((a: { id: string }) => a.id) }, status: 'processing' },
        data: { status: 'failed', lastError: 'Stale timeout after 5 minutes' },
      });
    }

    const dueJobs = await prisma.adProcessingJob.findMany({
      where: {
        status: 'pending',
        retryCount: { gt: 0 },
        nextRetryAt: { lte: now },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003';
    const results = await Promise.allSettled(
      (dueJobs as { adId: string; language: string }[]).map(job =>
        fetch(`${baseUrl}/api/process-ad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adId: job.adId, language: job.language }),
        })
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;

    return NextResponse.json({
      staleTimedOut: stale.length,
      retried: dueJobs.length,
      succeeded,
      failed: dueJobs.length - succeeded,
    });
  } catch (error) {
    console.error('[retry-queue] Error:', error);
    return NextResponse.json({ error: 'Queue processing failed' }, { status: 500 });
  }
}
