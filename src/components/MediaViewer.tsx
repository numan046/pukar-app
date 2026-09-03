"use client";
import { X, Play, Pause, Volume2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface MediaViewerProps {
  url: string;
  onClose: () => void;
}

export function MediaViewer({ url, onClose }: MediaViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
  const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.startsWith("data:video");
  const isAudio = /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i.test(url) || url.startsWith("data:audio");

  useEffect(() => {
    // Auto-play video/audio when opened
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    if (isAudio && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isVideo, isAudio]);

  function togglePlay() {
    if (isVideo && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
    if (isAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={24} className="text-white" />
        </button>

        {/* Content */}
        {isImage ? (
          <img src={url} alt="Media" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        ) : isVideo ? (
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={url}
              controls
              className="max-w-full max-h-[85vh] w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        ) : isAudio ? (
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Volume2 size={48} className="text-white" />
            </div>
            <audio
              ref={audioRef}
              src={url}
              controls
              className="w-full max-w-md"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 flex items-center justify-center min-h-[300px]">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
              Open file in new tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
