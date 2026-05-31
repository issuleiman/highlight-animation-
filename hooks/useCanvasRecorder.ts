import { useState, useCallback } from 'react';
import { renderFrame } from '../utils/drawing';
import { Layer } from '../types';

export const useCanvasRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportVideo = useCallback(async (
    sourceCanvas: HTMLCanvasElement,
    mediaElement: HTMLImageElement | HTMLVideoElement,
    layers: Layer[],
    activeLayerId: string | null,
    totalDuration: number,
    resolutionMultiplier: number = 1
  ) => {
    return new Promise<void>((resolve, reject) => {
      setIsRecording(true);
      setProgress(0);

      const canvas = document.createElement('canvas');
      canvas.width = sourceCanvas.width * resolutionMultiplier;
      canvas.height = sourceCanvas.height * resolutionMultiplier;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsRecording(false);
        reject(new Error("Could not create canvas context"));
        return;
      }

      ctx.scale(resolutionMultiplier, resolutionMultiplier);

      // Determine supported MIME type
      const types = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=h264',
        'video/webm',
        'video/mp4' // Safari support
      ];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';

      if (!mimeType) {
        setIsRecording(false);
        reject(new Error("Video recording is not supported in this browser."));
        return;
      }

      // Initial render to ensure canvas isn't empty when stream starts
      renderFrame(ctx, mediaElement, layers, activeLayerId, 0, totalDuration * 1000, sourceCanvas.width, sourceCanvas.height);

      const stream = canvas.captureStream(30); // 30 FPS
      
      // Try to add audio track if it's a video
      if ('captureStream' in mediaElement || 'mozCaptureStream' in mediaElement) {
          try {
              const videoStream = (mediaElement as any).captureStream ? (mediaElement as any).captureStream() : (mediaElement as any).mozCaptureStream();
              if (videoStream) {
                  const audioTracks = videoStream.getAudioTracks();
                  if (audioTracks.length > 0) {
                      stream.addTrack(audioTracks[0]);
                  }
              }
          } catch (e) {
              console.warn("Could not capture audio from video element", e);
          }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000 * resolutionMultiplier // Scale bitrate
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const type = mimeType.split(';')[0];
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `highlight-video.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setIsRecording(false);
        resolve();
      };

      recorder.start();

      let durationMs = totalDuration * 1000;
      if ('duration' in mediaElement && isFinite(mediaElement.duration)) {
          durationMs = Math.max(durationMs, mediaElement.duration * 1000);
      }

      // Reset video to start
      if ('currentTime' in mediaElement) {
          mediaElement.currentTime = 0;
          mediaElement.play().catch(e => console.error("Error playing video for export:", e));
      }

      const startTime = performance.now();
      
      const processFrame = (now: number) => {
        const elapsed = now - startTime;
        
        // Update progress UI
        setProgress(Math.min(100, Math.round((elapsed / durationMs) * 100)));

        // We render WITHOUT the active UI selection outlines for the final video
        renderFrame(ctx, mediaElement, layers, null, elapsed, durationMs, sourceCanvas.width, sourceCanvas.height);

        // Record a tiny bit extra (100ms) to prevent cutting off the end abruptly
        if (elapsed < durationMs + 100) {
          requestAnimationFrame(processFrame);
        } else {
          recorder.stop();
        }
      };

      requestAnimationFrame(processFrame);
    });
  }, []);

  return { isRecording, progress, exportVideo };
};
