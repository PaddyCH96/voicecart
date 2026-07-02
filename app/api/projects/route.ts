import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createProjectSchema } from '@/lib/validation';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const projects = await prisma.project.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    const name = parsed.success ? parsed.data.name : 'Untitled Video';
    const type = parsed.success ? parsed.data.type : 'video';

    const planLimits = session.plan === 'pro' ? Infinity : 5;
    const projectCount = await prisma.project.count({ where: { userId: session.id } });
    if (projectCount >= planLimits) {
      return NextResponse.json({ error: 'Upgrade to Pro to create more projects' }, { status: 403 });
    }

    const project = await prisma.project.create({
      data: {
        userId: session.id,
        name,
        type,
        adId: body.adId || undefined,
        assets: { layers: [] },
        status: 'draft',
      },
    });

    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
