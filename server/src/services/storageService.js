/**
 * storageService.js — Unified file storage abstraction
 * ─────────────────────────────────────────────────────────────
 * In DEVELOPMENT  → saves to local disk (./uploads/)
 * In PRODUCTION   → uses Cloudflare R2 (S3-compatible)
 *
 * Usage:
 *   const { getPresignedUploadUrl, deleteFile, getDownloadUrl } = require('./storageService');
 */

const path = require('path');
const fs = require('fs');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Production: Cloudflare R2 ─────────────────────────────────
let s3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, getSignedUrl;
if (IS_PRODUCTION) {
  const { S3Client, PutObjectCommand: Put, DeleteObjectCommand: Del, GetObjectCommand: Get } = require('@aws-sdk/client-s3');
  const { getSignedUrl: gsu } = require('@aws-sdk/s3-request-presigner');

  PutObjectCommand = Put;
  DeleteObjectCommand = Del;
  GetObjectCommand = Get;
  getSignedUrl = gsu;

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME || 'talentforce-resumes';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * Generate a presigned URL for the client to upload directly to R2.
 * In dev, returns a local upload endpoint URL instead.
 *
 * @param {string} key - The object key (path in bucket), e.g. "resumes/uuid.pdf"
 * @param {string} contentType - MIME type
 * @param {number} expiresIn - Seconds until the presigned URL expires
 * @returns {Promise<string>} - The presigned upload URL
 */
async function getPresignedUploadUrl(key, contentType = 'application/octet-stream', expiresIn = 900) {
  if (!IS_PRODUCTION) {
    // In dev, just return our local upload endpoint token path
    // (handled by storage.routes.js with multer)
    return null;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from storage.
 * @param {string} key - Object key or local path
 */
async function deleteFile(key) {
  if (!IS_PRODUCTION) {
    const fullPath = path.join(__dirname, '../../uploads', key.replace('/uploads/', ''));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return;
  }

  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Get a public URL for a stored file.
 * @param {string} key - Object key
 * @returns {string} - Public URL
 */
function getPublicUrl(key) {
  if (!IS_PRODUCTION) {
    return key; // Local URL like /uploads/resumes/file.pdf
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Download a file buffer from R2 (used by workers in production).
 * @param {string} key - Object key
 * @returns {Promise<Buffer>}
 */
async function downloadBuffer(key) {
  if (!IS_PRODUCTION) {
    const localPath = key.startsWith('/uploads/')
      ? path.join(__dirname, '../../', key)
      : key;
    return fs.readFileSync(localPath);
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3Client.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = { getPresignedUploadUrl, deleteFile, getPublicUrl, downloadBuffer, IS_PRODUCTION, BUCKET };
