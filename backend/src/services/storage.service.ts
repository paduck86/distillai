import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.middleware.js';

const BUCKET_NAME = 'audio';

export async function uploadAudio(
  userId: string,
  lectureId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  // Generate path: userId/lectureId/timestamp.extension
  const extension = getExtensionFromMimeType(mimeType);
  const timestamp = Date.now();
  const path = `${userId}/${lectureId}/${timestamp}.${extension}`;

  // Debug logging
  console.log('Storage upload attempt:', {
    bucket: BUCKET_NAME,
    path,
    bufferSize: `${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
    mimeType,
  });

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new AppError(500, 'UPLOAD_FAILED', `Failed to upload audio: ${error.message}`);
  }

  console.log('Storage upload success:', path);
  return path;
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new AppError(500, 'SIGNED_URL_FAILED', 'Failed to generate signed URL');
  }

  return data.signedUrl;
}

export async function deleteAudio(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Failed to delete audio:', error);
    // Don't throw - deletion failure shouldn't block other operations
  }
}

export async function getPublicUrl(path: string): Promise<string> {
  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'application/pdf': 'pdf',
  };

  return mimeToExt[mimeType] ?? 'bin';
}
