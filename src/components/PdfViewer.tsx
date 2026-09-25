import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { VisualSettings } from '../types';
import { Footer } from './Footer';

interface PdfViewerProps {
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  zoom: number;
  isDarkMode: boolean;
  visualSettings: VisualSettings;
  onPageCount: (count: number) => void;
  onPageChange: (newPage: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAutoFit?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDoc,
  currentPage,
  zoom,
  isDarkMode,
  visualSettings,
  onPageCount,
  onPageChange,
  containerRef,
  onAutoFit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRenderTaskRef = useRef<RenderTask | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Update total page count when PDF document changes
  useEffect(() => {
    if (pdfDoc) {
      onPageCount(pdfDoc.numPages);
    }
  }, [pdfDoc, onPageCount]);

  // Window resize observer to ensure no horizontal overflow on mobile/tablet
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      // If mobile screen, trigger auto-fit to container width
      if (window.innerWidth < 768 && onAutoFit) {
        onAutoFit();
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, onAutoFit]);

  // Main page rendering logic with pdfjs-dist
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any previous in-progress render task to prevent collisions
    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
      } catch {
        // Ignore cancellation errors
      }
      currentRenderTaskRef.current = null;
    }

    try {
      setIsRendering(true);
      setRenderError(null);

      // Load specific page
      const page = await pdfDoc.getPage(currentPage);

      // Calculate viewport at current zoom scale
      const viewport = page.getViewport({ scale: zoom });
      setPageSize({ width: viewport.width, height: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      // Handle High-DPI screens (Retina displays) for sharp text rendering
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);

      // CSS dimensions match the zoom scale
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      // Set transform for HiDPI
      const transform =
        pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

      // Render onto canvas
      const renderContext = {
        canvasContext: context,
        viewport,
        transform,
        canvas,
      };

      const renderTask = page.render(renderContext);
      currentRenderTaskRef.current = renderTask;

      await renderTask.promise;
      currentRenderTaskRef.current = null;
      setIsRendering(false);
    } catch (err: unknown) {
      // Don't show error if task was cancelled intentionally by another render
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'RenderingCancelledException') {
        return;
      }
      console.error('Error rendering page with pdfjs-dist:', err);
      setRenderError('No se pudo renderizar la página del PDF.');
      setIsRendering(false);
    }
  }, [pdfDoc, currentPage, zoom]);

  useEffect(() => {
    renderPage();

    return () => {
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [renderPage]);

  // Keyboard navigation for previous/next page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (!pdfDoc) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentPage < pdfDoc.numPages) {
          onPageChange(currentPage + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentPage > 1) {
          onPageChange(currentPage - 1);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        onPageChange(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        onPageChange(pdfDoc.numPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfDoc, currentPage, onPageChange]);

  // Map visual settings to styles
  const getContainerBg = () => {
    if (!isDarkMode) return '#f1f5f9';
    switch (visualSettings.backgroundPreset) {
      case 'sepia':
        return '#191410';
      case 'gray':
        return '#1a1a1c';
      case 'black':
      default:
        return '#000000';
    }
  };

  const getTextTintOverlay = () => {
    if (!isDarkMode || visualSettings.textColorPreset === 'white') return null;
    switch (visualSettings.textColorPreset) {
      case 'sepia':
        return '#f5e6d3';
      case 'amber':
        return '#ffc174';
      case 'green':
        return '#6ffbbe';
      default:
        return null;
    }
  };

  const getBackgroundTintOverlay = () => {
    if (!isDarkMode || visualSettings.backgroundPreset === 'black') return null;
    switch (visualSettings.backgroundPreset) {
      case 'sepia':
        return '#261e18';
      case 'gray':
        return '#202022';
      default:
        return null;
    }
  };

  const textTint = getTextTintOverlay();
  const bgTint = getBackgroundTintOverlay();

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col items-center justify-start min-h-[calc(100vh-3.5rem)] py-4 sm:py-8 px-2 sm:px-6 md:px-10 overflow-x-hidden overflow-y-auto selection:bg-[#f59e0b] selection:text-[#0f131c]"
      style={{
        backgroundColor: isDarkMode ? (visualSettings.backgroundPreset === 'sepia' ? '#140f0c' : '#0a0e16') : '#f8fafc',
      }}
    >
      {/* Render error fallback if any */}
      {renderError && (
        <div className="mb-4 px-4 py-2 bg-red-950/40 border border-red-500/50 rounded-lg text-red-200 text-xs">
          {renderError}
        </div>
      )}

      {/* DOCUMENT STAGE: Focused Digital Paper Viewport with responsive constraints */}
      <div className="relative z-10 flex flex-col items-center max-w-full transition-all duration-200">
        {/* Paper wrapper with realistic high-end shadows and border */}
        <div
          className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(255,255,255,0.06)] transition-all max-w-full"
          style={{
            backgroundColor: getContainerBg(),
            minWidth: pageSize.width ? `${Math.min(pageSize.width, window.innerWidth - 32)}px` : '280px',
            minHeight: pageSize.height ? `${Math.min(pageSize.height, 380)}px` : '380px',
          }}
        >
          {/* Real PDF Canvas with Invert Filter & Visual Settings Calibration */}
          <canvas
            ref={canvasRef}
            className="block mx-auto max-w-full h-auto transition-[filter] duration-200"
            style={{
              filter: isDarkMode
                ? `invert(1) hue-rotate(180deg) brightness(${visualSettings.backgroundIntensity}) contrast(${visualSettings.textContrast})`
                : 'none',
              backgroundColor: '#ffffff',
            }}
          />

          {/* Background Lift Layer for Sepia or Gray */}
          {bgTint && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-screen opacity-90 transition-opacity"
              style={{ backgroundColor: bgTint }}
            />
          )}

          {/* Text Color Tint Overlay using Multiply Blend Mode */}
          {textTint && (
            <div
              className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-95 transition-opacity"
              style={{ backgroundColor: textTint }}
            />
          )}

          {/* Loading spinner overlay */}
          {isRendering && (
            <div className="absolute inset-0 bg-[#0a0e16]/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#111827]/90 border border-[#334155]/60 text-xs font-['JetBrains_Mono'] text-[#f59e0b] shadow-lg">
                <div className="w-3 h-3 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
                <span>Cargando pág. {currentPage}...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer at bottom of document stage (with pb-20 to clear floating HUD) */}
        <div className="w-full max-w-2xl mt-12 pb-20">
          <Footer />
        </div>
      </div>
    </div>
  );
};
