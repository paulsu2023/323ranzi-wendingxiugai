export const VOICE_OPTIONS = ['Kore', 'Fenrir', 'Puck', 'Charon', 'Zephyr'];

export const FEMALE_VOICE_OPTIONS = ['Kore', 'Zephyr'];
export const MALE_VOICE_OPTIONS = ['Fenrir', 'Puck', 'Charon'];

type BaseVoiceProfile = {
  speakerName: string;
  genderAge: string;
  timbre: string;
  pitch: string;
  pace: string;
  emotion: string;
  delivery: string;
  recordingStyle: string;
};

const BASE_VOICE_PROFILES: Record<string, BaseVoiceProfile> = {
  Kore: {
    speakerName: 'Emma',
    genderAge: 'female creator in her early 20s',
    timbre: 'bright, warm, clear, slightly breathy',
    pitch: 'medium-high pitch, youthful but not childish',
    pace: 'medium conversational pace',
    emotion: 'cheerful, upbeat, friendly',
    delivery: 'natural amateur UGC voiceover, like explaining a product to a friend',
    recordingStyle: 'clean close-mic creator recording with light room tone',
  },
  Zephyr: {
    speakerName: 'Ava',
    genderAge: 'female creator in her late 20s',
    timbre: 'soft, airy, warm, intimate',
    pitch: 'medium pitch with gentle breathiness',
    pace: 'slow-to-medium relaxed pace',
    emotion: 'calm, reassuring, pleasant',
    delivery: 'natural soft-spoken UGC voiceover, polished but still personal',
    recordingStyle: 'clean close-mic studio-style recording with dry room tone',
  },
  Puck: {
    speakerName: 'Max',
    genderAge: 'male creator in his early 20s',
    timbre: 'bright, casual, friendly, energetic',
    pitch: 'medium pitch with youthful energy',
    pace: 'medium-fast conversational pace',
    emotion: 'playful, excited, approachable',
    delivery: 'casual amateur UGC voiceover with spontaneous creator energy',
    recordingStyle: 'clean phone-style creator recording with light room tone',
  },
  Fenrir: {
    speakerName: 'Mason',
    genderAge: 'male creator in his 30s',
    timbre: 'deep, warm, confident, resonant',
    pitch: 'medium-low pitch',
    pace: 'medium steady pace',
    emotion: 'confident, direct, persuasive',
    delivery: 'authoritative but natural UGC voiceover, clear product explainer tone',
    recordingStyle: 'clean close-mic creator recording with controlled room tone',
  },
  Charon: {
    speakerName: 'Victor',
    genderAge: 'male creator in his 50s',
    timbre: 'low, gravelly, cinematic, serious',
    pitch: 'low pitch with mature resonance',
    pace: 'slow-to-medium deliberate pace',
    emotion: 'serious, grounded, trustworthy',
    delivery: 'mature documentary-style voiceover with natural creator phrasing',
    recordingStyle: 'clean close-mic studio-style recording with dry room tone',
  },
};

function getLanguageAccent(language?: string) {
  const value = String(language || '').toLowerCase();
  if (value.includes('spanish')) return 'Mexican Spanish / neutral Latin American Spanish accent';
  if (value.includes('portuguese')) return 'Brazilian Portuguese accent';
  return 'American English, General American accent';
}

export function getVeoVoiceProfile(voiceName = 'Kore', language = 'English') {
  const base = BASE_VOICE_PROFILES[voiceName] || BASE_VOICE_PROFILES.Kore;
  return {
    ...base,
    language,
    accent: getLanguageAccent(language),
  };
}

export function getVeoVoiceProfileText(voiceName = 'Kore', language = 'English') {
  const profile = getVeoVoiceProfile(voiceName, language);
  return [
    `Speaker name: ${profile.speakerName}`,
    `identity: ${profile.genderAge}`,
    `language/accent: ${profile.accent}`,
    `timbre: ${profile.timbre}`,
    `pitch: ${profile.pitch}`,
    `pace: ${profile.pace}`,
    `emotion: ${profile.emotion}`,
    `delivery: ${profile.delivery}`,
    `recording style: ${profile.recordingStyle}`,
  ].join('; ');
}
