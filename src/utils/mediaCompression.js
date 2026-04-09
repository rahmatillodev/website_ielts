const DEFAULT_MAX_AVATAR_EDGE = 512;
const DEFAULT_AVATAR_QUALITY = 0.78;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create compressed image blob'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

export async function compressAvatarImage(file, options = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;

  const maxEdge = options.maxEdge ?? DEFAULT_MAX_AVATAR_EDGE;
  const quality = options.quality ?? DEFAULT_AVATAR_QUALITY;
  const preferredType = options.type ?? 'image/webp';

  const image = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  let blob;
  try {
    blob = await canvasToBlob(canvas, preferredType, quality);
  } catch {
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
  }

  const outputType = blob.type || preferredType;
  const extension = outputType.includes('webp') ? 'webp' : 'jpg';
  const baseName = (file.name || 'avatar').replace(/\.[^.]+$/, '');

  return new File([blob], `${baseName}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

// Browser-friendly audio strategy for speech uploads:
// - prefer audio/webm;codecs=opus, mono, 16kHz, ~32-48kbps
// - fallback to AAC at ~64kbps where Opus is unavailable
// This project currently records audio via MediaRecorder, so these
// constraints should be set at recording time before upload.
