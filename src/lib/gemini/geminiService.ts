import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { ProductData, AspectRatio, ImageResolution, SceneDraft } from "@/types";

// Re-export constants used by server
const GEMINI_MODEL_ANALYSIS = 'gemini-3-flash-preview';
const GEMINI_MODEL_ANALYSIS_FALLBACK = 'gemini-3-flash-preview';
const GEMINI_MODEL_IMAGE = 'gemini-3-pro-image-preview';
const GEMINI_MODEL_TTS = 'gemini-3-flash-preview';

export const VOICE_OPTIONS = ['Kore', 'Fenrir', 'Puck', 'Charon', 'Zephyr'];

const VOICE_PROFILES: Record<string, string> = {
  'Kore': 'Female, Young Adult (20-30s), Clear, Energetic, Professional tone.',
  'Fenrir': 'Male, Adult (30-40s), Deep, Authoritative, Resonant tone.',
  'Puck': 'Male, Young Adult (20s), Playful, Casual, Friendly tone.',
  'Charon': 'Male, Older Adult (50s+), Gravelly, Cinematic, Serious tone.',
  'Zephyr': 'Female, Young Adult (20-30s), Soft, Breathless, Calm, ASMR-style.',
};

const TARGET_MARKETS = [
  { value: 'MX', label: 'Mexico (墨西哥)', language: 'Spanish', culture: 'Mexican/Latin American' },
  { value: 'BR', label: 'Brazil (巴西)', language: 'Portuguese', culture: 'Brazilian' },
  { value: 'US', label: 'United States (美国)', language: 'English', culture: 'Western American' },
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const msg = error.message || '';
    const status = error.status || error.code;
    const shouldRetry = status === 503 || status === 500 || status === 429 ||
      msg.includes('overloaded') || msg.includes('exhausted') || msg.includes('RESOURCE_EXHAUSTED');
    if (retries > 0 && shouldRetry) {
      await sleep(delay);
      return withRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Fixed WAV encoder (CRITICAL BUG fix from original)
const pcmToWav = (base64PCM: string, sampleRate = 24000): string => {
  const binaryString = atob(base64PCM);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const writeString = (v: DataView, offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  const headerBytes = new Uint8Array(wavHeader);
  const wavBytes = new Uint8Array(headerBytes.length + bytes.length);
  wavBytes.set(headerBytes);
  wavBytes.set(bytes, headerBytes.length);

  // Fixed: iterate over wavBytes correctly
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < wavBytes.length; i += chunkSize) {
    const chunk = wavBytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

export const analyzeProduct = async (
  client: GoogleGenAI,
  product: ProductData,
  sceneCount: number
): Promise<any> => {
  const assignedVoice = VOICE_OPTIONS[Math.floor(Math.random() * VOICE_OPTIONS.length)];
  const voiceProfile = VOICE_PROFILES[assignedVoice] || "Standard Voice";
  const market = TARGET_MARKETS.find(m => m.value === product.targetMarket) || TARGET_MARKETS[0];

  const creativeInstruction = product.creativeIdeas?.trim()
    ? `🔥 CRITICAL PRIORITY - USER CREATIVE DIRECTION: "${product.creativeIdeas}" — Execute these ideas exactly.`
    : "No specific user creative direction. Use expert judgment.";

  const systemInstruction = `你是一个顶级TikTok电商创意团队（面向 ${market.label} 市场）。
配音: ${assignedVoice}. 声音画像: ${voiceProfile}.
${creativeInstruction}
输出语言规则：分析报告用中文，分镜英文字段用英文，对白用${market.language}。`;

  const parts: any[] = [];
  [...(product.images || []), ...(product.modelImages || []), ...(product.backgroundImages || [])].forEach(base64 => {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
  });
  if (product.referenceVideo) {
    parts.push({ inlineData: { mimeType: product.referenceVideo.mimeType, data: product.referenceVideo.data } });
  }

  const promptText = sceneCount > 0
    ? `Generate a ${sceneCount} scene TikTok script for ${market.label}. Product: ${product.title || 'Not specified'}. Description: ${product.description || 'Not specified'}.`
    : `Generate an optimal TikTok script (3-8 scenes) for ${market.label}. Product: ${product.title || 'Not specified'}.`;
  parts.push({ text: promptText });

  const generationConfig: any = {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        productType: { type: Type.STRING },
        sellingPoints: { type: Type.STRING },
        targetAudience: { type: Type.STRING },
        hook: { type: Type.STRING },
        painPoints: { type: Type.STRING },
        strategy: { type: Type.STRING },
        assignedVoice: { type: Type.STRING },
        complianceCheck: {
          type: Type.OBJECT,
          properties: {
            isCompliant: { type: Type.BOOLEAN },
            riskLevel: { type: Type.STRING, enum: ["Safe", "Warning", "High Risk"] },
            report: { type: Type.STRING },
            culturalNotes: { type: Type.STRING },
          },
          required: ["isCompliant", "riskLevel", "report", "culturalNotes"]
        },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              visual: { type: Type.STRING },
              visual_en: { type: Type.STRING },
              action: { type: Type.STRING },
              action_en: { type: Type.STRING },
              camera: { type: Type.STRING },
              camera_en: { type: Type.STRING },
              dialogue: { type: Type.STRING },
              dialogue_cn: { type: Type.STRING },
              prompt: {
                type: Type.OBJECT,
                properties: { imagePrompt: { type: Type.STRING } },
                required: ["imagePrompt"]
              }
            },
            required: ["id", "visual", "visual_en", "action", "action_en", "camera", "camera_en", "dialogue", "dialogue_cn", "prompt"]
          }
        }
      },
      required: ["productType", "sellingPoints", "targetAudience", "hook", "strategy", "complianceCheck", "scenes"]
    }
  };

  let response: GenerateContentResponse;
  try {
    response = await withRetry(() => client.models.generateContent({
      model: GEMINI_MODEL_ANALYSIS, contents: { parts }, config: generationConfig
    }));
  } catch (error: any) {
    // Fallback to Flash on quota exhaustion
    if (error.status === 429 || (error.message || '').includes('exhausted')) {
      response = await withRetry(() => client.models.generateContent({
        model: GEMINI_MODEL_ANALYSIS_FALLBACK, contents: { parts }, config: generationConfig
      }));
    } else throw error;
  }

  const jsonText = (response.text || '{}').replace(/```json\s*/g, '').replace(/```/g, '').trim();
  const result = JSON.parse(jsonText);
  if (!result.scenes || !Array.isArray(result.scenes)) throw new Error("AI response invalid: missing scenes");
  result.assignedVoice = assignedVoice;
  result.scenes = result.scenes.map((s: any) => ({
    ...s,
    prompt: { textPrompt: s.prompt?.imagePrompt || s.visual_en, imagePrompt: s.prompt?.imagePrompt || '' }
  }));
  return result;
};

