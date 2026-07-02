import cloudinary from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';

interface Layer {
  id: string;
  type: 'video' | 'image' | 'text' | 'audio';
  content: string;
  start: number;
  end: number;
}

async function uploadToCloudinary(url: string, folder: string): Promise<string> {
  const result = await cloudinary.uploader.upload(url, {
    folder,
    resource_type: 'auto',
  });
  return result.public_id;
}

function buildCompositionUrl(
  _cloudName: string,
  layers: Layer[]
): string {
  // Find the background layer (first image/video) or use a default
  const bgLayer = layers.find(l => l.type === 'image' || l.type === 'video');
  const basePublicId = bgLayer?.content || 'demo/video/beach_lwyr6c';

  // Build transformation chain for overlays
  const overlayParts: string[] = [];

  // Text overlays
  const textOverlays: Layer[] = layers.filter(l => l.type === 'text');

  // Layering approach: each overlay is a separate chained transformation
  // Cloudinary reads left-to-right, so we can chain multiple overlays
  for (let i = 0; i < textOverlays.length; i++) {
    const clean = textOverlays[i].content
      .replace(/&/g, 'and')
      .replace(/[?!#$%^*();:'",<>[\]{}\\/|~`]/g, '')
      .trim()
      .substring(0, 60)
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');

    if (clean) {
      overlayParts.push(
        `l_text:Arial_45:${clean}`,
        `co_rgb:FFFFFF`,
        `so_${textOverlays[i].start}`,
        `eo_${textOverlays[i].end}`,
        `fl_layer_apply`
      );
    }
  }

  // Overlay additional images/videos beyond the first background
  const extraMedia = layers.filter(
    l => (l.type === 'image' || l.type === 'video') && l.content !== basePublicId
  );
  for (const ml of extraMedia) {
    overlayParts.push(
      `l_layer:${encodeURIComponent(ml.content)}`,
      `w_1080,h_1920,c_fill`,
      `e_unscreen:80`,
      `so_${ml.start}`,
      `eo_${ml.end}`,
      `fl_layer_apply`
    );
  }

  // Background music via audio merge
  const audioLayer = layers.find(l => l.type === 'audio' && l.content.startsWith('http'));
  if (audioLayer) {
    overlayParts.push(`e_merge:${encodeURIComponent(audioLayer.content)}`);
  }

  // Build the full URL
  // Format: base transformation + overlays + base video
  const baseTransformations = `w_1080,h_1920,c_fill,b_%230A0A0A`;
  const overlayChain = overlayParts.length > 0 ? `/${overlayParts.join('/')}` : '';
  const url = `https://res.cloudinary.com/${_cloudName}/video/upload/${baseTransformations}${overlayChain}/${basePublicId}.mp4`;

  return url;
}

export async function renderProjectVideo(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');

  const layers = (project.assets as { layers?: Layer[] })?.layers || [];
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error('Cloudinary not configured');

  // Upload external media assets to Cloudinary
  const uploadFolder = `voicecart/renders/${projectId}`;
  for (const layer of layers) {
    if (
      (layer.type === 'image' || layer.type === 'video') &&
      layer.content.startsWith('http') &&
      !layer.content.includes('cloudinary.com')
    ) {
      try {
        const pid = await uploadToCloudinary(layer.content, uploadFolder);
        layer.content = pid;
      } catch (err) {
        console.warn(`[render] Failed to upload ${layer.content}:`, err);
      }
    }
  }

  // Build Cloudinary-composed video URL
  const renderUrl = buildCompositionUrl(cloudName, layers);

  return renderUrl;
}
