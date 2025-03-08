import React, { useRef, useEffect, useState } from 'react';

interface CameraProps {
  onCapture: (image: Blob) => void;
  onClose: () => void;
}

export const Camera: React.FC<CameraProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isFrontCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Unable to access camera. Please make sure you have granted camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const switchCamera = () => {
    setIsFrontCamera(!isFrontCamera);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally if using front camera
        if (isFrontCamera) {
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.scale(-1, 1); // Reset transform
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        // Convert to blob and send to parent
        canvas.toBlob((blob) => {
          if (blob) {
            onCapture(blob);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-grow">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500 text-center p-4">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>

      <div className="flex items-center justify-around p-4 bg-black/50">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-red-500 text-white"
          aria-label="Close camera"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={captureImage}
          className="p-6 rounded-full bg-white"
          aria-label="Take photo"
        >
          <div className="w-12 h-12 rounded-full border-4 border-black"></div>
        </button>

        <button
          onClick={switchCamera}
          className="p-3 rounded-full bg-gray-600 text-white"
          aria-label="Switch camera"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}; 