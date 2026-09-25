/**
 * Audio playback strictly using the user-provided MP3 audio file.
 * Stored at src/assets/page-flip.mp3 and public/page-flip.mp3.
 *
 * Plays strictly via new Audio(...), resetting audio.currentTime = 0 on each flip.
 * Completely free of any synthetic oscillators or white noise buffers.
 */

import pageFlipAudioFile from '../assets/page-flip.mp3';

let flipAudio: HTMLAudioElement | null = null;

if (typeof window !== 'undefined') {
  try {
    flipAudio = new Audio(pageFlipAudioFile);
    flipAudio.preload = 'auto';
  } catch {
    // ignore initial constructor error if headless
  }
}

/**
 * Ensures audio instance is initialized and unlocked
 */
export function initPageFlipAudio(): void {
  if (typeof window === 'undefined') return;
  if (!flipAudio) {
    try {
      flipAudio = new Audio('/page-flip.mp3');
      flipAudio.preload = 'auto';
    } catch {
      // ignore
    }
  }
}

/**
 * Plays the user's MP3 file strictly resetting currentTime = 0
 */
export function playPageFlipSound(isMuted: boolean = false): void {
  if (isMuted) return;

  try {
    if (!flipAudio) {
      flipAudio = new Audio(pageFlipAudioFile || '/page-flip.mp3');
      flipAudio.preload = 'auto';
    }

    flipAudio.currentTime = 0;
    const promise = flipAudio.play();
    if (promise !== undefined) {
      promise.catch(() => {
        // Fallback in case path resolution requires absolute /page-flip.mp3
        try {
          const fallback = new Audio('/page-flip.mp3');
          fallback.currentTime = 0;
          fallback.play().catch(() => {});
        } catch {
          // ignore
        }
      });
    }
  } catch (err) {
    console.debug('Audio play skipped:', err);
  }
}
