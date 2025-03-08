import React, { useState } from "react";
import type { ImageFile } from "../App";
import { EditModal } from "./EditModal";

interface ImagesProps {
  images: ImageFile[];
  onDelete: (id: number) => void;
}

export function Images({ images, onDelete }: ImagesProps) {
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [processedImageUrls, setProcessedImageUrls] = useState<Record<number, string>>({});

  const handleEditSave = (imageId: number, editedImageUrl: string) => {
    setProcessedImageUrls(prev => ({
      ...prev,
      [imageId]: editedImageUrl
    }));
    setEditingImage(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            image.file.type.includes("video") ? (
              <Video video={image} key={image.id} />
            ) : (
              <ImageSpot 
                key={image.id}
                image={image} 
                onDelete={onDelete}
                onEdit={() => setEditingImage(image)}
                processedImageUrl={processedImageUrls[image.id]}
              />
            )
          ))}
        </div>
      </div>

      <EditModal
        image={editingImage}
        isOpen={!!editingImage}
        onClose={() => setEditingImage(null)}
        onSave={(url) => editingImage && handleEditSave(editingImage.id, url)}
      />
    </>
  );
}

function Video({ video }: { video: ImageFile }) {
  const url = URL.createObjectURL(video.file);
  return (
    <div className="glass-card overflow-hidden">
      <video
        className="aspect-square object-cover"
        loop
        muted
        autoPlay
        src={url}
      />
    </div>
  );
}

interface ImageSpotProps {
  image: ImageFile;
  onDelete: (id: number) => void;
  onEdit: () => void;
  processedImageUrl?: string;
}

function ImageSpot({ image, onDelete, onEdit, processedImageUrl }: ImageSpotProps) {
  const url = URL.createObjectURL(image.file);
  const processedURL = image.processedFile ? URL.createObjectURL(image.processedFile) : "";
  const isProcessing = !image.processedFile;

  return (
    <div className="glass-card overflow-hidden relative flex flex-col">
  <div className="relative aspect-square bg-[#1E293B] bg-opacity-50">
    <img
      className={`w-full h-full object-cover transition-opacity duration-300 ${
        isProcessing ? "opacity-30" : "opacity-100"
      }`}
      src={isProcessing ? url : processedImageUrl || processedURL}
      alt={`wErase image ${image.id}`}
    />

    {isProcessing && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
        <div className="glass-card px-4 py-2 flex items-center gap-2">
          <div className="loading-spinner inline-block mr-1.5" />
          <span className="text-foreground font-medium">Processing...</span>
        </div>
      </div>
    )}
  </div>

  {!isProcessing && (
    <div className="mt-auto bg-[#1E293B]/50 backdrop-blur-sm p-2">
      <div className="flex justify-between items-center gap-2">
        <button
          onClick={() => onDelete(image.id)}
          className="flex-1 flex justify-center items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm">Delete</span>
        </button>

        <button
          onClick={onEdit}
          className="flex-1 flex justify-center items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-accent/20 text-gray-400 hover:text-accent transition-all"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-sm">Edit</span>
        </button>

        <a
          href={processedImageUrl || processedURL}
          download={`werase-${image.id}.png`}
          className="flex-1 flex justify-center items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-all"
          title="Download"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="text-sm">Download</span>
        </a>
      </div>
    </div>
  )}
</div>
  );
}