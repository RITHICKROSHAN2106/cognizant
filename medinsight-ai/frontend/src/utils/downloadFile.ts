/**
 * Robust utility for downloading files from blob responses with explicit filenames,
 * correct MIME types, and cross-browser anchor triggers.
 */

export function getDownloadFilename(
  contentDisposition: string | undefined,
  fallback: string
): string {
  if (!contentDisposition) return fallback;

  // 1. Try RFC 5987 / RFC 6266 filename* (UTF-8 encoded)
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      // Ignore decode error and fallback
    }
  }

  // 2. Try standard filename="..."
  const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  return fallback;
}

export function downloadBlob(
  data: BlobPart,
  mimeType: string,
  filename: string
): void {
  // Ensure filename has no invalid characters
  const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const blob = new Blob([data], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.setAttribute('download', cleanFilename);
  anchor.download = cleanFilename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1500);
}
