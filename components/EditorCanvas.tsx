import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Selection, AnimationSettings, Layer } from '../types';
import { renderFrame } from '../utils/drawing';
import { Play } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../constants';

interface EditorCanvasProps {
  mediaElement: HTMLImageElement | HTMLVideoElement | null;
  layers: Layer[];
  activeLayerId: string | null;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onAddLayer: (layer: Layer) => void;
  onSelectLayer: (id: string | null) => void;
  onDeleteLayer: (id: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

type InteractionMode = 'create' | 'move' | 'n-resize' | 'e-resize' | 's-resize' | 'w-resize' | 'ne-resize' | 'nw-resize' | 'se-resize' | 'sw-resize' | 'none';

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  mediaElement,
  layers,
  activeLayerId,
  onUpdateLayer,
  onAddLayer,
  onSelectLayer,
  onDeleteLayer,
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<string>('default');
  
  // Interaction State
  const isDragging = useRef(false);
  const interactionMode = useRef<InteractionMode>('none');
  const startPos = useRef({ x: 0, y: 0 });
  
  // We use this to track which layer we are manipulating during a drag
  const draggingLayerId = useRef<string | null>(null);
  const dragStartSelection = useRef<Selection | null>(null);
  
  // Animation State
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // 1. Load Image
  useEffect(() => {
    if (mediaElement && canvasRef.current) {
      canvasRef.current.width = 'videoWidth' in mediaElement ? mediaElement.videoWidth : mediaElement.width;
      canvasRef.current.height = 'videoHeight' in mediaElement ? mediaElement.videoHeight : mediaElement.height;
    }
  }, [mediaElement, canvasRef]);

  // Helper: Draw Resize Handles for ACTIVE layer only
  const drawHandles = (ctx: CanvasRenderingContext2D, sel: Selection) => {
      const handleSize = 10; 
      const half = handleSize / 2;
      
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;

      const points = [
          { x: sel.x, y: sel.y }, // TL
          { x: sel.x + sel.width / 2, y: sel.y }, // T
          { x: sel.x + sel.width, y: sel.y }, // TR
          { x: sel.x + sel.width, y: sel.y + sel.height / 2 }, // R
          { x: sel.x + sel.width, y: sel.y + sel.height }, // BR
          { x: sel.x + sel.width / 2, y: sel.y + sel.height }, // B
          { x: sel.x, y: sel.y + sel.height }, // BL
          { x: sel.x, y: sel.y + sel.height / 2 }, // L
      ];

      points.forEach(p => {
          ctx.beginPath();
          ctx.rect(p.x - half, p.y - half, handleSize, handleSize);
          ctx.fill();
          ctx.stroke();
      });
  };

  // 2. Main Render Loop
  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !mediaElement) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // We get duration from the active layer, or default
    const activeLayer = layers.find(l => l.id === activeLayerId);
    const durationMs = (activeLayer?.settings.duration || 2) * 1000;
    const loopDuration = durationMs + 2000; 

    if (startTimeRef.current === 0) {
        startTimeRef.current = time;
    }

    const elapsed = Math.max(0, time - startTimeRef.current);
    const loopTime = elapsed % loopDuration;

    // --- RENDER CONTENT ---
    
    // We don't want to play animation while dragging to avoid distraction/flicker
    if (isDragging.current) {
        // Static Render (show start state or just image + overlay)
        // Just use time=0 for static preview
         renderFrame(ctx, mediaElement, layers, activeLayerId, 0, durationMs);
    } else {
        renderFrame(ctx, mediaElement, layers, activeLayerId, loopTime, durationMs);
    }

    // --- DRAW UI OVERLAYS ---
    
    // 1. Draw border for ALL layers (faint)
    layers.forEach(layer => {
        if (layer.id !== activeLayerId) {
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
             ctx.lineWidth = 1;
             ctx.setLineDash([4, 4]);
             ctx.strokeRect(layer.selection.x, layer.selection.y, layer.selection.width, layer.selection.height);
             ctx.setLineDash([]);
        }
    });

    // 2. Draw handles and bright border for ACTIVE layer
    if (activeLayer) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(activeLayer.selection.x, activeLayer.selection.y, activeLayer.selection.width, activeLayer.selection.height);
        ctx.setLineDash([]);
        
