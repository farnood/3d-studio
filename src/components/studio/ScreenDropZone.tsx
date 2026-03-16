import * as React from 'react';
import { useSceneStore } from '../../store/sceneStore';

export default function ScreenDropZone() {
  const scene = useSceneStore((state) => state.scene);
  const setScreenImage = useSceneStore((state) => state.setScreenImage);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!scene) return null;

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          setScreenImage(0, e.target.result); // Assuming 0 is the main device for now
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  return (
    <div 
      className="drop-zone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        accept="image/*" 
        hidden 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <div className="section-eyebrow drop-zone__eyebrow">Screen Texture</div>
      <div className="drop-zone__title">Drop artwork here</div>
      <div className="drop-zone__meta">PNG, JPG, or WebP. Click to browse.</div>
    </div>
  );
}
