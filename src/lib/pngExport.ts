import type { BackgroundConfig } from '../types';
import { downloadBlob } from './downloads';
import { normalizeBackground } from './sceneUtils';

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundConfig,
) {
  const normalized = normalizeBackground(background);

  if (normalized.mode === 'solid') {
    context.fillStyle = normalized.color;
    context.fillRect(0, 0, width, height);
    return;
  }

  const angle = ((normalized.gradientAngle ?? 135) - 90) * (Math.PI / 180);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.hypot(width, height) / 2;
  const gradient = context.createLinearGradient(
    centerX - Math.cos(angle) * radius,
    centerY - Math.sin(angle) * radius,
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius,
  );

  gradient.addColorStop(0, normalized.color);
  gradient.addColorStop(1, normalized.gradientTo ?? normalized.color);

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

export async function downloadScenePng(
  canvas: HTMLCanvasElement,
  background: BackgroundConfig,
  filename: string,
) {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;

  const context = outputCanvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create PNG export context.');
  }

  drawBackground(context, outputCanvas.width, outputCanvas.height, background);
  context.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    outputCanvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('Failed to encode PNG export.');
  }

  downloadBlob(blob, 'image/png', filename);
}