export const generateImage = async (
  client: GoogleGenAI,
  prompt: string,
  aspectRatio: AspectRatio,
  resolution: ImageResolution,
  referenceImages: string[] = [],
  modelName: string = GEMINI_MODEL_IMAGE,
  cameraPrompt = '',
  stylePrompt = ''
): Promise<string> => {
  let textPrompt = prompt;
  if (prompt.trim().startsWith('{')) {
    try {
      const json = JSON.parse(prompt);
      const visual = json.veo_production_manifest?.timeline_script?.[0]?.elements?.visuals?.subject_action;
      if (visual) textPrompt = visual;
    } catch {}
  }

  const realismBoosters = ` raw photo, 8k uhd, soft lighting, high quality, film grain. ${cameraPrompt || 'Fujifilm XT3'}. ${stylePrompt}.`;
  const negativeConstraints = " DO NOT GENERATE: 3d render, cartoon, anime, plastic skin, blurry.";
  const finalPrompt = textPrompt + realismBoosters + negativeConstraints;

  // Aspect Ratio Mapping
  let parsedAspect = '1:1';
  if (aspectRatio === '9:16') parsedAspect = '9:16';
  else if (aspectRatio === '16:9') parsedAspect = '16:9';
  else if (aspectRatio === '4:3') parsedAspect = '4:3';
  else if (aspectRatio === '3:4') parsedAspect = '3:4';

  // Handle Imagen Models (Standard Image Generation)
  if (modelName.includes('imagen')) {
    const response = await withRetry(() => client.models.generateImages({
      model: modelName,
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: parsedAspect as any,
      }
    }));
    const base64Bytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Bytes) throw new Error("Imagen failed to return data");
    return base64Bytes;
  }

  // Handle Gemini Multimodal Models (Banana Pro / Banana 2 equivalents)
  const parts: any[] = [{ text: finalPrompt }];
  referenceImages.slice(0, 3).forEach(ref => {
    parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: ref } });
  });

  const response = await withRetry<GenerateContentResponse>(() => client.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts }],
    config: {
      imageConfig: { aspectRatio: parsedAspect as any, imageSize: resolution as any }
    } as any
  }));

  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || 
               response.candidates?.[0]?.content?.parts?.[0]?.text; // Some models return text, but we expect data
  
  if (!data) throw new Error("Gemini model failed to generate image data");
  return data;
};

export const generateSpeech = async (
  client: GoogleGenAI,
  text: string,
  voiceName = 'Kore'
): Promise<string> => {
  const validVoice = VOICE_OPTIONS.includes(voiceName) ? voiceName : 'Kore';
  const response = await withRetry<GenerateContentResponse>(() => client.models.generateContent({
    model: GEMINI_MODEL_TTS,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: validVoice } } },
    },
  }));
  const base64PCM = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64PCM) throw new Error("TTS 服务未返回音频数据");
  return pcmToWav(base64PCM);
};
