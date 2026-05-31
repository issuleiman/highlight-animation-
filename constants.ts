
import { AnimationType, AnimationSettings } from './types';
import { 
  MousePointer2, 
  Zap, 
  Sun, 
  PenTool, 
  Highlighter, 
  MoveHorizontal, 
  Sparkles,
  Maximize,
  Circle,
  Crop,
  Camera,
  Waves,
  ZoomIn,
  Activity,
  Palette,
  AlignLeft,
  Square,
  Strikethrough,
  Sigma,
  Scan,
  EyeOff,
  FileSignature,
  ArrowLeftRight,
  Crosshair
} from 'lucide-react';

export const DEFAULT_SETTINGS: AnimationSettings = {
  type: 'sweep',
  color: '#FACC15', // Yellow default
  intensity: 1.0,
  speed: 1.0,
  delay: 0.5,
  duration: 2,
  backgroundDim: 0.5,
  vignette: 0.3,
};

export const PRESET_COLORS = [
  '#FACC15', // Yellow
  '#F97316', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#A855F7', // Purple
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#22C55E', // Green
  '#84CC16', // Lime
  '#FFFFFF', // White
];

export const ANIMATION_TYPES: { id: AnimationType; label: string; icon: any; description: string }[] = [
  { id: 'reading', label: 'Reading', icon: AlignLeft, description: 'Line-by-line progressive fill' },
  { id: 'marker', label: 'Marker', icon: Highlighter, description: 'Highlighter pen style' },
  { id: 'scanner', label: 'Scanner', icon: Scan, description: 'Sci-fi scanning line' },
  { id: 'target', label: 'Target', icon: Crosshair, description: 'Lock-on crosshairs' },
  { id: 'underline', label: 'Underline', icon: PenTool, description: 'Hand-drawn line' },
  { id: 'squiggle', label: 'Squiggle', icon: Sigma, description: 'Wavy underline' },
  { id: 'wiggle', label: 'Wiggle', icon: FileSignature, description: 'Hand-drawn shaky border' },
  { id: 'strike', label: 'Strike', icon: Strikethrough, description: 'Line through text' },
  { id: 'rectangle', label: 'Box Draw', icon: Square, description: 'Drawn border box' },
  { id: 'neon', label: 'Neon', icon: Zap, description: 'Bright glowing outline' },
  { id: 'circle', label: 'Circle', icon: Circle, description: 'Drawn circle' },
  { id: 'brackets', label: 'Brackets', icon: Crop, description: 'Corner brackets' },
  { id: 'pulse', label: 'Glow', icon: Sparkles, description: 'Soft pulsating light' },
  { id: 'ripple', label: 'Ripple', icon: Waves, description: 'Expanding rings' },
  { id: 'flash', label: 'Flash', icon: Camera, description: 'Camera flash effect' },
  { id: 'sweep', label: 'Sweep', icon: MoveHorizontal, description: 'Moving shine effect' },
  { id: 'focus', label: 'Spotlight', icon: Sun, description: 'Focus with background dim' },
  { id: 'fade', label: 'Fade', icon: Maximize, description: 'Subtle fade in' },
  { id: 'magnify', label: 'Magnify', icon: ZoomIn, description: 'Pop and zoom effect' },
  { id: 'blur', label: 'Blur', icon: EyeOff, description: 'Obscure content' },
  { id: 'invert', label: 'Invert', icon: ArrowLeftRight, description: 'Invert image colors' },
  { id: 'glitch', label: 'Glitch', icon: Activity, description: 'Digital distortion' },
  { id: 'rainbow', label: 'Rainbow', icon: Palette, description: 'Color cycling border' },
];

export const RESOLUTION_PRESETS = [
  { label: 'Original', value: 'original' },
  { label: '1080p (16:9)', value: { w: 1920, h: 1080 } },
  { label: 'Portrait (9:16)', value: { w: 1080, h: 1920 } },
  { label: 'Square (1:1)', value: { w: 1080, h: 1080 } },
];