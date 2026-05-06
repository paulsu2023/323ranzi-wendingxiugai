import { ProductData, AspectRatio, ImageResolution, AnalysisResult, UserGeminiConfig } from '@/types';

const MAX_GENERATION_REFERENCE_IMAGES = 3;
const MAX_REFERENCE_IMAGE_SIDE = 1280;
const REFERENCE_IMAGE_JPEG_QUALITY = 0.82;
const COMPRESS_BASE64_THRESHOLD = 900_000;

async function parseJsonResponse(res: Response, fallbackMessage: string) {
  const text = await res.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (!res.ok && /^request entity too large/i.test(normalized)) {
        throw new Error('请求图片素材过大：已超过 Vercel 接口限制，请减少上传图或压缩图片后重试');
      }
      throw new Error(!res.ok ? `${fallbackMessage}: ${normalized || res.statusText}` : '接口返回格式异常');
    }
  }

  if (!res.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

function isBrowserImageCompressionAvailable() {
  return typeof window !== 'undefined' && typeof Image !== 'undefined' && typeof document !== 'undefined';
}

function detectImageMime(base64: string) {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

function canvasToJpegBase64(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('图片压缩失败'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }, 'image/jpeg', REFERENCE_IMAGE_JPEG_QUALITY);
  });
}

async function compressReferenceImage(base64: string) {
  if (!base64 || !isBrowserImageCompressionAvailable()) {
    return base64;
  }

  const normalized = base64.includes(',') ? base64.split(',').pop() || '' : base64;
  if (normalized.length <= COMPRESS_BASE64_THRESHOLD) {
    return normalized;
  }

  return new Promise<string>((resolve) => {
    const image = new Image();
    const objectUrl = `data:${detectImageMime(normalized)};base64,${normalized}`;

    image.onload = async () => {
      try {
        const scale = Math.min(1, MAX_REFERENCE_IMAGE_SIDE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(normalized);
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        const compressed = await canvasToJpegBase64(canvas);
        resolve(compressed || normalized);
      } catch {
        resolve(normalized);
      }
    };

    image.onerror = () => resolve(normalized);
    image.src = objectUrl;
  });
}

async function prepareGenerationReferenceImages(referenceImages: string[] = []) {
  const limited = referenceImages.filter(Boolean).slice(0, MAX_GENERATION_REFERENCE_IMAGES);
  return Promise.all(limited.map(compressReferenceImage));
}

export const analyzeProductAPI = async (
  product: ProductData,
  sceneCount: number,
  analysisModel: string,
  geminiConfig?: UserGeminiConfig
): Promise<{ result: AnalysisResult; creditsRemaining: number }> => {
  const payloadProduct = {
    ...product,
    referenceVideo: product.referenceVideo ? {
      mimeType: product.referenceVideo.mimeType,
      fileName: product.referenceVideo.fileName,
      sizeBytes: product.referenceVideo.sizeBytes,
      durationSeconds: product.referenceVideo.durationSeconds,
      width: product.referenceVideo.width,
      height: product.referenceVideo.height,
      analysisFrames: product.referenceVideo.analysisFrames,
    } : null,
  };

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: payloadProduct, sceneCount, analysisModel, geminiConfig }),
  });
  return parseJsonResponse(res, 'Failed to analyze product');
};

export const validateGeminiConfigAPI = async (
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<{ ok: boolean; providerLabel: string; model: string }> => {
  const res = await fetch('/api/google/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, baseUrl, model }),
  });
  return parseJsonResponse(res, 'Failed to validate API config');
};

export const generateImageAPI = async (
  prompt: string,
  aspectRatio: string,
  resolution: string,
  referenceImages: string[] = [],
  imageModel: string,
  cameraPrompt: string,
  stylePrompt: string,
  count = 4
): Promise<{
  base64: string;
  creditsRemaining: number;
  images?: Array<{ url: string; mimeType: string; base64: string }>;
}> => {
  const preparedReferenceImages = await prepareGenerationReferenceImages(referenceImages);
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image',
      prompt, aspectRatio, resolution, referenceImages: preparedReferenceImages, imageModel, cameraPrompt, stylePrompt, count
    }),
  });
  return parseJsonResponse(res, 'Failed to generate image');
};

export const generateVideoAPI = async (
  prompt: string,
  aspectRatio: string,
  referenceImages: string[],
  cameraPrompt: string,
  stylePrompt: string,
  count = 4
): Promise<{
  url: string;
  model: string;
  creditsRemaining: number;
  videos?: Array<{ url: string; mimeType: string }>;
}> => {
  const preparedReferenceImages = await prepareGenerationReferenceImages(referenceImages);
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'video',
      prompt,
      aspectRatio,
      referenceImages: preparedReferenceImages,
      cameraPrompt,
      stylePrompt,
      count,
    }),
  });
  return parseJsonResponse(res, 'Failed to generate video');
};

export const generateSpeechAPI = async (
  text: string,
  voiceName: string
): Promise<{ base64: string; creditsRemaining: number }> => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'audio',
      text, voiceName
    }),
  });
  return parseJsonResponse(res, 'Failed to generate speech');
};

export const optimizePromptAPI = async (
  currentPrompt: string,
  visualDesc: string,
  masterPrompt?: string
): Promise<string> => {
  const res = await fetch('/api/optimize-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPrompt, visualDesc, masterPrompt }),
  });
  const data = await parseJsonResponse(res, 'Failed to optimize prompt');
  return data.optimized;
};
