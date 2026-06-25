/**
 * Safety compatibility utilities to prevent dynamic script errors and iframe sandbox crashes
 * when accessing restricted browser APIs such as Clipboard, MediaDevices, etc.
 */

/**
 * Copies text to the clipboard with full fallback support for cases where navigator.clipboard is unavailable
 */
export const safeCopyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard.writeText failed/blocked, trying fallback:", err);
  }

  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Prevent scrolling to bottom of page
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error("Clipboard copy fallback completely failed:", err);
  }
  return false;
};

/**
 * Safely fetches media stream constraints if available, preventing crashing in restricted iframes.
 */
export const safeGetMediaStream = async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
  try {
    if (
      typeof navigator !== 'undefined' && 
      navigator.mediaDevices && 
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      return await navigator.mediaDevices.getUserMedia(constraints);
    }
    console.warn("navigator.mediaDevices.getUserMedia is not available in this browser/frame context.");
  } catch (err) {
    console.error("Error invoking getUserMedia:", err);
  }
  return null;
};

/**
 * Safely fetches display media constraints if available, preventing crashing in restricted iframes.
 */
export const safeGetDisplayMedia = async (options?: DisplayMediaStreamOptions): Promise<MediaStream | null> => {
  try {
    if (
      typeof navigator !== 'undefined' && 
      navigator.mediaDevices && 
      typeof navigator.mediaDevices.getDisplayMedia === 'function'
    ) {
      return await navigator.mediaDevices.getDisplayMedia(options);
    }
    console.warn("navigator.mediaDevices.getDisplayMedia is not available in this browser/frame context.");
  } catch (err) {
    console.error("Error invoking getDisplayMedia:", err);
  }
  return null;
};