        // Only draw handles if we are not in the middle of creating it
        if (interactionMode.current !== 'create') {
            drawHandles(ctx, activeLayer.selection);
        }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [mediaElement, layers, activeLayerId, canvasRef]); 

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // 3. Coordinate Helpers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;
    return { x: rawX, y: rawY }; 
  };

  const getHitLayer = (x: number, y: number): string | null => {
      // Check active layer handles first? (Not implemented for simplicity, relying on general hit)
      // Check layers in reverse order (top first)
      for (let i = layers.length - 1; i >= 0; i--) {
          const l = layers[i];
          if (x >= l.selection.x && x <= l.selection.x + l.selection.width &&
              y >= l.selection.y && y <= l.selection.y + l.selection.height) {
              return l.id;
          }
      }
      return null;
  };

  const getInteractionType = (x: number, y: number, layer: Layer | undefined): InteractionMode => {
      if (!layer) return 'none'; // Only resize/move active layer

      const handleRadius = 20 * (canvasRef.current!.width / canvasRef.current!.getBoundingClientRect().width); 
      const { x: sx, y: sy, width: w, height: h } = layer.selection;

      // Check Handles
      if (Math.abs(x - sx) < handleRadius && Math.abs(y - sy) < handleRadius) return 'nw-resize';
      if (Math.abs(x - (sx + w)) < handleRadius && Math.abs(y - sy) < handleRadius) return 'ne-resize';
      if (Math.abs(x - (sx + w)) < handleRadius && Math.abs(y - (sy + h)) < handleRadius) return 'se-resize';
      if (Math.abs(x - sx) < handleRadius && Math.abs(y - (sy + h)) < handleRadius) return 'sw-resize';
      
      if (Math.abs(x - (sx + w/2)) < handleRadius && Math.abs(y - sy) < handleRadius) return 'n-resize';
      if (Math.abs(x - (sx + w)) < handleRadius && Math.abs(y - (sy + h/2)) < handleRadius) return 'e-resize';
      if (Math.abs(x - (sx + w/2)) < handleRadius && Math.abs(y - (sy + h)) < handleRadius) return 's-resize';
      if (Math.abs(x - sx) < handleRadius && Math.abs(y - (sy + h/2)) < handleRadius) return 'w-resize';

      // Check Inside
      if (x > sx && x < sx + w && y > sy && y < sy + h) return 'move';

      return 'none';
  };

  // 4. Pointer Handlers
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!mediaElement || !canvasRef.current) return;
      canvasRef.current.setPointerCapture(e.pointerId);
      
      // Auto-play fallback for strict mobile browsers
      if (mediaElement instanceof HTMLVideoElement && mediaElement.paused) {
          mediaElement.play().catch(console.error);
      }
      
      const { x, y } = getCanvasPoint(e);
      
      const activeLayer = layers.find(l => l.id === activeLayerId);
      let mode = getInteractionType(x, y, activeLayer);
      
      // If we clicked a handle, we interact with the active layer
      if (mode !== 'none' && mode !== 'move') {
          draggingLayerId.current = activeLayerId;
          dragStartSelection.current = { ...activeLayer!.selection };
      } else {
          // We didn't click a handle. Find the top-most layer under the cursor.
          const hitId = getHitLayer(x, y);
          
          if (hitId) {
              // We clicked a layer
              if (hitId === activeLayerId) {
                  // It's the active layer, so we move it
                  mode = 'move';
                  draggingLayerId.current = activeLayerId;
                  dragStartSelection.current = { ...activeLayer!.selection };
              } else {
                  // It's a different layer, select it and move it
                  onSelectLayer(hitId);
                  mode = 'move';
                  draggingLayerId.current = hitId;
                  const hitLayer = layers.find(l => l.id === hitId)!;
                  dragStartSelection.current = { ...hitLayer.selection };
              }
          } else {
              // Clicked empty space -> Create new layer
              mode = 'create';
              const newId = crypto.randomUUID();
              draggingLayerId.current = newId;
              // Add the new layer immediately
              onAddLayer({
                  id: newId,
                  selection: { x, y, width: 0, height: 0 },
                  settings: { ...DEFAULT_SETTINGS }
              });
              dragStartSelection.current = { x, y, width: 0, height: 0 };
          }
      }

      interactionMode.current = mode;
      isDragging.current = true;
      startPos.current = { x, y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!mediaElement || !canvasRef.current) return;
      const { x, y } = getCanvasPoint(e);

      // A. Hover State (Update Cursor)
      if (!isDragging.current) {
          const activeLayer = layers.find(l => l.id === activeLayerId);
          const mode = getInteractionType(x, y, activeLayer);
          let cursorStyle = 'default';
          
          if (mode !== 'none' && mode !== 'move') {
             switch (mode) {
                 case 'n-resize': case 's-resize': cursorStyle = 'ns-resize'; break;
                 case 'e-resize': case 'w-resize': cursorStyle = 'ew-resize'; break;
                 case 'nw-resize': case 'se-resize': cursorStyle = 'nwse-resize'; break;
                 case 'ne-resize': case 'sw-resize': cursorStyle = 'nesw-resize'; break;
             }
          } else {
             const hitId = getHitLayer(x, y);
             if (hitId) {
                 if (hitId === activeLayerId) {
                     cursorStyle = 'move';
                 } else {
                     cursorStyle = 'pointer';
                 }
             } else {
                 cursorStyle = 'crosshair';
             }
          }
          if (cursor !== cursorStyle) setCursor(cursorStyle);
          return;
      }

      // B. Drag State
      if (!draggingLayerId.current || !dragStartSelection.current) return;

      const startX = startPos.current.x;
      const startY = startPos.current.y;
      const dx = x - startX;
      const dy = y - startY;
      const initialSel = dragStartSelection.current;

      let newSel: Selection | null = null;

      if (interactionMode.current === 'create') {
          const width = Math.abs(x - startX);
          const height = Math.abs(y - startY);
          const left = Math.min(x, startX);
          const top = Math.min(y, startY);
          newSel = { x: left, y: top, width, height };
      } 
      else if (interactionMode.current === 'move') {
          newSel = {
              x: initialSel.x + dx,
              y: initialSel.y + dy,
              width: initialSel.width,
              height: initialSel.height
          };
      } 
      else {
          // Resizing Logic
          let nx = initialSel.x;
          let ny = initialSel.y;
          let nw = initialSel.width;
          let nh = initialSel.height;

          // Apply deltas
          if (interactionMode.current.includes('w')) {
              nx = Math.min(initialSel.x + dx, initialSel.x + initialSel.width);
              nw = initialSel.width - (nx - initialSel.x);
          }
          if (interactionMode.current.includes('e')) {
              nw = x - initialSel.x;
          }
          if (interactionMode.current.includes('n')) {
              ny = Math.min(initialSel.y + dy, initialSel.y + initialSel.height);
              nh = initialSel.height - (ny - initialSel.y);
          }
          if (interactionMode.current.includes('s')) {
              nh = y - initialSel.y;
          }

          if (nw < 0) { nx = nx + nw; nw = Math.abs(nw); }
          if (nh < 0) { ny = ny + nh; nh = Math.abs(nh); }

          newSel = { x: nx, y: ny, width: nw, height: nh };
      }
      
      onUpdateLayer(draggingLayerId.current, { selection: newSel! });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      
      if (canvasRef.current) {
          canvasRef.current.releasePointerCapture(e.pointerId);
      }
      
      // Cleanup tiny layers created by accident
      const layer = layers.find(l => l.id === draggingLayerId.current);
      if (layer && (layer.selection.width < 5 || layer.selection.height < 5)) {
          onDeleteLayer(layer.id);
      } else {
         startTimeRef.current = performance.now(); // Restart animation
      }
      
      interactionMode.current = 'none';
      draggingLayerId.current = null;
  };

  const mediaWidth = mediaElement ? ('videoWidth' in mediaElement ? mediaElement.videoWidth : mediaElement.width) : 0;
  const mediaHeight = mediaElement ? ('videoHeight' in mediaElement ? mediaElement.videoHeight : mediaElement.height) : 0;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center bg-zinc-900 overflow-hidden select-none p-4 lg:p-8"
    >
      {!mediaElement && (
         <div className="text-zinc-500 flex flex-col items-center animate-pulse gap-4">
             <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded-xl flex items-center justify-center">
                 <Play size={24} className="opacity-20" />
             </div>
            <p className="text-sm font-medium">Upload an image or video to start</p>
         </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="shadow-2xl shadow-black/50"
        style={{ 
            maxWidth: '100%',
            maxHeight: '100%',
            display: mediaElement ? 'block' : 'none',
            touchAction: 'none', 
            cursor: cursor 
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </div>
  );
};
