import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';
import { assetUploadSchema } from '@/lib/validation';

const MIME_TO_TYPE: Record<string, string> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'audio',
  'audio/webm': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
};

const CLOUDINARY_FOLDERS: Record<string, string> = {
  image: 'voicecart/assets/images',
  video: 'voicecart/assets/videos',
  audio: 'voicecart/assets/audio',
};

const CLOUDINARY_RESOURCE: Record<string, 'image' | 'video' | 'raw' | 'auto'> = {
  image: 'image',
  video: 'video',
  audio: 'video', // Cloudinary uses 'video' resource type for audio
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const assets = await prisma.asset.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assets });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const typeRaw = formData.get('type') as string | null;
    const typeParsed = typeRaw ? assetUploadSchema.safeParse({ type: typeRaw }) : null;
    const typeHint = typeParsed?.success ? typeParsed.data.type : null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const mimeType = file.type;
    const assetType = typeHint || MIME_TO_TYPE[mimeType];
    if (!assetType || !CLOUDINARY_FOLDERS[assetType]) {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const resourceType = CLOUDINARY_RESOURCE[assetType] || 'image';
    const folder = CLOUDINARY_FOLDERS[assetType] || 'voicecart/assets';

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: folder,
          format: file.name?.split('.').pop() || undefined,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string; public_id: string });
        }
      );
      uploadStream.end(buffer);
    });

    const asset = await prisma.asset.create({
      data: {
        userId: session.id,
        type: assetType,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    });

    return NextResponse.json({ asset });
  } catch (err) {
    console.error('Asset upload error:', err);
    return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 });
  }
}
