import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GEMINI_MODEL_ID, OFFICIAL_MODEL_DOC_URL, OFFICIAL_AI_STUDIO_KEYS_URL, OFFICIAL_GCP_CREDENTIALS_URL } from './server/constants.js';
import { encryptValue, decryptValue, maskApiKey, isEphemeralKey, type EncryptedPayload } from './server/crypto.js';
import { validateGeminiKey, generateVideoScript, generateTopicVideoScript, generateVideoPrompts, generateSingleVideoPrompt, generateYouTubeSEO, regenerateSEOSection, generateThumbnailStudioPackage, regenerateThumbnailConcept } from './server/geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parsing with 2mb limit for articles
app.use(express.json({ limit: '2mb' }));

// Simple in-memory rate limiter per IP for security endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || entry.resetAt < now) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before retrying.',
      });
    }

    entry.count += 1;
    return next();
  };
}

// In-memory encrypted store for configured user API keys
// Keyed by Firebase authenticated user ID
interface StoredUserKey {
  userId: string;
  encrypted: EncryptedPayload;
  maskedKey: string;
  configuredAt: number;
  lastValidatedAt: number;
  model: string;
}

const userKeysStore = new Map<string, StoredUserKey>();

/**
 * Formats API errors cleanly into structured JSON with accurate HTTP status codes.
 * Detects stringified JSON from Google GenAI SDK, 503 high demand, rate limits, and timeouts.
 */
export function formatApiError(error: any): { status: number; body: { error: string; code: string; is503?: boolean } } {
  let msg = error?.message || 'Internal server error occurred.';
  let code = error?.code || 'INTERNAL_ERROR';
  let status = error?.status || 500;

  // Check if error is stringified JSON from Google GenAI SDK
  if (typeof msg === 'string' && msg.trim().startsWith('{') && msg.includes('"error"')) {
    try {
      const parsed = JSON.parse(msg.trim());
      if (parsed.error?.message) {
        msg = parsed.error.message;
      }
      if (parsed.error?.code) {
        status = Number(parsed.error.code) || status;
      }
      if (parsed.error?.status) {
        code = parsed.error.status;
      }
    } catch {
      // ignore parse failure
    }
  }

  const lower = (msg + ' ' + code).toLowerCase();

  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand') || lower.includes('overloaded')) {
    return {
      status: 503,
      body: {
        error: 'The Gemini model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again in a few moments.',
        code: 'MODEL_HIGH_DEMAND_503',
        is503: true,
      },
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      status: 504,
      body: {
        error: 'Generation timed out after 35 seconds. Please try again with a slightly shorter input or try again.',
        code: 'GENERATION_TIMEOUT',
      },
    };
  }

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || status === 401 || status === 403) {
    return {
      status: 403,
      body: {
        error: 'Configured Gemini API key is invalid or lacks required permissions. Please verify your key in the Gemini API Configuration section.',
        code: 'API_KEY_INVALID',
      },
    };
  }

  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      body: {
        error: 'Gemini API quota exceeded for this key. Please check your quota limits in Google AI Studio or Google Cloud Console.',
        code: 'QUOTA_EXCEEDED',
      },
    };
  }

  return {
    status,
    body: {
      error: msg,
      code,
    },
  };
}

// API Routes

/**
 * Health check & architectural status
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    mandatoryModel: GEMINI_MODEL_ID,
    encryptionMode: 'AES-256-GCM',
    isEphemeralEncryptionKey: isEphemeralKey,
    documentation: {
      modelDoc: OFFICIAL_MODEL_DOC_URL,
      aiStudioKeys: OFFICIAL_AI_STUDIO_KEYS_URL,
      gcpCredentials: OFFICIAL_GCP_CREDENTIALS_URL,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Google Drive status validation endpoint
 * Validates the caller's OAuth token against Google Drive API
 */
app.get('/api/drive/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      authorized: false,
      error: 'No authorization bearer token provided.',
      scope: 'https://www.googleapis.com/auth/drive.file',
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.json({
      authorized: false,
      error: 'Bearer token is empty.',
      scope: 'https://www.googleapis.com/auth/drive.file',
    });
  }

  try {
    // Validate with Google Drive 'about' endpoint
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data: any = await response.json();
      return res.json({
        authorized: true,
        scope: 'https://www.googleapis.com/auth/drive.file',
        driveUser: {
          displayName: data?.user?.displayName || 'Drive User',
          emailAddress: data?.user?.emailAddress || '',
          permissionId: data?.user?.permissionId || '',
        },
        storageQuota: data?.storageQuota ? {
          limit: data.storageQuota.limit,
          usage: data.storageQuota.usage,
          usageInDrive: data.storageQuota.usageInDrive,
        } : null,
      });
    }

    const errJson: any = await response.json().catch(() => ({}));
    return res.json({
      authorized: false,
      status: response.status,
      error: errJson?.error?.message || 'Drive token is invalid, expired, or missing drive.file scope.',
    });
  } catch (error: any) {
    return res.status(500).json({
      authorized: false,
      error: 'Failed to verify Google Drive authorization with Google servers.',
    });
  }
});

