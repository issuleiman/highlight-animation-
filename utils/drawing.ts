import { AnimationSettings, Layer, Selection } from '../types';

/**
 * Main render function used by both the preview loop and the export recorder.
 */
export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLVideoElement,
  layers: Layer[],
  activeLayerId: string | null,
  timestamp: number, // current time in ms
  totalDurationMs: number,
  originalWidth?: number,
  originalHeight?: number
) => {
  const width = originalWidth || ctx.canvas.width;
  const height = originalHeight || ctx.canvas.height;

  // 1. Draw Base Image
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  if (layers.length === 0) return;

  // 2. Draw Background Dimming & Vignette
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[layers.length - 1];
  const globalSettings = activeLayer.settings;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  
  layers.forEach(layer => {
    ctx.rect(layer.selection.x, layer.selection.y, layer.selection.width, layer.selection.height);
  });
  
  ctx.clip('evenodd');

  if (globalSettings.backgroundDim > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${globalSettings.backgroundDim})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (globalSettings.vignette > 0) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.3, 
      width / 2, height / 2, Math.max(width, height) * 0.8 
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${globalSettings.vignette})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  // 3. Draw Highlights/Animations
  layers.forEach(layer => {
    const { selection, settings } = layer;
    const delayMs = settings.delay * 1000;
    const activeTime = timestamp - delayMs;
    
    // For blur and invert, we bypass the delay check so they appear immediately (static effect)
    const isStaticEffect = ['blur', 'invert'].includes(settings.type);
    
    if (activeTime <= 0 && !isStaticEffect) return;

    ctx.save();
    const cycle = (activeTime / 1000) * settings.speed;

    // --- Advanced Text Bounds Logic ---
    // Note: 'marker' is excluded here as it now fills the whole area without per-line detection
    const isTextAnimation = ['reading', 'underline', 'strike', 'squiggle'].includes(settings.type);
    let fullImageData: ImageData | null = null;
    
    if (isTextAnimation) {
        try {
             fullImageData = ctx.getImageData(selection.x, selection.y, selection.width, selection.height);
        } catch(e) {
            // Fallback for CORS
        }
    }

    /**
     * Scans a specific line index to find the Min X and Max X where content exists.
     * This creates a tight bounding box around the text on that line.
     */
    const getLineBounds = (lineIndex: number, totalLines: number) => {
        if (!fullImageData) return { start: 0, width: selection.width };
        
        const { data, width, height } = fullImageData;
        const lineH = height / totalLines;
        
        // Skip top/bottom 15% of the line to avoid noise/ascenders from other lines
        const paddingY = Math.floor(lineH * 0.15); 
        const startY = Math.floor((lineIndex * lineH) + paddingY);
        const endY = Math.floor(((lineIndex + 1) * lineH) - paddingY);
        
        // Safety
        if (startY >= height || endY <= 0 || startY >= endY) return null;

        const threshold = 230; // Brightness threshold
        let minX = -1;
        let maxX = -1;

        // Scan for Start X (Left to Right)
        for (let x = 0; x < width; x++) {
             for (let y = startY; y < endY; y++) {
                 const i = (y * width + x) * 4;
                 const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                 if (data[i+3] > 20 && avg < threshold) {
                     minX = x;
                     break;
                 }
             }
             if (minX !== -1) break;
        }

        // Empty line?
        if (minX === -1) return null;

        // Scan for End X (Right to Left)
        for (let x = width - 1; x >= minX; x--) {
            for (let y = startY; y < endY; y++) {
                const i = (y * width + x) * 4;
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                if (data[i+3] > 20 && avg < threshold) {
                    maxX = x;
                    break;
                }
            }
            if (maxX !== -1) break;
        }

        // Add small padding for aesthetics
        const paddingX = 2;
        const finalX = Math.max(0, minX - paddingX);
        const finalW = Math.min(width, maxX + paddingX) - finalX + paddingX; // Extra padding on right

        return { start: finalX, width: finalW };
    };

    switch (settings.type) {
        case 'marker': {
            // Marker: Simple left-to-right fill of the entire selection box
            ctx.globalCompositeOperation = 'multiply'; 
            ctx.fillStyle = settings.color;
            ctx.globalAlpha = 0.6 * settings.intensity;
            
            const progress = Math.min(1, cycle);
            ctx.fillRect(selection.x, selection.y, selection.width * progress, selection.height);
            break;
        }

        case 'reading': {
            const numLines = Math.max(1, Math.ceil(selection.height / 40));
            const realLineHeight = selection.height / numLines;
            
            ctx.globalCompositeOperation = 'multiply'; 
            ctx.fillStyle = settings.color;
            
            const activeProgress = Math.min(1, cycle);
            const totalLinesProgress = activeProgress * numLines;

            for (let i = 0; i < numLines; i++) {
                const lineProgress = Math.max(0, Math.min(1, totalLinesProgress - i));
                
                if (lineProgress > 0) {
                    const bounds = getLineBounds(i, numLines);
                    
                    if (bounds) {
                        ctx.globalAlpha = 0.6 * settings.intensity;
                        
                        // Animate the width from 0 to bounds.width
                        // However, we want it to start at bounds.start!
                        const currentWidth = bounds.width * lineProgress;
                        
                        const xPos = selection.x + bounds.start;
                        const yPos = selection.y + (i * realLineHeight);

                        ctx.fillRect(xPos, yPos, currentWidth, realLineHeight);
                    }
                }
            }
            break;
        }

        case 'underline': {
            const numLines = Math.max(1, Math.ceil(selection.height / 40));
            const realLineHeight = selection.height / numLines;
            
            ctx.lineWidth = 3 * settings.intensity;
            ctx.lineCap = 'butt'; // Cleaner edges
            ctx.strokeStyle = settings.color;
            ctx.globalAlpha = 0.9;
            
            const activeProgress = Math.min(1, cycle);
            const totalLinesProgress = activeProgress * numLines;

            for (let i = 0; i < numLines; i++) {
                const lineProgress = Math.max(0, Math.min(1, totalLinesProgress - i));
                if (lineProgress > 0) {
                     const bounds = getLineBounds(i, numLines);
                     if (bounds) {
                        const lineY = selection.y + ((i + 1) * realLineHeight) - 4;
                        const startX = selection.x + bounds.start;
                        const targetWidth = bounds.width * lineProgress;

                        ctx.beginPath();
                        ctx.moveTo(startX, lineY);
                        ctx.lineTo(startX + targetWidth, lineY);
                        ctx.stroke();
                     }
                }
            }
            break;
        }

        case 'strike': {
            const numLines = Math.max(1, Math.ceil(selection.height / 40));
            const realLineHeight = selection.height / numLines;
            
            ctx.lineWidth = 3 * settings.intensity;
            ctx.lineCap = 'butt';
            ctx.strokeStyle = settings.color;
            ctx.globalAlpha = 0.8;
            
            const activeProgress = Math.min(1, cycle);
            const totalLinesProgress = activeProgress * numLines;

            for (let i = 0; i < numLines; i++) {
                const lineProgress = Math.max(0, Math.min(1, totalLinesProgress - i));
                if (lineProgress > 0) {
                     const bounds = getLineBounds(i, numLines);
                     if (bounds) {
                        const lineY = selection.y + (i * realLineHeight) + (realLineHeight / 2);
                        const startX = selection.x + bounds.start;
                        const targetWidth = bounds.width * lineProgress;

                        ctx.beginPath();
                        ctx.moveTo(startX, lineY);
                        ctx.lineTo(startX + targetWidth, lineY);
                        ctx.stroke();
                     }
                }
            }
            break;
        }

        case 'squiggle': {
            const numLines = Math.max(1, Math.ceil(selection.height / 40));
            const realLineHeight = selection.height / numLines;
            
            ctx.lineWidth = 2 * settings.intensity;
            ctx.lineCap = 'round';
            ctx.strokeStyle = settings.color;
            ctx.globalAlpha = 0.9;
            
            const activeProgress = Math.min(1, cycle);
            const totalLinesProgress = activeProgress * numLines;
            
            const freq = 0.3;
            const amp = 3;

            for (let i = 0; i < numLines; i++) {
                const lineProgress = Math.max(0, Math.min(1, totalLinesProgress - i));
                if (lineProgress > 0) {
                     const bounds = getLineBounds(i, numLines);
                     if (bounds) {
                         const baseY = selection.y + ((i + 1) * realLineHeight) - 4;
                         const startX = selection.x + bounds.start;
                         const targetWidth = bounds.width * lineProgress;

                         ctx.beginPath();
                         let isDrawing = false;
                         
                         // Draw sine wave
                         for(let localX = 0; localX < targetWidth; localX++) {
                            const waveY = baseY + Math.sin((localX + startX) * freq) * amp;
                            if (!isDrawing) {
                                ctx.moveTo(startX + localX, waveY);
                                isDrawing = true;
                            } else {
                                ctx.lineTo(startX + localX, waveY);
                            }
                         }
                         ctx.stroke();
                     }
                }
            }
            break;
        }

        // --- Standard Animations (Geometric / Overlay) ---

        case 'rectangle': {
            const p = (selection.width + selection.height) * 2;
            const progress = Math.min(1, cycle); 
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 4 * settings.intensity;
            ctx.lineJoin = 'miter';
            ctx.setLineDash([p, p]);
            ctx.lineDashOffset = p * (1 - progress); 
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'pulse': {
            const alpha = 0.1 + (Math.sin(cycle * Math.PI) + 1) / 2 * (settings.intensity - 0.1);
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = settings.color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 4;
            ctx.globalAlpha = alpha;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'sweep': {
            ctx.beginPath();
            ctx.rect(selection.x, selection.y, selection.width, selection.height);
            ctx.clip();
            const gradientWidth = selection.width * 0.5;
            const totalDist = selection.width + gradientWidth * 2;
            const progress = cycle; 
            const xPos = selection.x - gradientWidth + (progress * totalDist);
            const grad = ctx.createLinearGradient(xPos, selection.y, xPos + gradientWidth, selection.y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, settings.color);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = settings.intensity;
            ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'neon': {
            const pulseIntensity = 0.8 + (Math.sin(cycle * Math.PI * 2) * 0.2);
            ctx.globalAlpha = pulseIntensity * settings.intensity;
            ctx.shadowBlur = 20;
            ctx.shadowColor = settings.color;
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 4;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'fade': {
            const progress = Math.min(1, cycle);
            ctx.globalAlpha = progress * settings.intensity;
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.strokeRect(selection.x - 4, selection.y - 4, selection.width + 8, selection.height + 8);
            ctx.fillStyle = settings.color;
            ctx.globalAlpha = progress * 0.1 * settings.intensity;
            ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'focus': {
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = settings.intensity;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'circle': {
            const progress = Math.min(1, cycle * 1.5);
            const cx = selection.x + selection.width / 2;
            const cy = selection.y + selection.height / 2;
            const rx = selection.width / 2 + 10;
            const ry = selection.height / 2 + 10;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            const len = 2 * Math.PI * Math.sqrt((rx*rx + ry*ry)/2) + 100;
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 4 * settings.intensity;
            ctx.lineCap = 'round';
            ctx.setLineDash([len, len]);
            ctx.lineDashOffset = len - (progress * len);
            ctx.stroke();
            break;
        }

        case 'brackets': {
            const progress = Math.min(1, cycle);
            const pad = 10;
            const cornerLen = Math.min(selection.width, selection.height) * 0.3 * progress;
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 5 * settings.intensity;
            ctx.lineCap = 'round';
            ctx.globalAlpha = Math.min(1, progress * 2);
            const x = selection.x - pad;
            const y = selection.y - pad;
            const w = selection.width + pad * 2;
            const h = selection.height + pad * 2;
            // TL
            ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
            // TR
            ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke();
            // BR
            ctx.beginPath(); ctx.moveTo(x + w, y + h - cornerLen); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cornerLen, y + h); ctx.stroke();
            // BL
            ctx.beginPath(); ctx.moveTo(x + cornerLen, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cornerLen); ctx.stroke();
            break;
        }

        case 'flash': {
            const spike = Math.max(0, 1 - (cycle * 3));
            const lingeringBorder = Math.min(1, cycle * 2);
            if (spike > 0) {
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = settings.color; // Changed from white to selected color
                ctx.globalAlpha = spike * settings.intensity;
                ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 3;
            ctx.globalAlpha = lingeringBorder * settings.intensity;
            ctx.strokeRect(selection.x - 2, selection.y - 2, selection.width + 4, selection.height + 4);
            break;
        }

        case 'ripple': {
            const maxRipples = 3;
            const maxDist = 50;
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 2;
            for (let i = 0; i < maxRipples; i++) {
                const offset = i * 0.5;
                let localTime = cycle - offset;
                if (localTime < 0) continue;
                const rippleProgress = localTime / 2;
                if (rippleProgress > 1) continue;
                const expansion = rippleProgress * maxDist;
                const alpha = 1 - rippleProgress;
                ctx.globalAlpha = alpha * settings.intensity;
                ctx.strokeRect(selection.x - expansion, selection.y - expansion, selection.width + expansion * 2, selection.height + expansion * 2);
            }
            break;
        }

        case 'magnify': {
            let scale = 1.0;
            const enterDuration = 0.3;
            if (cycle < enterDuration) {
                const t = cycle / enterDuration;
                scale = 1 + (Math.sin(t * Math.PI) * 0.1 * settings.intensity);
            } else {
                scale = 1.05 + Math.sin((cycle - enterDuration) * 2) * 0.02 * settings.intensity;
            }
            const w = selection.width * scale;
            const h = selection.height * scale;
            const x = selection.x - (w - selection.width) / 2;
            const y = selection.y - (h - selection.height) / 2;
            
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 30 * settings.intensity;
            ctx.shadowOffsetY = 15;
            ctx.fillStyle = settings.color; // Changed from white to selected color background
            ctx.fillRect(x, y, w, h);
            ctx.drawImage(image, selection.x, selection.y, selection.width, selection.height, x, y, w, h);
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
            break;
        }

        case 'rainbow': {
            // Use CSS filter to rotate hue around the SELECTED color
            ctx.save();
            ctx.filter = `hue-rotate(${(cycle * 200) % 360}deg)`;
            ctx.shadowColor = settings.color;
            ctx.shadowBlur = 20 * settings.intensity;
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 5 * settings.intensity;
            ctx.lineJoin = 'round';
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            ctx.restore();
            break;
        }

        case 'glitch': {
            const offsetMax = 10 * settings.intensity;
            const step = Math.floor(cycle * 20);
            const isGlitchy = step % 5 !== 0;
            const rOffsetX = isGlitchy ? (Math.sin(step * 123) * offsetMax) : 0;
            const bOffsetX = isGlitchy ? (Math.cos(step * 321) * offsetMax) : 0;
            
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.8;
            ctx.filter = 'hue-rotate(90deg)'; // shifted from selected color
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 3;
            ctx.strokeRect(selection.x + bOffsetX, selection.y, selection.width, selection.height);
            ctx.restore();

            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.8;
            ctx.filter = 'hue-rotate(-90deg)'; // shifted from selected color
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 3;
            ctx.strokeRect(selection.x + rOffsetX, selection.y, selection.width, selection.height);
            ctx.restore();
            
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'scanner': {
            const scanHeight = 4;
            // Scan moves top to bottom
            const scanPos = (cycle % 1);
            const y = selection.y + (selection.height * scanPos);
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(selection.x, selection.y, selection.width, selection.height);
            ctx.clip();
            
            // Scan scanline
            ctx.fillStyle = settings.color;
            ctx.globalAlpha = 0.8 * settings.intensity;
            ctx.shadowColor = settings.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(selection.x, y, selection.width, scanHeight);
            
            // Trailing gradient
            const grad = ctx.createLinearGradient(0, y - 50, 0, y);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, settings.color);
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.2 * settings.intensity;
            ctx.fillRect(selection.x, y - 50, selection.width, 50);

            ctx.restore();
            
            // Border
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'target': {
            const length = 20;
            const thickness = 4 * settings.intensity;
            const progress = Math.min(1, cycle * 2); // Fast lock on
            // Animate lock on effect
            const lockProgress = Math.min(1, cycle * 3);
            const initialOffset = 50 * (1 - lockProgress);
            
            const breathe = lockProgress >= 1 ? Math.sin(cycle * 5) * 2 : 0;
            const gap = initialOffset + breathe;

            ctx.strokeStyle = settings.color;
            ctx.lineWidth = thickness;
            ctx.lineCap = 'round';
            
            // TL
            ctx.beginPath();
            ctx.moveTo(selection.x - gap, selection.y - gap + length);
            ctx.lineTo(selection.x - gap, selection.y - gap);
            ctx.lineTo(selection.x - gap + length, selection.y - gap);
            ctx.stroke();

            // TR
            ctx.beginPath();
            ctx.moveTo(selection.x + selection.width + gap - length, selection.y - gap);
            ctx.lineTo(selection.x + selection.width + gap, selection.y - gap);
            ctx.lineTo(selection.x + selection.width + gap, selection.y - gap + length);
            ctx.stroke();

            // BR
            ctx.beginPath();
            ctx.moveTo(selection.x + selection.width + gap, selection.y + selection.height + gap - length);
            ctx.lineTo(selection.x + selection.width + gap, selection.y + selection.height + gap);
            ctx.lineTo(selection.x + selection.width + gap - length, selection.y + selection.height + gap);
            ctx.stroke();

            // BL
            ctx.beginPath();
            ctx.moveTo(selection.x - gap + length, selection.y + selection.height + gap);
            ctx.lineTo(selection.x - gap, selection.y + selection.height + gap);
            ctx.lineTo(selection.x - gap, selection.y + selection.height + gap - length);
            ctx.stroke();
            
            // Center cross (faint)
            if (lockProgress >= 1) {
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(selection.x + selection.width/2, selection.y + selection.height/2 - 10);
                ctx.lineTo(selection.x + selection.width/2, selection.y + selection.height/2 + 10);
                ctx.moveTo(selection.x + selection.width/2 - 10, selection.y + selection.height/2);
                ctx.lineTo(selection.x + selection.width/2 + 10, selection.y + selection.height/2);
                ctx.stroke();
            }
            break;
        }

        case 'wiggle': {
             // Sketchy border
             ctx.strokeStyle = settings.color;
             ctx.lineWidth = 3 * settings.intensity;
             ctx.lineJoin = 'round';
             ctx.lineCap = 'round';
             
             const segLen = 10;
             const stepsX = Math.ceil(selection.width / segLen);
             const stepsY = Math.ceil(selection.height / segLen);
             
             ctx.beginPath();
             const timeOffset = cycle * 10;
             const noise = (i: number) => Math.sin(i + timeOffset) * 2 * settings.intensity;

             // Top
             ctx.moveTo(selection.x, selection.y);
             for(let i=0; i<=stepsX; i++) {
                 const x = selection.x + (i * segLen);
                 ctx.lineTo(x, selection.y + noise(i));
             }
             // Right
             for(let i=0; i<=stepsY; i++) {
                 const y = selection.y + (i * segLen);
                 ctx.lineTo(selection.x + selection.width + noise(i + stepsX), y);
             }
             // Bottom
             for(let i=stepsX; i>=0; i--) {
                 const x = selection.x + (i * segLen);
                 ctx.lineTo(x, selection.y + selection.height + noise(i + stepsX + stepsY));
             }
             // Left
             for(let i=stepsY; i>=0; i--) {
                 const y = selection.y + (i * segLen);
                 ctx.lineTo(selection.x + noise(i + stepsX * 2 + stepsY), y);
             }
             ctx.closePath();
             ctx.stroke();
             break;
        }

        case 'invert': {
            ctx.save();
            ctx.beginPath();
            ctx.rect(selection.x, selection.y, selection.width, selection.height);
            ctx.clip();
            
            ctx.globalCompositeOperation = 'difference';
            ctx.fillStyle = settings.color; // Used selected color for invert bias
            ctx.globalAlpha = settings.intensity;
            ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
            
            ctx.restore();
            
            // Border
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }

        case 'blur': {
            ctx.save();
            ctx.beginPath();
            ctx.rect(selection.x, selection.y, selection.width, selection.height);
            ctx.clip();
            
            // Standard Canvas 2D filter property
            const blurAmount = 10 * settings.intensity;
            ctx.filter = `blur(${blurAmount}px)`;
            
            // We need to redraw the image segment on top of itself with the blur
            ctx.drawImage(
                image, 
                selection.x, selection.y, selection.width, selection.height, 
                selection.x, selection.y, selection.width, selection.height
            );
            
            ctx.filter = 'none';
            ctx.restore();
            
            // Border to indicate selection area
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
            break;
        }
    }

    ctx.restore();
  });
};