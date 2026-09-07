/**
 * Resize an image file in the browser and return a JPEG data URL.
 * Profile photos are cropped to a centred square; documents keep their aspect ratio.
 */
export function resizeImageFile(
  file: File,
  options: { maxSize: number; square?: boolean; quality?: number },
): Promise<string> {
  const { maxSize, square = false, quality = 0.8 } = options;
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process the image"));
        return;
      }
      if (square) {
        const side = Math.min(img.width, img.height);
        const size = Math.min(maxSize, side);
        canvas.width = size;
        canvas.height = size;
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      } else {
        const ratio = Math.min(1, maxSize / img.width, maxSize / img.height);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image"));
    };
    img.src = url;
  });
}

/** Read any file as a data URL (used for PDFs). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}
