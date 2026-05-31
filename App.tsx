import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { EditorCanvas } from './components/EditorCanvas';
import { Controls } from './components/Controls';
import { useCanvasRecorder } from './hooks/useCanvasRecorder';
import { useHistory } from './hooks/useHistory';
import { AnimationSettings, Layer } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { Toaster, toast } from 'sonner';

const App = () => {
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaElement, setMediaElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  
  // State for multiple layers
  const [layers, setLayers, { undo, redo, canUndo, canRedo }] = useHistory<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  
  // Global settings serve as defaults for new layers and are editable when no layer is selected
  const [globalSettings, setGlobalSettings] = useState<AnimationSettings>(DEFAULT_SETTINGS);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isRecording, progress, exportVideo } = useCanvasRecorder();

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMediaSrc(url);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      setLayers([]); // Clear old selections
      setActiveLayerId(null);
      toast.success("Media loaded successfully");
    }
  };

  useEffect(() => {
    if (!mediaSrc) {
      setMediaElement(null);
      return;
    }
    if (mediaType === 'video') {
      const vid = document.createElement('video');
      vid.src = mediaSrc;
      vid.crossOrigin = "anonymous";
      vid.loop = true;
      vid.muted = true; // Mute for autoplay
      vid.playsInline = true;
      vid.onloadedmetadata = () => {
        vid.play().catch(e => {
          console.warn("Autoplay prevented by browser:", e);
          toast.warning("Tap anywhere on the canvas to play the video", { duration: 5000 });
        });
        setMediaElement(vid);
      };
    } else {
      const img = new Image();
      img.src = mediaSrc;
      img.crossOrigin = "anonymous";
      img.onload = () => setMediaElement(img);
    }
  }, [mediaSrc, mediaType]);

  const updateActiveSettings = useCallback((partial: Partial<AnimationSettings>) => {
    if (activeLayerId) {
      // Update specific layer
      setLayers(prev => prev.map(layer => 
        layer.id === activeLayerId 
          ? { ...layer, settings: { ...layer.settings, ...partial } } 
          : layer
      ));
    } else {
      // Update global defaults
      setGlobalSettings(prev => ({ ...prev, ...partial }));
    }
  }, [activeLayerId]);

  const handleUpdateLayer = (id: string, updates: Partial<Layer>) => {
      setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleAddLayer = (newLayer: Layer) => {
      // Apply current global settings to the new layer
      const layerWithSettings = { 
        ...newLayer, 
        settings: { ...globalSettings } 
      };
      setLayers(prev => [...prev, layerWithSettings]);
      setActiveLayerId(newLayer.id);
  };

  const handleDeleteActiveLayer = () => {
      if (!activeLayerId) return;
      setLayers(prev => prev.filter(l => l.id !== activeLayerId));
      setActiveLayerId(null);
  };

  const handleReorderLayer = (id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index < 0) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newLayers = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap
      [newLayers[index], newLayers[swapIndex]] = [newLayers[swapIndex], newLayers[index]];
      return newLayers;
    });
  };

  const handleExport = async (resolutionMultiplier: number) => {
    if (!canvasRef.current || !mediaElement || layers.length === 0) return;

    try {
      // Find the max duration among all layers to determine video length
      const maxDuration = Math.max(...layers.map(l => l.settings.duration), 2);
      
      await exportVideo(canvasRef.current, mediaElement, layers, activeLayerId, maxDuration, resolutionMultiplier);
      toast.success("Video exported successfully!");
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Failed to export video. Please try again.");
    }
  };

  // Determine settings to display in Controls
  // If a layer is active, show its settings. Otherwise show global defaults.
  const activeSettings = activeLayerId 
    ? layers.find(l => l.id === activeLayerId)?.settings || globalSettings
    : globalSettings;

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row bg-zinc-950 text-white font-sans overflow-hidden">
      <Toaster theme="dark" position="top-center" />
      {/* Sidebar - Tools & Upload (Top on mobile, Left on Desktop) */}
      <Sidebar 
        onMediaUpload={handleMediaUpload} 
        onClearAll={() => {
          if (layers.length > 0) {
            toast('Clear all layers?', {
              action: {
                label: 'Clear',
                onClick: () => {
                  setLayers([]);
                  setActiveLayerId(null);
                  toast.success("All layers cleared");
                }
              },
              cancel: {
                label: 'Cancel',
                onClick: () => {}
              }
            });
          }
        }} 
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Center - Canvas Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-zinc-900/50 relative order-2 lg:order-none overflow-hidden">
          <EditorCanvas 
            mediaElement={mediaElement}
            layers={layers}
            activeLayerId={activeLayerId}
            onUpdateLayer={handleUpdateLayer}
            onAddLayer={handleAddLayer}
            onSelectLayer={setActiveLayerId}
            onDeleteLayer={(id) => {
              setLayers(prev => prev.filter(l => l.id !== id));
              if (activeLayerId === id) setActiveLayerId(null);
            }}
            canvasRef={canvasRef}
          />
      </div>

      {/* Right Sidebar - Properties (Bottom on mobile, Right on Desktop) */}
      <Controls 
          settings={activeSettings}
          updateSettings={updateActiveSettings}
          onExport={handleExport}
          onClearSelection={handleDeleteActiveLayer}
          isRecording={isRecording}
          progress={progress}
          hasSelection={!!activeLayerId}
          canExport={layers.length > 0}
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={setActiveLayerId}
          onDeleteLayer={(id) => {
            setLayers(prev => prev.filter(l => l.id !== id));
            if (activeLayerId === id) setActiveLayerId(null);
          }}
          onReorderLayer={handleReorderLayer}
          onUpdateLayerName={(id, name) => {
            setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l));
          }}
      />
    </div>
  );
};

export default App;