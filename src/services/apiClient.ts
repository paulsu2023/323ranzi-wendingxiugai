import { ProductData, AspectRatio, ImageResolution, AnalysisResult } from '@/types';

export const analyzeProductAPI = async (product: ProductData, sceneCount: number): Promise<{ result: AnalysisResult; creditsRemaining: number }> => {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, sceneCount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to analyze product');
  return data;
};

export const generateImageAPI = async (
  prompt: string,
  aspectRatio: string,
  resolution: string,
  referenceImages: string[] = [],
  imageModel: string,
  cameraPrompt: string,
  stylePrompt: string
): Promise<{ base64: string; creditsRemaining: number }> => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image',
      prompt, aspectRatio, resolution, referenceImages, imageModel, cameraPrompt, stylePrompt
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate image');
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate speech');
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to optimize prompt');
  return data.optimized;
};
