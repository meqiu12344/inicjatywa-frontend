'use client';

import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

interface Props {
  src: string;
  aspect?: number;
  onCancel: () => void;
  onComplete: (blob: Blob, dataUrl?: string) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.92);
  });
}

export default function ImageCropper({ src, aspect = 1, onCancel, onComplete }: Props) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropCompleteLocal = useCallback((_: any, croppedAreaPixelsParam: any) => {
    setCroppedAreaPixels(croppedAreaPixelsParam);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      // If the user clicks "Zatwierdź" without moving/zooming the image,
      // react-easy-crop may not have reported a crop area yet. Fall back to
      // the full image so the logo still gets applied.
      let area = croppedAreaPixels;
      if (!area) {
        const image = await createImage(src);
        const iw = image.naturalWidth;
        const ih = image.naturalHeight;
        // Largest centered rectangle matching the target aspect ratio.
        let w = iw;
        let h = iw / aspect;
        if (h > ih) {
          h = ih;
          w = ih * aspect;
        }
        area = {
          x: (iw - w) / 2,
          y: (ih - h) / 2,
          width: w,
          height: h,
        };
      }
      const blob = await getCroppedImg(src, area);
      if (blob) {
        // optional dataUrl for preview
        const reader = new FileReader();
        reader.onloadend = () => {
          onComplete(blob, reader.result as string);
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.error('Crop failed', err);
    }
  }, [croppedAreaPixels, src, aspect, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="bg-slate-800 rounded-xl p-4 z-10 w-full max-w-2xl">
        <div className="relative h-80 bg-black rounded overflow-hidden">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteLocal}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm text-slate-300">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-slate-700 text-slate-200">Anuluj</button>
          <button onClick={handleConfirm} className="px-4 py-2 rounded bg-amber-500 text-slate-900 font-medium">Zatwierdź</button>
        </div>
      </div>
    </div>
  );
}