/**
 * Revoke Google Drive OAuth access token
 */
app.post('/api/drive/revoke', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Missing access token to revoke.' });
  }

  const token = authHeader.substring(7).trim();
  try {
    const revokeRes = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return res.json({
      revoked: revokeRes.ok,
      message: revokeRes.ok ? 'Google Drive authorization token revoked successfully.' : 'Token was already revoked or invalid.',
    });
  } catch {
    return res.json({ revoked: false, message: 'Could not contact Google revocation endpoint.' });
  }
});

/**
 * Validate Gemini API Key without saving
 */
app.post('/api/gemini/validate', rateLimiter(15, 60000), async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ valid: false, message: 'API key is required.' });
  }

  const result = await validateGeminiKey(apiKey);
  return res.json({
    valid: result.valid,
    model: result.model,
    maskedKey: maskApiKey(apiKey),
    latencyMs: result.latencyMs,
    message: result.message,
  });
});

/**
 * Save & securely encrypt Gemini API Key associated with user
 */
app.post('/api/gemini/save', rateLimiter(10, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return res.status(401).json({
      error: 'Authentication required. No user identity associated with request.',
    });
  }

  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'Valid Gemini API key string is required.' });
  }

  // Validate the key against the mandatory gemini-3.8-flash model first
  const validation = await validateGeminiKey(apiKey);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.message,
      model: GEMINI_MODEL_ID,
    });
  }

  // Encrypt with AES-256-GCM
  const encrypted = encryptValue(apiKey.trim());
  const maskedKey = maskApiKey(apiKey.trim());

  userKeysStore.set(userId.trim(), {
    userId: userId.trim(),
    encrypted,
    maskedKey,
    configuredAt: Date.now(),
    lastValidatedAt: Date.now(),
    model: GEMINI_MODEL_ID,
  });

  return res.json({
    success: true,
    configured: true,
    maskedKey,
    model: GEMINI_MODEL_ID,
    encryptionMode: 'AES-256-GCM',
    isEphemeralKey,
    message: `Gemini API Key successfully validated against ${GEMINI_MODEL_ID} and encrypted using AES-256-GCM.`,
  });
});

/**
 * Get Gemini API Key status for the authenticated user
 * Never returns the raw key!
 */
app.get('/api/gemini/status', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.json({
      configured: false,
      maskedKey: null,
      model: GEMINI_MODEL_ID,
    });
  }

  const stored = userKeysStore.get(userId.trim());
  if (!stored) {
    return res.json({
      configured: false,
      maskedKey: null,
      model: GEMINI_MODEL_ID,
      encryptionMode: 'AES-256-GCM',
      isEphemeralKey,
    });
  }

  return res.json({
    configured: true,
    maskedKey: stored.maskedKey,
    configuredAt: stored.configuredAt,
    lastValidatedAt: stored.lastValidatedAt,
    model: GEMINI_MODEL_ID,
    encryptionMode: 'AES-256-GCM',
    isEphemeralKey,
  });
});

/**
 * Run a live probe using the saved key to re-verify status
 * Client never sees the decrypted key!
 */
app.post('/api/gemini/test-probe', rateLimiter(10, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'User identifier required.' });
  }

  const stored = userKeysStore.get(userId.trim());
  if (!stored) {
    return res.status(404).json({ error: 'No saved Gemini API key found for this user.' });
  }

  try {
    // Decrypt in memory on the server
    const rawKey = decryptValue(stored.encrypted);
    const result = await validateGeminiKey(rawKey);

    if (result.valid) {
      stored.lastValidatedAt = Date.now();
    }

    return res.json({
      valid: result.valid,
      model: result.model,
      maskedKey: stored.maskedKey,
      latencyMs: result.latencyMs,
      message: result.message,
    });
  } catch {
    return res.status(500).json({
      valid: false,
      model: GEMINI_MODEL_ID,
      message: 'Failed to decrypt or validate stored key.',
    });
  }
});

/**
 * Delete saved Gemini API key for the authenticated user
 */
