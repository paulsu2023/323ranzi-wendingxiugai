import { GoogleGenAI } from '@google/genai';
import {
  geminiBaseUrl,
  googleApiKey,
  googleCloudLocation,
  googleCloudProject,
  googleServiceAccountJson,
  requireEnv,
  shouldUseVertexAI,
} from '@/lib/config';

export function createGoogleClient(overrides?: { apiKey?: string; baseUrl?: string }) {
  if (!overrides?.apiKey && shouldUseVertexAI) {
    return new GoogleGenAI({
      vertexai: true,
      project: googleCloudProject,
      location: googleCloudLocation,
      googleAuthOptions: {
        credentials: parseServiceAccountJson(googleServiceAccountJson),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      },
    });
  }

  const config: ConstructorParameters<typeof GoogleGenAI>[0] & {
    httpOptions?: { baseUrl: string };
  } = {
    apiKey: requireEnv('GOOGLE_API_KEY', overrides?.apiKey || googleApiKey),
  };

  const resolvedBaseUrl = overrides?.baseUrl || geminiBaseUrl;
  if (resolvedBaseUrl) {
    config.httpOptions = { baseUrl: resolvedBaseUrl };
  }

  return new GoogleGenAI(config);
}

function parseServiceAccountJson(rawJson: string) {
  try {
    const credentials = JSON.parse(rawJson);
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    return credentials;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 不是有效的 JSON 字符串');
  }
}
