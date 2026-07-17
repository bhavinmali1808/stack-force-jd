/**
 * useUploadQueue.js
 * ─────────────────────────────────────────────────────────────
 * Custom hook that implements the distributed upload flow:
 *
 *   DEVELOPMENT (direct: false):
 *     1. POST /api/storage/presign  → get tokens
 *     2. PUT  /api/storage/upload/:token → upload to server
 *
 *   PRODUCTION (direct: true — Cloudflare R2):
 *     1. POST /api/storage/presign  → get real R2 presigned PUT URLs
 *     2. PUT  presignedUrl          → client uploads DIRECTLY to R2
 *     3. POST /api/storage/confirm/:token → server enqueues the job
 *
 *   Both flows then:
 *     4. Socket.io → listens for `candidate:processed` events
 *     5. State     → exposes { queued, processing, done, failed, progress }
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useUploadQueue(roleId) {
  const [total, setTotal] = useState(0);
  const [uploaded, setUploaded] = useState(0);   // files sent to storage
  const [processed, setProcessed] = useState(0); // resumes fully parsed by worker
  const [failed, setFailed] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [uploadError, setUploadError] = useState(null);

  const socketRef = useRef(null);
  const tokenRef = useRef(localStorage.getItem('sf_token'));

  // ── Socket.io connection — joins role room, listens for events ──
  useEffect(() => {
    if (!roleId) return;

    const socket = io(API_BASE, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-role', roleId);
      console.log(`🔌 [Queue] Joined Socket.io room: role:${roleId}`);
    });

    socket.on('candidate:processed', (data) => {
      setProcessed((n) => n + 1);
      setLiveResults((prev) => [data, ...prev].slice(0, 200));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roleId]);

  // ── Main upload function ──────────────────────────────────────
  const startUpload = useCallback(async (files) => {
    if (!files.length || !roleId) return;

    setIsUploading(true);
    setUploadError(null);
    setTotal(files.length);
    setUploaded(0);
    setProcessed(0);
    setFailed(0);
    setLiveResults([]);

    const authHeader = { Authorization: `Bearer ${tokenRef.current}` };

    try {
      // Step 1: Batch presign
      const { data } = await axios.post(
        `${API_BASE}/api/storage/presign`,
        { roleId, files: files.map((f) => ({ name: f.name, size: f.size })) },
        { headers: authHeader },
      );

      const tokens = data.tokens; // [{ token, uploadUrl, confirmUrl?, filename, direct }]

      // Step 2: Upload all files in batches of 10
      const BATCH_SIZE = 10;
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async ({ token, uploadUrl, confirmUrl, direct }, batchIdx) => {
            const file = files[i + batchIdx];
            const form = new FormData();
            form.append('file', file);
            try {
              if (direct) {
                // PRODUCTION: upload directly to R2, then confirm with backend
                await axios.put(uploadUrl, file, {
                  headers: { 'Content-Type': file.type || 'application/octet-stream' },
                });
                // Confirm job enqueue with backend
                await axios.post(`${API_BASE}${confirmUrl}`, {}, { headers: authHeader });
              } else {
                // DEVELOPMENT: upload to our own server
                await axios.put(`${API_BASE}${uploadUrl}`, form, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                    ...authHeader,
                  },
                });
              }
              setUploaded((n) => n + 1);
            } catch (e) {
              setFailed((n) => n + 1);
              console.error(`Failed to upload ${file?.name}:`, e.message);
            }
          }),
        );
      }

      console.log(`✅ [Queue] All ${files.length} files uploaded. Worker processing in background...`);
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message);
    } finally {
      setIsUploading(false);
    }
  }, [roleId]);

  const reset = useCallback(() => {
    setTotal(0);
    setUploaded(0);
    setProcessed(0);
    setFailed(0);
    setLiveResults([]);
    setUploadError(null);
    setIsUploading(false);
  }, []);

  const uploadProgress = total > 0 ? Math.round((uploaded / total) * 50) : 0;
  const processProgress = total > 0 ? Math.round((processed / total) * 50) : 0;
  const overallProgress = Math.min(uploadProgress + processProgress, 100);

  return {
    startUpload,
    reset,
    total,
    uploaded,
    processed,
    failed,
    isUploading,
    isProcessing: uploaded > 0 && processed < uploaded,
    overallProgress,
    liveResults,
    uploadError,
    isDone: total > 0 && processed >= total && !isUploading,
  };
}
