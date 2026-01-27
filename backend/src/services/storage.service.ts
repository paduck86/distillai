import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.middleware.js';

const BUCKET_NAME = 'audio';
const IMAGES_BUCKET = 'images';

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

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new AppError(500, 'UPLOAD_FAILED', `Failed to upload audio: ${error.message}`);
  }

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
    // Image types
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };

  return mimeToExt[mimeType] ?? 'bin';
}

// ============================================
// Image Storage Functions
// ============================================

/**
 * Upload an image to the images bucket
 */
export async function uploadImage(
  userId: string,
  distillationId: string,
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<string> {
  // Validate mime type
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!validImageTypes.includes(mimeType)) {
    throw new AppError(400, 'INVALID_IMAGE_TYPE', `Invalid image type: ${mimeType}`);
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new AppError(400, 'IMAGE_TOO_LARGE', 'Image must be less than 5MB');
  }

  // Generate path: userId/distillationId/timestamp.extension
  const extension = getExtensionFromMimeType(mimeType);
  const timestamp = Date.now();
  const safeName = filename ? filename.replace(/[^a-zA-Z0-9_-]/g, '_') : 'image';
  const path = `${userId}/${distillationId}/${timestamp}_${safeName}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from(IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new AppError(500, 'IMAGE_UPLOAD_FAILED', `Failed to upload image: ${error.message}`);
  }

  return path;
}

/**
 * Get public URL for an image
 */
export async function getImagePublicUrl(path: string): Promise<string> {
  const { data } = supabaseAdmin.storage
    .from(IMAGES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete an image from storage
 */
export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Failed to delete image:', error);
    // Don't throw - deletion failure shouldn't block other operations
  }
}