app.delete('/api/gemini/key', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'User identifier required.' });
  }

  userKeysStore.delete(userId.trim());
  return res.json({
    success: true,
    message: 'Saved Gemini API key was deleted from server storage.',
  });
});

/**
 * Generate Video Script from Source Material
 */
app.post('/api/script/generate', rateLimiter(15, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { sourceText, contentMode, durationSeconds, language } = req.body;

  if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length === 0) {
    return res.status(400).json({ error: 'Source article or story text is required.' });
  }

  // Retrieve API key for user from encrypted store or server env
  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {
        // failed to decrypt
      }
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  if (!effectiveApiKey) {
    return res.status(400).json({
      error: 'Gemini API key is not configured. Please open the "Overview & Connections" tab and configure your Gemini API key in the Gemini API Configuration section.',
      code: 'API_KEY_NOT_CONFIGURED',
    });
  }

  const validDurations = [24, 32, 40, 48, 56, 60];
  const dur = parseInt(durationSeconds, 10);
  if (!validDurations.includes(dur)) {
    return res.status(400).json({ error: 'Duration must be one of: 24, 32, 40, 48, 56, 60 seconds.' });
  }

  const validModes = [
    'Professional News',
    'Breaking News',
    'Documentary',
    'Educational',
    'Explainer',
    'History',
    'Science & Technology',
    'Business & Finance',
    'Biography',
    'Storytelling',
    'Mystery & Investigation',
    'Motivational',
  ];
  if (!validModes.includes(contentMode)) {
    return res.status(400).json({ error: `Invalid content mode: ${contentMode}` });
  }

  const validLanguages = ['Hindi', 'Gujarati', 'English', 'Hinglish'];
  const lang = validLanguages.includes(language) ? language : 'Hindi';

  try {
    const result = await generateVideoScript({
      sourceText,
      contentMode,
      durationSeconds: dur,
      language: lang,
      apiKey: effectiveApiKey,
    });

    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * Generate Video Script directly from a User-Provided Topic
 */
app.post('/api/script/generate-topic', rateLimiter(15, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { topic, angle, targetAudience, contentMode, durationSeconds, language, hookStyle } = req.body;

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return res.status(400).json({ error: 'Video topic is required.' });
  }

  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {}
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  if (!effectiveApiKey) {
    return res.status(400).json({
      error: 'Gemini API key is not configured. Please open the "Overview & Connections" tab and configure your Gemini API key in the Gemini API Configuration section.',
      code: 'API_KEY_NOT_CONFIGURED',
    });
  }

  const validDurations = [24, 32, 40, 48, 56, 60];
  const dur = parseInt(durationSeconds, 10);
  if (!validDurations.includes(dur)) {
    return res.status(400).json({ error: 'Duration must be one of: 24, 32, 40, 48, 56, 60 seconds.' });
  }

  const validModes = [
    'Professional News',
    'Breaking News',
    'Documentary',
    'Educational',
    'Explainer',
    'History',
    'Science & Technology',
    'Business & Finance',
    'Biography',
    'Storytelling',
    'Mystery & Investigation',
    'Motivational',
  ];
  const selectedMode = validModes.includes(contentMode) ? contentMode : 'Educational';

  const validLanguages = ['Hindi', 'Gujarati', 'English', 'Hinglish'];
  const lang = validLanguages.includes(language) ? language : 'English';

  try {
    const result = await generateTopicVideoScript({
      topic: topic.trim(),
      angle: angle ? String(angle).trim() : undefined,
      targetAudience: targetAudience ? String(targetAudience).trim() : undefined,
      contentMode: selectedMode,
      durationSeconds: dur,
      language: lang,
      hookStyle: hookStyle ? String(hookStyle).trim() : undefined,
      apiKey: effectiveApiKey,
    });

    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * Generate Google Flow Video Prompts for all Script Segments
 */
app.post('/api/prompts/generate', rateLimiter(20, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { segments, contentMode, sourceTitle, aspectRatio, stylePreset, cameraMotionPreset, lightingPreset } = req.body;

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: 'At least one script segment is required to generate video prompts.' });
  }

  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {}
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  try {
    const result = await generateVideoPrompts({
      segments,
      contentMode: contentMode || 'Professional News',
      sourceTitle,
      aspectRatio: aspectRatio || '16:9',
      stylePreset: stylePreset || 'Cinematic Photorealistic',
      cameraMotionPreset: cameraMotionPreset || 'Smooth Cinematic Dolly',
      lightingPreset: lightingPreset || 'Dramatic Natural Lighting',
      apiKey: effectiveApiKey,
    });

    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * Regenerate a Single Video Prompt Segment
 */
app.post('/api/prompts/generate-segment', rateLimiter(30, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { segment, contentMode, aspectRatio, stylePreset, cameraMotionPreset, lightingPreset, customInstruction } = req.body;

  if (!segment || !segment.voiceover) {
    return res.status(400).json({ error: 'Valid segment data is required.' });
  }

  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {}
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  try {
    const prompt = await generateSingleVideoPrompt({
      segment,
      contentMode: contentMode || 'Professional News',
      aspectRatio: aspectRatio || '16:9',
      stylePreset: stylePreset || 'Cinematic Photorealistic',
      cameraMotionPreset: cameraMotionPreset || 'Smooth Cinematic Dolly',
      lightingPreset: lightingPreset || 'Dramatic Natural Lighting',
      customInstruction,
      apiKey: effectiveApiKey,
    });

    return res.json({ prompt });
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * Generate Complete YouTube SEO Studio Package
 */
app.post('/api/seo/generate', rateLimiter(30, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const {
    scriptText,
    scriptSegments,
    sourceText,
    sourceTitle,
    contentMode,
    videoFormat,
    language,
    customInstruction,
  } = req.body;

  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {}
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  try {
    const result = await generateYouTubeSEO({
      scriptText,
      scriptSegments,
      sourceText,
      sourceTitle,
      contentMode,
      videoFormat: videoFormat || 'shorts',
      language: language || 'auto',
      customInstruction,
      apiKey: effectiveApiKey,
    });

    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * Regenerate an individual SEO section (preserving other sections)
 */
app.post('/api/seo/regenerate-section', rateLimiter(40, 60000), async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const {
    section,
    sourceText,
    scriptText,
    sourceTitle,
    videoFormat,
    language,
    currentSeoPackage,
    customInstruction,
  } = req.body;

  if (!section) {
    return res.status(400).json({ error: 'Section parameter is required.' });
  }

  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {}
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  try {
    const result = await regenerateSEOSection({
      section,
      sourceText,
      scriptText,
      sourceTitle,
      videoFormat: videoFormat || 'shorts',
      language: language || 'auto',
      currentSeoPackage,
      customInstruction,
      apiKey: effectiveApiKey,
    });

    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * Generate Complete YouTube Thumbnail Studio Package
 */
app.post('/api/thumbnails/generate', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const {
    sourceTitle,
    sourceText,
    scriptText,
    contentMode,
    language,
    customInstruction,
  } = req.body;

  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {}
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  try {
    const result = await generateThumbnailStudioPackage({
      sourceTitle,
      sourceText,
      scriptText,
      contentMode: contentMode || 'Tech & Hardware',
      language: language || 'en',
      customInstruction,
      apiKey: effectiveApiKey,
    });

    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * Regenerate Single Thumbnail Concept
 */
app.post('/api/thumbnails/regenerate-concept', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const {
    conceptNumber,
    genre,
    sourceTitle,
    scriptText,
    currentHeadline,
    customNotes,
  } = req.body;

  let effectiveApiKey: string | null = null;
  if (userId) {
    const stored = userKeysStore.get(userId.trim());
    if (stored) {
      try {
        effectiveApiKey = decryptValue(stored.encrypted);
      } catch {}
    }
  }

  if (!effectiveApiKey && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    effectiveApiKey = process.env.GEMINI_API_KEY.trim();
  }

  try {
    const result = await regenerateThumbnailConcept({
      conceptNumber: Number(conceptNumber) || 1,
      genre: genre || 'Investigative Documentary',
      sourceTitle,
      scriptText,
      currentHeadline,
      customNotes,
      apiKey: effectiveApiKey,
    });

    return res.json(result);
  } catch (error: any) {
    const { status, body } = formatApiError(error);
    return res.status(status).json(body);
  }
});

/**
 * API Catch-All: Prevents unmatched /api/* requests from falling through to Vite HTML
 */
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.path}`,
    code: 'ROUTE_NOT_FOUND',
  });
});

/**
 * Express Error Handler for /api/* routes: Ensures errors always return clean JSON
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.error(`[API Error Handler] ${req.method} ${req.path}:`, err);
    const { status, body } = formatApiError(err);
    return res.status(status).json(body);
  }
  next(err);
});

// Vite Integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Google Workspace Connection Portal running on port ${PORT}`);
    console.log(`[Server] Model lock: ${GEMINI_MODEL_ID}`);
    console.log(`[Server] Server encryption mode: AES-256-GCM (Ephemeral: ${isEphemeralKey})`);
  });
}

startServer();
