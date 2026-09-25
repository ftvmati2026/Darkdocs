import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { VisualSettings } from '../types';
import { Footer } from './Footer';
import { playPageFlipSound, initPageFlipAudio } from '../utils/audio';

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
  // Main canvas refs
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hidden background pre-render buffer canvases for instant reveal
  const cachedNextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedPrevCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active rendering tasks
  const currentRenderTaskRef = useRef<RenderTask | null>(null);

  // Page dimensions & rendering state
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Page Curl 3D State (Peel Progress from 0 to 1)
  const [peelProgress, setPeelProgress] = useState<number>(0);
  const [peelCorner, setPeelCorner] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [isPeelAnimating, setIsPeelAnimating] = useState<boolean>(false);
  const [isHoveringCorner, setIsHoveringCorner] = useState<boolean>(false);

  // Drag tracking ref
  const dragRef = useRef<{
    startX: number;
    startY: number;
    corner: 'bottom-right' | 'bottom-left';
    targetP: number;
    startTime: number;
    pointerId: number;
  } | null>(null);

  const animationFrameRef = useRef<number | null>(null);

  // Update total page count when PDF document changes
  useEffect(() => {
    if (pdfDoc) {
      onPageCount(pdfDoc.numPages);
    }
  }, [pdfDoc, onPageCount]);

  // Window resize observer to ensure responsive fit in portrait and landscape
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (onAutoFit) {
        onAutoFit();
      }
    });

    observer.observe(containerRef.current);

    const handleOrientation = () => {
      setTimeout(() => {
        if (onAutoFit) onAutoFit();
      }, 120);
    };

    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [containerRef, onAutoFit]);

  /**
   * Render a specific PDF page onto a target canvas element
   */
  const renderPdfPageToCanvas = useCallback(
    async (
      pageNum: number,
      targetCanvas: HTMLCanvasElement,
      scale: number,
      abortTaskHolder?: React.MutableRefObject<RenderTask | null>
    ): Promise<boolean> => {
      if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return false;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const context = targetCanvas.getContext('2d', { alpha: false });
        if (!context) return false;

        const pixelRatio = window.devicePixelRatio || 1;
        targetCanvas.width = Math.floor(viewport.width * pixelRatio);
        targetCanvas.height = Math.floor(viewport.height * pixelRatio);

        targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
        targetCanvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform =
          pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined;

        const renderContext = {
          canvasContext: context,
          viewport,
          transform,
          canvas: targetCanvas,
        };

        const renderTask = page.render(renderContext);
        if (abortTaskHolder) {
          abortTaskHolder.current = renderTask;
        }

        await renderTask.promise;
        if (abortTaskHolder) {
          abortTaskHolder.current = null;
        }
        return true;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'name' in err &&
          (err as { name: string }).name === 'RenderingCancelledException'
        ) {
          return false;
        }
        return false;
      }
    },
    [pdfDoc]
  );

  /**
   * Main page render effect: Renders current page and pre-renders adjacent pages in background
   */
  useEffect(() => {
    let isCancelled = false;

    const doRender = async () => {
      if (!pdfDoc || !currentCanvasRef.current) return;

      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        currentRenderTaskRef.current = null;
      }

      try {
        setIsRendering(true);
        setRenderError(null);

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;
        const viewport = page.getViewport({ scale: zoom });
        setPageSize({ width: viewport.width, height: viewport.height });

        const success = await renderPdfPageToCanvas(
          currentPage,
          currentCanvasRef.current,
          zoom,
          currentRenderTaskRef
        );

        if (isCancelled) return;

        if (success) {
          setIsRendering(false);

          // Pre-render adjacent pages into hidden buffer canvases
          if (cachedNextCanvasRef.current && currentPage < pdfDoc.numPages) {
            renderPdfPageToCanvas(
              currentPage + 1,
              cachedNextCanvasRef.current,
              zoom
            );
          }
          if (cachedPrevCanvasRef.current && currentPage > 1) {
            renderPdfPageToCanvas(
              currentPage - 1,
              cachedPrevCanvasRef.current,
              zoom
            );
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error rendering page:', err);
          setRenderError('No se pudo renderizar la página del PDF.');
          setIsRendering(false);
        }
      }
    };

    doRender();

    return () => {
      isCancelled = true;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, currentPage, zoom, renderPdfPageToCanvas]);

  /**
   * Copy bitmap from source canvas to destination canvas instantly
   */
  const copyCanvasContent = (
    source: HTMLCanvasElement | null,
    dest: HTMLCanvasElement | null
  ) => {
    if (!source || !dest || source.width === 0 || source.height === 0) return;
    dest.width = source.width;
    dest.height = source.height;
    dest.style.width = source.style.width;
    dest.style.height = source.style.height;
    const ctx = dest.getContext('2d');
    if (ctx) {
      ctx.drawImage(source, 0, 0);
    }
  };

  /**
   * Smoothly animate peel progress from current value to target value using requestAnimationFrame
   */
  const animatePeelTo = useCallback(
    (toProgress: number, duration: number, onComplete?: () => void) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      setIsPeelAnimating(true);
      const startP = peelProgress;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const rawT = Math.min(1, elapsed / duration);
        // Ease-out cubic curve for natural paper snap
        const t = 1 - Math.pow(1 - rawT, 3);
        const currentP = startP + (toProgress - startP) * t;

        setPeelProgress(currentP);

        if (rawT < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          setIsPeelAnimating(false);
          animationFrameRef.current = null;
          if (onComplete) onComplete();
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    },
    [peelProgress]
  );

  /**
   * Trigger complete 3D corner page curl transition (used by steppers, keyboard, and corner clicks)
   */
  const triggerCornerCurlTransition = useCallback(
    (toPage: number) => {
      if (
        !pdfDoc ||
        isPeelAnimating ||
        toPage === currentPage ||
        toPage < 1 ||
        toPage > pdfDoc.numPages
      ) {
        return;
      }

      const isForward = toPage > currentPage;
      const corner = isForward ? 'bottom-right' : 'bottom-left';
      setPeelCorner(corner);
      setTargetPage(toPage);

      // Play user's MP3 strictly at gesture start
      playPageFlipSound(!visualSettings.isSoundEnabled);

      // Prepare target canvas underneath
      if (isForward) {
        if (cachedNextCanvasRef.current && toPage === currentPage + 1) {
          copyCanvasContent(cachedNextCanvasRef.current, targetCanvasRef.current);
        } else if (targetCanvasRef.current) {
          renderPdfPageToCanvas(toPage, targetCanvasRef.current, zoom);
        }
      } else {
        if (cachedPrevCanvasRef.current && toPage === currentPage - 1) {
          copyCanvasContent(cachedPrevCanvasRef.current, targetCanvasRef.current);
        } else if (targetCanvasRef.current) {
          renderPdfPageToCanvas(toPage, targetCanvasRef.current, zoom);
        }
      }

      // Animate corner curl sweep across the page (Page Peel)
      animatePeelTo(1.0, 420, () => {
        setPeelProgress(0);
        setTargetPage(null);
        onPageChange(toPage);
      });
    },
    [
      pdfDoc,
      isPeelAnimating,
      currentPage,
      visualSettings.isSoundEnabled,
      zoom,
      onPageChange,
      renderPdfPageToCanvas,
      animatePeelTo,
    ]
  );

  /**
   * Touch & Pointer Handlers for Interactive Dragging of the Corner Curl
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pdfDoc || isPeelAnimating || pdfDoc.numPages <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    // Check if interaction starts near bottom-right or bottom-left corner
    const distBR = Math.hypot(w - x, h - y);
    const distBL = Math.hypot(x, h - y);

    let corner: 'bottom-right' | 'bottom-left' = 'bottom-right';
    let nextP = currentPage + 1;

    if (distBR < 160 || x > w * 0.55) {
      if (currentPage >= pdfDoc.numPages) return;
      corner = 'bottom-right';
      nextP = currentPage + 1;
    } else if (distBL < 160 || x < w * 0.45) {
      if (currentPage <= 1) return;
      corner = 'bottom-left';
      nextP = currentPage - 1;
    } else {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      corner,
      targetP: nextP,
      startTime: Date.now(),
      pointerId: e.pointerId,
    };

    setPeelCorner(corner);
    setTargetPage(nextP);

    // Play user's MP3 strictly at touch start
    initPageFlipAudio();
    playPageFlipSound(!visualSettings.isSoundEnabled);

    // Prepare target canvas
    if (corner === 'bottom-right') {
      if (cachedNextCanvasRef.current && nextP === currentPage + 1) {
        copyCanvasContent(cachedNextCanvasRef.current, targetCanvasRef.current);
      } else if (targetCanvasRef.current) {
        renderPdfPageToCanvas(nextP, targetCanvasRef.current, zoom);
      }
    } else {
      if (cachedPrevCanvasRef.current && nextP === currentPage - 1) {
        copyCanvasContent(cachedPrevCanvasRef.current, targetCanvasRef.current);
      } else if (targetCanvasRef.current) {
        renderPdfPageToCanvas(nextP, targetCanvasRef.current, zoom);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !pageSize.width || !pageSize.height) return;

    const { startX, startY, corner } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const diagonal = Math.hypot(pageSize.width, pageSize.height);

    let progress = 0;
    if (corner === 'bottom-right') {
      // Pulling toward top-left increases peel progress
      const pullDist = (-dx - dy) / Math.SQRT2;
      progress = Math.max(0, Math.min(1, pullDist / (diagonal * 0.65)));
    } else {
      // Pulling toward top-right increases backward peel progress
      const pullDist = (dx - dy) / Math.SQRT2;
      progress = Math.max(0, Math.min(1, pullDist / (diagonal * 0.65)));
    }

    setPeelProgress(progress);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !pdfDoc) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const { targetP, startTime, startX } = dragRef.current;
    const elapsed = Date.now() - startTime;
    const dx = Math.abs(e.clientX - startX);
    dragRef.current = null;

    const isFlick = dx > 35 && elapsed < 300;
    const shouldTurn = peelProgress > 0.22 || isFlick;

    if (shouldTurn && targetP !== null) {
      animatePeelTo(1.0, 360, () => {
        setPeelProgress(0);
        setTargetPage(null);
        onPageChange(targetP);
      });
    } else {
      animatePeelTo(0, 240, () => {
        setPeelProgress(0);
        setTargetPage(null);
      });
    }
  };

  // Keyboard navigation triggers 3D corner peel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (!pdfDoc || isPeelAnimating) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentPage < pdfDoc.numPages) {
          triggerCornerCurlTransition(currentPage + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentPage > 1) {
          triggerCornerCurlTransition(currentPage - 1);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        triggerCornerCurlTransition(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        triggerCornerCurlTransition(pdfDoc.numPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfDoc, currentPage, isPeelAnimating, triggerCornerCurlTransition]);

  // Color mapping from visual calibration settings
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

  // Effective peel progress (accounting for hover hint: ~0.11 when hovered)
  const activePeel =
    peelProgress > 0
      ? peelProgress
      : isHoveringCorner && !isPeelAnimating && currentPage < (pdfDoc?.numPages || 1)
      ? 0.11
      : 0;

  // Geometry calculation for the 3D Conical Page Curl matching the user image
  const W = pageSize.width || 600;
  const H = pageSize.height || 800;
  const diagonal = Math.hypot(W, H);
  const peelDepth = activePeel * diagonal * 1.32;

  let clipPolygon = 'none';
  let flapPath = '';
  let shadowPath = '';
  let gradX1 = 0;
  let gradY1 = 0;
  let gradX2 = 0;
  let gradY2 = 0;

  if (activePeel > 0) {
    if (peelCorner === 'bottom-right') {
      const cutX = Math.max(0, W - peelDepth * 0.72);
      const cutY = Math.max(0, H - peelDepth * 0.72);

      // Apex of the curled flap (pulled inward toward center)
      const apexX = W - peelDepth * 0.88;
      const apexY = H - peelDepth * 0.88;

      // Parabolic bezier control points forming the curved conical cone in image.png
      const cx1 = apexX + (W - cutX) * 0.35;
      const cy1 = H + peelDepth * 0.08;
      const cx2 = W + peelDepth * 0.08;
      const cy2 = apexY + (H - cutY) * 0.35;
      const cxCrease = (cutX + W) / 2 - peelDepth * 0.05;
      const cyCrease = (cutY + H) / 2 - peelDepth * 0.05;

      flapPath = `M ${cutX} ${H} Q ${cx1} ${cy1} ${apexX} ${apexY} Q ${cx2} ${cy2} ${W} ${cutY} Q ${cxCrease} ${cyCrease} ${cutX} ${H} Z`;
      shadowPath = `M ${cutX} ${H} Q ${cx1 - 10} ${cy1 - 10} ${apexX - 12} ${apexY - 12} Q ${cx2 - 10} ${cy2 - 10} ${W} ${cutY} Z`;

      clipPolygon = `polygon(0 0, 100% 0, 100% ${Math.round(cutY)}px, ${Math.round(cutX)}px 100%, 0 100%)`;

      gradX1 = apexX;
      gradY1 = apexY;
      gradX2 = (cutX + W) / 2;
      gradY2 = (cutY + H) / 2;
    } else {
      // Bottom-left corner peel
      const cutX = Math.min(W, peelDepth * 0.72);
      const cutY = Math.max(0, H - peelDepth * 0.72);

      const apexX = peelDepth * 0.88;
      const apexY = H - peelDepth * 0.88;

      const cx1 = apexX - cutX * 0.35;
      const cy1 = H + peelDepth * 0.08;
      const cx2 = -peelDepth * 0.08;
      const cy2 = apexY + (H - cutY) * 0.35;
      const cxCrease = cutX / 2 + peelDepth * 0.05;
      const cyCrease = (cutY + H) / 2 - peelDepth * 0.05;

      flapPath = `M ${cutX} ${H} Q ${cx1} ${cy1} ${apexX} ${apexY} Q ${cx2} ${cy2} 0 ${cutY} Q ${cxCrease} ${cyCrease} ${cutX} ${H} Z`;
      shadowPath = `M ${cutX} ${H} Q ${cx1 + 10} ${cy1 - 10} ${apexX + 12} ${apexY - 12} Q ${cx2 + 10} ${cy2 - 10} 0 ${cutY} Z`;

      clipPolygon = `polygon(0 0, 100% 0, 100% 100%, ${Math.round(cutX)}px 100%, 0 ${Math.round(cutY)}px)`;

      gradX1 = apexX;
      gradY1 = apexY;
      gradX2 = cutX / 2;
      gradY2 = (cutY + H) / 2;
    }
  }

  const isCurlVisible = activePeel > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col items-center justify-start min-h-[calc(100vh-3.5rem)] py-2 sm:py-5 md:py-8 px-1 sm:px-4 md:px-6 overflow-x-hidden overflow-y-auto selection:bg-[#f59e0b] selection:text-[#0f131c] touch-pan-y"
      style={{
        backgroundColor: isDarkMode
          ? visualSettings.backgroundPreset === 'sepia'
            ? '#140f0c'
            : '#0a0e16'
          : '#f8fafc',
      }}
    >
      {/* Hidden background pre-render buffer canvases */}
      <div className="hidden" aria-hidden="true">
        <canvas ref={cachedNextCanvasRef} />
        <canvas ref={cachedPrevCanvasRef} />
      </div>

      {/* Render error fallback if any */}
      {renderError && (
        <div className="mb-4 px-4 py-2 bg-red-950/50 border border-red-500/50 rounded-lg text-red-200 text-xs">
          {renderError}
        </div>
      )}

      {/* DOCUMENT STAGE: Page Curl 3D Viewport matching image.png */}
      <div className="relative z-10 flex flex-col items-center max-w-full transition-all duration-150">
        {/* Book Outer Wrapper */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative select-none rounded-lg sm:rounded-xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.92),0_0_1px_1px_rgba(255,255,255,0.07)] transition-shadow duration-300 max-w-full cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: getContainerBg(),
            width: pageSize.width ? `${Math.floor(pageSize.width)}px` : 'auto',
            height: pageSize.height ? `${Math.floor(pageSize.height)}px` : 'auto',
            minWidth: '260px',
            minHeight: '340px',
            maxWidth: '100vw',
          }}
        >
          {/* LAYER 1: BASE / REVEALED TARGET PAGE (visible through cutaway corner) */}
          <div
            className="absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden pointer-events-none"
            style={{
              display: isCurlVisible ? 'block' : 'none',
              backgroundColor: getContainerBg(),
            }}
          >
            <canvas
              ref={targetCanvasRef}
              className="block mx-auto max-w-full h-auto"
              style={{
                filter: isDarkMode
                  ? `invert(1) hue-rotate(180deg) brightness(${visualSettings.backgroundIntensity}) contrast(${visualSettings.textContrast})`
                  : 'none',
                backgroundColor: '#ffffff',
              }}
            />

            {bgTint && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-screen opacity-90"
                style={{ backgroundColor: bgTint }}
              />
            )}
            {textTint && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-95"
                style={{ backgroundColor: textTint }}
              />
            )}
          </div>

          {/* LAYER 2: CURRENT ACTIVE PAGE (with dynamic corner cutaway clip) */}
          <div
            className="relative rounded-lg sm:rounded-xl overflow-hidden pointer-events-none"
            style={{
              backgroundColor: getContainerBg(),
              clipPath: isCurlVisible ? clipPolygon : undefined,
              WebkitClipPath: isCurlVisible ? clipPolygon : undefined,
            }}
          >
            <canvas
              ref={currentCanvasRef}
              className="block mx-auto max-w-full h-auto transition-[filter] duration-200"
              style={{
                filter: isDarkMode
                  ? `invert(1) hue-rotate(180deg) brightness(${visualSettings.backgroundIntensity}) contrast(${visualSettings.textContrast})`
                  : 'none',
                backgroundColor: '#ffffff',
              }}
            />

            {/* Background Tint Layer */}
            {bgTint && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-screen opacity-90 transition-opacity"
                style={{ backgroundColor: bgTint }}
              />
            )}

            {/* Text Color Tint Overlay */}
            {textTint && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-95 transition-opacity"
                style={{ backgroundColor: textTint }}
              />
            )}

            {/* Spine shadow */}
            <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
          </div>

          {/* LAYER 3: 3D REAL PAGE CURL & SHADOW OVERLAY (exact replica of image.png) */}
          {isCurlVisible && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              viewBox={`0 0 ${W} ${H}`}
              style={{ zIndex: 25 }}
            >
              <defs>
                {/* Curved drop shadow filter projecting under the curled corner flap */}
                <filter id="page-curl-drop-shadow" x="-20%" y="-20%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="12" result="blur" />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.85 0"
                  />
                  <feOffset dx="-8" dy="-8" />
                  <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
                </filter>

                {/* Conical Specular Sheen Gradient identical to the gradient in image.png */}
                <linearGradient
                  id="conicalPeelGradient"
                  x1={gradX1}
                  y1={gradY1}
                  x2={gradX2}
                  y2={gradY2}
                  gradientUnits="userSpaceOnUse"
                >
                  {isDarkMode ? (
                    <>
                      <stop offset="0%" stopColor="#0b0f17" stopOpacity="0.95" />
                      <stop offset="22%" stopColor="#2c3647" stopOpacity="0.88" />
                      <stop offset="44%" stopColor="#8191a8" stopOpacity="0.75" />
                      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="56%" stopColor="#55657d" stopOpacity="0.85" />
                      <stop offset="78%" stopColor="#1e2634" stopOpacity="0.92" />
                      <stop offset="100%" stopColor="#080b11" stopOpacity="1" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#52525b" stopOpacity="0.95" />
                      <stop offset="25%" stopColor="#a1a1aa" stopOpacity="0.85" />
                      <stop offset="48%" stopColor="#f4f4f5" stopOpacity="0.95" />
                      <stop offset="52%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="68%" stopColor="#d4d4d8" stopOpacity="0.9" />
                      <stop offset="85%" stopColor="#71717a" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#27272a" stopOpacity="1" />
                    </>
                  )}
                </linearGradient>
              </defs>

              {/* Realistic soft drop shadow under the curved corner */}
              <path
                d={shadowPath}
                fill="black"
                opacity="0.8"
                filter="url(#page-curl-drop-shadow)"
              />

              {/* The Curled Flap with metallic specular conical reflection */}
              <path
                d={flapPath}
                fill="url(#conicalPeelGradient)"
                stroke={isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)'}
                strokeWidth="0.8"
              />
            </svg>
          )}

          {/* Interactive Hover & Drag Grab Zones in the Corners */}
          {currentPage < (pdfDoc?.numPages || 1) && (
            <div
              className="absolute bottom-0 right-0 w-24 h-24 z-30 cursor-pointer"
              onMouseEnter={() => setIsHoveringCorner(true)}
              onMouseLeave={() => setIsHoveringCorner(false)}
              onClick={(e) => {
                e.stopPropagation();
                triggerCornerCurlTransition(currentPage + 1);
              }}
              title="Hacer clic o arrastrar para pasar página con efecto Page Curl 3D"
            />
          )}

          {currentPage > 1 && (
            <div
              className="absolute bottom-0 left-0 w-24 h-24 z-30 cursor-pointer"
              onMouseEnter={() => {
                setPeelCorner('bottom-left');
                setIsHoveringCorner(true);
              }}
              onMouseLeave={() => setIsHoveringCorner(false)}
              onClick={(e) => {
                e.stopPropagation();
                triggerCornerCurlTransition(currentPage - 1);
              }}
              title="Hacer clic o arrastrar para volver con efecto Page Curl 3D"
            />
          )}

          {/* Loading spinner overlay */}
          {isRendering && (
            <div className="absolute inset-0 bg-[#0a0e16]/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-40">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#111827]/90 border border-[#334155]/60 text-xs font-['JetBrains_Mono'] text-[#f59e0b] shadow-lg">
                <div className="w-3 h-3 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
                <span>Cargando pág. {currentPage}...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer info at bottom of page with padding to clear HUD */}
        <div className="w-full max-w-2xl mt-10 pb-20">
          <Footer />
        </div>
      </div>
    </div>
  );
};
