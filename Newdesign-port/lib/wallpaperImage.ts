/** Réduit et compresse en JPEG pour limiter la taille en stockage local. */
export async function imageFileToDataUrl(
  file: File,
  maxWidth = 1600,
  quality = 0.82
): Promise<string> {
  const bmp = await createImageBitmap(file);
  try {
    const scale = bmp.width > maxWidth ? maxWidth / bmp.width : 1;
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    ctx.drawImage(bmp, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (!dataUrl || dataUrl.length < 32) throw new Error("Export vide");
    return dataUrl;
  } finally {
    bmp.close();
  }
}
