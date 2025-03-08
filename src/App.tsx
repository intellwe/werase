import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Images } from "./components/Images";
import { processImages, initializeModel, getModelInfo } from "../lib/process";
import { Camera } from "./components/Camera";

interface AppError {
  message: string;
}

export interface ImageFile {
  id: number;
  file: File;
  processedFile?: File;
}

// Sample images from Unsplash
const sampleImages = [
  "https://images.unsplash.com/photo-1581803118522-7b72a50f7e9f?q=80&w=2938&auto=format&fit=crop&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?q=80&w=2874&auto=format&fit=crop&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?q=80&w=2333&auto=format&fit=crop&ixlib=rb-4.0.3"
];

// Check if the user is on mobile Safari
const isMobileSafari = () => {
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i) && !ua.match(/OPiOS/i) && !ua.match(/FxiOS/i);
  return iOSSafari && 'ontouchend' in document;
};

// Helper function to prevent redirect loops
const isRedirectPage = () => {
  return window.location.pathname.includes('/mobile');
};

const getCurrentYear = () => new Date().getFullYear();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isWebGPU, setIsWebGPU] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [currentModel, setCurrentModel] = useState<'briaai/RMBG-1.4' | 'Xenova/modnet'>('briaai/RMBG-1.4');
  const [isModelSwitching, setIsModelSwitching] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (isMobileSafari() && !isRedirectPage()) {
      window.location.href = 'https://werase.intellwe.com/mobile';
      return;
    }

    // Only check iOS on load since that won't change
    const { isIOS: isIOSDevice } = getModelInfo();
    setIsIOS(isIOSDevice);
    setIsLoading(false);
  }, []);

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value as typeof currentModel;
    setIsModelSwitching(true);
    setError(null);
    try {
      const initialized = await initializeModel(newModel);
      if (!initialized) {
        throw new Error("Failed to initialize new model");
      }
      setCurrentModel(newModel);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Falling back")) {
        setCurrentModel('briaai/RMBG-1.4');
      } else {
        setError({
          message: err instanceof Error ? err.message : "Failed to switch models"
        });
      }
    } finally {
      setIsModelSwitching(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      processedFile: undefined
    }));
    setImages(prev => [...prev, ...newImages]);
    
    // Initialize model if this is the first image
    if (images.length === 0) {
      setIsLoading(true);
      setError(null);
      try {
        const initialized = await initializeModel();
        if (!initialized) {
          throw new Error("Failed to initialize background removal model");
        }
        // Update WebGPU support status after model initialization
        const { isWebGPUSupported } = getModelInfo();
        setIsWebGPU(isWebGPUSupported);
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : "An unknown error occurred"
        });
        setImages([]); 
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }
    
    for (const image of newImages) {
      try {
        const result = await processImages([image.file]);
        if (result && result.length > 0) {
          setImages(prev => prev.map(img =>
            img.id === image.id
              ? { ...img, processedFile: result[0] }
              : img
          ));
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  }, [images.length]);

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const clipboardItems = event.clipboardData.items;
    const imageFiles: File[] = [];
    for (const item of clipboardItems) {
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }
    if (imageFiles.length > 0) {
      onDrop(imageFiles);
    }
  }, [onDrop]);  

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      handlePaste(e as unknown as React.ClipboardEvent);
    };
    
    window.addEventListener('paste', handleGlobalPaste);
    
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [handlePaste]);

  const handleSampleImageClick = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'sample-image.jpg', { type: 'image/jpeg' });
      onDrop([file]);
    } catch (error) {
      console.error('Error loading sample image:', error);
    }
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".mp4"],
    },
  });

  // Add this function to handle camera capture
  const handleCameraCapture = async (capturedImage: Blob) => {
    const file = new File([capturedImage], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onDrop([file]);
    setShowCamera(false);
  };

  // Remove the full screen error and loading states

  return (
    <div className="app-container min-h-screen flex flex-col">
      <nav className="glass-nav fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold gradient-text mb-2 sm:mb-0">
              wErase
            </h1>
            {!isIOS && (
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <span className="text-gray-400 text-sm sm:text-base">Quality:</span>
                <select
                  value={currentModel}
                  onChange={handleModelChange}
                  className="custom-select text-sm sm:text-base"
                  disabled={!isWebGPU}
                >
                  <option value="briaai/RMBG-1.4">Standard (Works Everywhere)</option>
                  {isWebGPU && (
                    <option value="Xenova/modnet">Enhanced (Better Quality)</option>
                  )}
                </select>
              </div>
            )}
          </div>
          {isIOS && (
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Using optimized processing for iOS devices
            </p>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 flex-grow">
        {showCamera ? (
          <Camera 
            onCapture={handleCameraCapture} 
            onClose={() => setShowCamera(false)} 
          />
        ) : (
          <div className={`grid ${images.length === 0 ? 'grid-cols-1 lg:grid-cols-2 gap-8' : 'grid-cols-1'}`}>
            {images.length === 0 && (
              <div className="flex flex-col justify-center space-y-6">
                <div className="glass-card p-8">
                  <h2 className="text-4xl font-bold mb-6">
                    <span className="gradient-text">Remove Background</span>
                    <br />
                    <span className="text-accent">In One Click</span>
                  </h2>
                  <p className="text-xl text-gray-300 mb-8">
                    Transform your images instantly with AI-powered background removal
                  </p>
                  <ul className="space-y-4">
                    {[
                      '100% Free & Private',
                      'Browser-based Processing',
                      'Advanced Background Editing'
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-gray-300">
                        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div className={images.length === 0 ? '' : 'w-full'}>
              <div className="flex flex-col gap-4 mb-8">
                <div
                  {...getRootProps()}
                  className={`dropzone p-8 rounded-xl text-center cursor-pointer
                    ${isDragAccept ? "border-green-500 bg-green-500/10" : ""}
                    ${isDragReject ? "border-red-500 bg-red-500/10" : ""}
                    ${isDragActive ? "border-accent bg-accent/10" : ""}
                    ${isLoading || isModelSwitching ? "cursor-not-allowed opacity-50" : ""}
                  `}
                >
                  <input {...getInputProps()} className="hidden" disabled={isLoading || isModelSwitching} />
                  <div className="flex flex-col items-center gap-2">
                    {isLoading || isModelSwitching ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                        <p className="text-lg text-gray-600">
                          {isModelSwitching ? 'Switching models...' : 'Loading background removal model...'}
                        </p>
                      </>
                    ) : error ? (
                      <>
                        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-lg text-red-600 font-medium mb-2">{error.message}</p>
                        {currentModel === 'Xenova/modnet' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModelChange({ target: { value: 'briaai/RMBG-1.4' }} as any);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Switch to Cross-browser Version
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-lg text-gray-600">
                          {isDragActive
                            ? "Drop the images here..."
                            : "Drag and drop images here"}
                        </p>
                        <p className="text-sm text-gray-500">or click to select files</p>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowCamera(true)}
                  className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-accent transition-colors"
                  disabled={isLoading || isModelSwitching}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take a Picture
                </button>
              </div>

              {images.length === 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-xl font-semibold text-gray-300 mb-6">Try with sample images:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sampleImages.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => handleSampleImageClick(url)}
                        className="gradient-border overflow-hidden rounded-xl hover:scale-105 transition-transform"
                      >
                        <img
                          src={url}
                          alt={`Sample ${index + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    All images are processed locally on your device and are not uploaded to any server.
                  </p>
                </div>
              )}

              <Images images={images} onDelete={(id) => setImages(prev => prev.filter(img => img.id !== id))} />
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-3">
              <a 
                href="https://linkedin.com/in/intellwe" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-400 hover:text-accent transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a 
                href="https://github.com/intellwe" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-400 hover:text-accent transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a 
                href="mailto:support@intellwe.com" 
                className="text-gray-400 hover:text-accent transition-colors"
                aria-label="Email"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M0 3v18h24v-18h-24zm21.518 2l-9.518 7.713-9.518-7.713h19.036zm-19.518 14v-11.817l10 8.104 10-8.104v11.817h-20z"/>
                </svg>
              </a>
            </div>
            <p className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              Made with 
              <svg 
                className="w-4 h-4 text-red-500" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              by
              <a 
                href="https://intellwe.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-accent hover:text-accent/80 transition-colors"
              >
                IntellWe
              </a>
              <span className="text-gray-400">©</span>
              {getCurrentYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}