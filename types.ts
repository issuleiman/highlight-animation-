
export type AnimationType = 'pulse' | 'sweep' | 'neon' | 'focus' | 'underline' | 'marker' | 'fade' | 'circle' | 'brackets' | 'flash' | 'ripple' | 'magnify' | 'glitch' | 'rainbow' | 'reading' | 'rectangle' | 'strike' | 'squiggle' | 'scanner' | 'blur' | 'wiggle' | 'invert' | 'target';

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationSettings {
  type: AnimationType;
  color: string;
  intensity: number; // 0 to 1
  speed: number; // Multiplier
  delay: number; // Seconds
  duration: number; // Seconds (video length)
  backgroundDim: number; // 0 to 1
  vignette: number; // 0 to 1
}

export interface Layer {
  id: string;
  name?: string;
  selection: Selection;
  settings: AnimationSettings;
}

export interface VideoExportOptions {
  width: number;
  height: number;
  fps: number;
}