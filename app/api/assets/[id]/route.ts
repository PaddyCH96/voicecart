import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.userId !== session.id) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Clean up from Cloudinary
    const resourceType = asset.type === 'audio' ? 'video' : asset.type;
    cloudinary.uploader.destroy(asset.publicId, { resource_type: resourceType })
      .catch(err => console.error('Cloudinary cleanup error:', err));

    await prisma.asset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Asset delete error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
