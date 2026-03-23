export enum AspectRatio {
  Ratio_9_16 = '9:16',
  Ratio_16_9 = '16:9',
  Ratio_1_1 = '1:1',
  Ratio_4_3 = '4:3',
  Ratio_3_4 = '3:4',
}

export enum ImageResolution {
  Res_1K = '1K',
  Res_2K = '2K',
  Res_4K = '4K',
}

export enum VideoMode {
  Standard = 'standard',
  StartEnd = 'start_end',
  Intermediate = 'intermediate',
}

export interface ProductData {
  images: string[];
  title: string;
  description: string;
  creativeIdeas: string;
  targetMarket: string;
  modelImages: string[];
  backgroundImages: string[];
  referenceVideo?: { data: string; mimeType: string } | null;
}

export interface ComplianceCheck {
  isCompliant: boolean;
  riskLevel: 'Safe' | 'Warning' | 'High Risk';
  report: string;
  culturalNotes: string;
}

export interface AnalysisResult {
  productType: string;
  sellingPoints: string;
  targetAudience: string;
  hook: string;
  painPoints: string;
  strategy: string;
  assignedVoice: string;
  complianceCheck: ComplianceCheck;
  scenes: SceneDraft[];
}

export interface SceneDraft {
  id: string;
  visual: string;
  visual_en: string;
  action: string;
  action_en: string;
  camera: string;
  camera_en: string;
  dialogue: string;
  dialogue_cn: string;
  prompt: {
    imagePrompt: string;
    textPrompt: string;
  };
}

export interface GeneratedAsset {
  type: 'image' | 'audio';
  url: string;
  mimeType: string;
  data?: string;
}

export interface StoryboardScene extends SceneDraft {
  startImage?: GeneratedAsset;
  endImage?: GeneratedAsset;
  middleImage?: GeneratedAsset;
  audio?: GeneratedAsset;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
  error?: string;
  isGeneratingStart?: boolean;
  isGeneratingMiddle?: boolean;
  isGeneratingEnd?: boolean;
  isUpdatingPrompt?: boolean;
}

export interface AppState {
  product: ProductData;
  settings: {
    aspectRatio: AspectRatio;
    imageResolution: ImageResolution;
    videoMode: VideoMode;
    sceneCount: number;
    imageModel: string;
    cameraDevice: string;
    shootingStyle: string;
  };
  analysis: AnalysisResult | null;
  storyboard: StoryboardScene[];
  isAnalyzing: boolean;
  isGeneratingScene: boolean;
  activeStep: number;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  credits: number;
  plan: 'free' | 'pro' | 'enterprise';
  avatar_url?: string;
}
