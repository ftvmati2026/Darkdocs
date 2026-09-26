import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const currentImageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetImageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hidden background pre-render buffer canvases for instant reveal
  const cachedNextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedNextImageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedPrevCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedPrevImageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active rendering tasks
  const currentRenderTaskRef = useRef<RenderTask | null>(null);
  const prefetchNextTaskRef = useRef<RenderTask | null>(null);
  const prefetchPrevTaskRef = useRef<RenderTask | null>(null);
  const prevPageRef = useRef<number>(currentPage);

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

  // Drag & Scroll vs Swipe tracking ref
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    corner: 'bottom-right' | 'bottom-left';
    targetP: number;
    pointerId: number;
    status: 'undetermined' | 'scrolling' | 'swiping';
    isCornerStart: boolean;
    audioPlayed: boolean;
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
   * Render a specific PDF page onto a target canvas element asynchronously with memory cleanup
   * Also captures all images/photos/illustrations onto imageCanvas for smart dark mode re-inversion
   */
  const renderPdfPageToCanvas = useCallback(
    async (
      pageNum: number,
      targetCanvas: HTMLCanvasElement,
      scale: number,
      abortTaskHolder?: React.MutableRefObject<RenderTask | null>,
      imageCanvas?: HTMLCanvasElement | null
    ): Promise<boolean> => {
      if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return false;

      let page: any = null;
      let restoreDrawImage: (() => void) | null = null;

      try {
        page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const context = targetCanvas.getContext('2d', { alpha: false });
        if (!context) return false;

        const pixelRatio = window.devicePixelRatio || 1;
        const targetW = Math.floor(viewport.width * pixelRatio);
        const targetH = Math.floor(viewport.height * pixelRatio);

        targetCanvas.width = targetW;
        targetCanvas.height = targetH;
        targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
        targetCanvas.style.height = `${Math.floor(viewport.height)}px`;

        // Configure image overlay canvas for Smart Dark Mode
        if (imageCanvas) {
          imageCanvas.width = targetW;
          imageCanvas.height = targetH;
          imageCanvas.style.width = `${Math.floor(viewport.width)}px`;
          imageCanvas.style.height = `${Math.floor(viewport.height)}px`;
          const imageCtx = imageCanvas.getContext('2d');
          if (imageCtx) {
            imageCtx.clearRect(0, 0, targetW, targetH);

            const origDrawImage = context.drawImage;
            // Intercept image drawing to replicate photos/illustrations onto imageCanvas
            context.drawImage = function (this: any, ...args: any[]) {
              try {
                if (context.getTransform && imageCtx.setTransform) {
                  imageCtx.setTransform(context.getTransform());
                }
                imageCtx.globalAlpha = context.globalAlpha;
                imageCtx.globalCompositeOperation = context.globalCompositeOperation;
                // @ts-ignore
                imageCtx.drawImage(...args);
              } catch {
                // ignore
              }
              return origDrawImage.apply(this, args as any);
            } as any;

            restoreDrawImage = () => {
              context.drawImage = origDrawImage;
            };
          }
        }

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

        if (restoreDrawImage) {
          restoreDrawImage();
          restoreDrawImage = null;
        }

        // Release memory allocated by pdf.js for glyphs, image bitmaps, and operator lists:
        if (page && typeof page.cleanup === 'function') {
          page.cleanup();
        }

        return true;
      } catch (err: unknown) {
        if (restoreDrawImage) {
          restoreDrawImage();
          restoreDrawImage = null;
        }
        if (page && typeof page.cleanup === 'function') {
          try {
            page.cleanup();
          } catch {
            // ignore
          }
        }
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
   * Main page render effect: Renders current page immediately and pre-renders adjacent pages lazily
   */
  useEffect(() => {
    let isCancelled = false;

    const doRender = async () => {
      if (!pdfDoc || !currentCanvasRef.current) return;

      // Cancel any ongoing tasks from previous page requests
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        currentRenderTaskRef.current = null;
      }
      if (prefetchNextTaskRef.current) {
        try {
          prefetchNextTaskRef.current.cancel();
        } catch {
          // ignore
        }
        prefetchNextTaskRef.current = null;
      }
      if (prefetchPrevTaskRef.current) {
        try {
          prefetchPrevTaskRef.current.cancel();
        } catch {
          // ignore
        }
        prefetchPrevTaskRef.current = null;
      }

      // If user jumped across pages (not an adjacent flip), reset cached canvases to free memory
      if (Math.abs(currentPage - prevPageRef.current) > 1) {
        if (cachedNextCanvasRef.current) {
          cachedNextCanvasRef.current.width = 1;
          cachedNextCanvasRef.current.height = 1;
        }
        if (cachedNextImageCanvasRef.current) {
          cachedNextImageCanvasRef.current.width = 1;
          cachedNextImageCanvasRef.current.height = 1;
        }
        if (cachedPrevCanvasRef.current) {
          cachedPrevCanvasRef.current.width = 1;
          cachedPrevCanvasRef.current.height = 1;
        }
        if (cachedPrevImageCanvasRef.current) {
          cachedPrevImageCanvasRef.current.width = 1;
          cachedPrevImageCanvasRef.current.height = 1;
        }
      }
      prevPageRef.current = currentPage;

      try {
        setIsRendering(true);
        setRenderError(null);

        // 1. Fetch current page structure and calculate viewport
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) {
          if (page && typeof page.cleanup === 'function') page.cleanup();
          return;
        }
        const viewport = page.getViewport({ scale: zoom });
        setPageSize({ width: viewport.width, height: viewport.height });
        if (page && typeof page.cleanup === 'function') {
          page.cleanup();
        }

        // 2. Render active page immediately with dedicated image layer
        const success = await renderPdfPageToCanvas(
          currentPage,
          currentCanvasRef.current,
          zoom,
          currentRenderTaskRef,
          currentImageCanvasRef.current
        );

        if (isCancelled) return;

        if (success) {
          setIsRendering(false);

          // Flush unreferenced page resources in pdf.js
          if (typeof pdfDoc.cleanup === 'function') {
            try {
              pdfDoc.cleanup();
            } catch {
              // ignore
            }
          }

          // 3. Lazily pre-render ONLY adjacent pages (N+1 and N-1) with lower priority
          setTimeout(() => {
            if (isCancelled) return;
            if (cachedNextCanvasRef.current && currentPage < pdfDoc.numPages) {
              renderPdfPageToCanvas(
                currentPage + 1,
                cachedNextCanvasRef.current,
                zoom,
                prefetchNextTaskRef,
                cachedNextImageCanvasRef.current
              );
            }
            if (cachedPrevCanvasRef.current && currentPage > 1) {
              renderPdfPageToCanvas(
                currentPage - 1,
                cachedPrevCanvasRef.current,
                zoom,
                prefetchPrevTaskRef,
                cachedPrevImageCanvasRef.current
              );
            }
          }, 80);
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
      if (prefetchNextTaskRef.current) {
        try {
          prefetchNextTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
      if (prefetchPrevTaskRef.current) {
        try {
          prefetchPrevTaskRef.current.cancel();
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
          copyCanvasContent(cachedNextImageCanvasRef.current, targetImageCanvasRef.current);
        } else if (targetCanvasRef.current) {
          renderPdfPageToCanvas(toPage, targetCanvasRef.current, zoom, undefined, targetImageCanvasRef.current);
        }
      } else {
        if (cachedPrevCanvasRef.current && toPage === currentPage - 1) {
          copyCanvasContent(cachedPrevCanvasRef.current, targetCanvasRef.current);
          copyCanvasContent(cachedPrevImageCanvasRef.current, targetImageCanvasRef.current);
        } else if (targetCanvasRef.current) {
          renderPdfPageToCanvas(toPage, targetCanvasRef.current, zoom, undefined, targetImageCanvasRef.current);
        }
      }

      // Animate corner curl sweep across the page (Page Peel)
      animatePeelTo(1.0, 380, () => {
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
   * Strict Scroll vs Swipe Gesture Handlers
   * - Keeps central reading zone free for vertical scroll
   * - Blocks page turn if Math.abs(deltaY) > Math.abs(deltaX)
   * - Requires Math.abs(deltaX) > 60px with clear horizontal angle to turn page
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pdfDoc || isPeelAnimating || pdfDoc.numPages <= 1) return;

    // Ignore clicks on buttons, links or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    const distBR = Math.hypot(w - x, h - y);
    const distBL = Math.hypot(x, h - y);

    const isCornerBR = distBR < 120;
    const isCornerBL = distBL < 120;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      corner: isCornerBL ? 'bottom-left' : 'bottom-right',
      targetP: 0,
      pointerId: e.pointerId,
      status: 'undetermined',
      isCornerStart: isCornerBR || isCornerBL,
      audioPlayed: false,
    };

    // Unlock audio context silently if needed
    initPageFlipAudio();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !pageSize.width || !pageSize.height) return;

    const { startX, startY, status, isCornerStart } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // 1. If gesture is already determined to be vertical scrolling, ignore and allow native scroll
    if (status === 'scrolling') {
      return;
    }

    // 2. Strict Scroll vs Swipe check:
    // If vertical movement is greater than horizontal movement, lock to scroll mode
    if (status === 'undetermined') {
      if (absY > absX || absY > 12) {
        dragRef.current.status = 'scrolling';
        setPeelProgress(0);
        setTargetPage(null);
        return;
      }

      // Only enter swiping mode if horizontal movement is clearly dominant
      const minThreshold = isCornerStart ? 18 : 28;
      const isClearlyHorizontal = absX > absY * 1.5;

      if (absX > minThreshold && isClearlyHorizontal) {
        const isForward = deltaX < 0;
        const corner: 'bottom-right' | 'bottom-left' = isForward ? 'bottom-right' : 'bottom-left';
        const nextP = isForward ? currentPage + 1 : currentPage - 1;

        if (nextP < 1 || nextP > (pdfDoc?.numPages || 1)) {
          dragRef.current.status = 'scrolling';
          return;
        }

        dragRef.current.status = 'swiping';
        dragRef.current.corner = corner;
        dragRef.current.targetP = nextP;

        setPeelCorner(corner);
        setTargetPage(nextP);

        // Prepare target canvas underneath
        if (isForward) {
          if (cachedNextCanvasRef.current && nextP === currentPage + 1) {
            copyCanvasContent(cachedNextCanvasRef.current, targetCanvasRef.current);
            copyCanvasContent(cachedNextImageCanvasRef.current, targetImageCanvasRef.current);
          } else if (targetCanvasRef.current) {
            renderPdfPageToCanvas(nextP, targetCanvasRef.current, zoom, undefined, targetImageCanvasRef.current);
          }
        } else {
          if (cachedPrevCanvasRef.current && nextP === currentPage - 1) {
            copyCanvasContent(cachedPrevCanvasRef.current, targetCanvasRef.current);
            copyCanvasContent(cachedPrevImageCanvasRef.current, targetImageCanvasRef.current);
          } else if (targetCanvasRef.current) {
            renderPdfPageToCanvas(nextP, targetCanvasRef.current, zoom, undefined, targetImageCanvasRef.current);
          }
        }

        // Play user's MP3 strictly upon confirming horizontal swipe
        if (!dragRef.current.audioPlayed) {
          dragRef.current.audioPlayed = true;
          playPageFlipSound(!visualSettings.isSoundEnabled);
        }
      }
    }

    // 3. During active horizontal swiping:
    if (dragRef.current.status === 'swiping') {
      // If user swerved into predominantly vertical movement, cancel swipe
      if (absY > absX) {
        dragRef.current.status = 'scrolling';
        setPeelProgress(0);
        setTargetPage(null);
        return;
      }

      const stageWidth = Math.max(260, pageSize.width);
      const progress = Math.max(0, Math.min(1, (absX - 25) / (stageWidth * 0.52)));
      setPeelProgress(progress);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !pdfDoc) return;

    const { startX, startY, startTime, status, targetP } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const elapsed = Date.now() - startTime;
    dragRef.current = null;

    if (status === 'swiping') {
      // Swipe threshold rule: strictly requires Math.abs(deltaX) > 60px and horizontal angle
      const isAngleClearlyHorizontal = absX > absY;
      const passesMinDistance = absX > 60;
      const isFlick = passesMinDistance && elapsed < 350;
      const shouldTurn =
        isAngleClearlyHorizontal &&
        passesMinDistance &&
        (peelProgress > 0.20 || isFlick);

      if (shouldTurn && targetP !== null && targetP >= 1 && targetP <= pdfDoc.numPages) {
        animatePeelTo(1.0, 340, () => {
          setPeelProgress(0);
          setTargetPage(null);
          onPageChange(targetP);
        });
      } else {
        animatePeelTo(0, 220, () => {
          setPeelProgress(0);
          setTargetPage(null);
        });
      }
    } else {
      setPeelProgress(0);
      setTargetPage(null);
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
        <canvas ref={cachedNextImageCanvasRef} />
        <canvas ref={cachedPrevCanvasRef} />
        <canvas ref={cachedPrevImageCanvasRef} />
      </div>

      {/* Render error fallback if any */}
      {renderError && (
        <div className="mb-4 px-4 py-2 bg-red-950/50 border border-red-500/50 rounded-lg text-red-200 text-xs">
          {renderError}
        </div>
      )}

      {/* Discrete Floating Navigation Arrows on Lateral Edges (Mobile & Desktop) */}
      {currentPage > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerCornerCurlTransition(currentPage - 1);
          }}
          aria-label="Página anterior"
          title="Página anterior (o desliza horizontalmente)"
          className="fixed left-2 sm:left-5 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-3 rounded-full bg-[#111827]/85 hover:bg-[#111827] active:scale-95 backdrop-blur-md border border-[#334155]/80 hover:border-[#4cd7f6]/80 text-[#94a3b8] hover:text-[#4cd7f6] shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-all duration-200 group cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

      {currentPage < (pdfDoc?.numPages || 1) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerCornerCurlTransition(currentPage + 1);
          }}
          aria-label="Página siguiente"
          title="Página siguiente (o desliza horizontalmente)"
          className="fixed right-2 sm:right-5 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-3 rounded-full bg-[#111827]/85 hover:bg-[#111827] active:scale-95 backdrop-blur-md border border-[#334155]/80 hover:border-[#f59e0b]/80 text-[#94a3b8] hover:text-[#f59e0b] shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-all duration-200 group cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* DOCUMENT STAGE: Page Curl 3D Viewport */}
      <div className="relative z-10 flex flex-col items-center max-w-full transition-all duration-150">
        {/* Book Outer Wrapper */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative select-none rounded-lg sm:rounded-xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.92),0_0_1px_1px_rgba(255,255,255,0.07)] transition-shadow duration-300 max-w-full touch-pan-y"
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
            className={`absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden pointer-events-none pdf-page-canvas-wrapper ${
              isDarkMode ? 'dark-mode' : ''
            }`}
            style={{
              display: isCurlVisible ? 'block' : 'none',
              backgroundColor: getContainerBg(),
            }}
          >
            {/* Base Canvas: Text, Vectors, Background (Inverted via CSS class .dark-mode without inline style) */}
            <canvas
              ref={targetCanvasRef}
              className="pdf-page-canvas block mx-auto max-w-full h-auto"
              style={{
                backgroundColor: '#ffffff',
              }}
            />

            {/* Dedicated Image Layer: Photos, illustrations, graphics (Re-inverted via .dark-mode canvas.image-layer to restore true original colors) */}
            <canvas
              ref={targetImageCanvasRef}
              className="image-layer pdf-image absolute inset-0 block mx-auto max-w-full h-auto pointer-events-none"
              style={{
                display: isDarkMode ? 'block' : 'none',
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
            className={`relative rounded-lg sm:rounded-xl overflow-hidden pointer-events-none pdf-page-canvas-wrapper ${
              isDarkMode ? 'dark-mode' : ''
            }`}
            style={{
              backgroundColor: getContainerBg(),
              clipPath: isCurlVisible ? clipPolygon : undefined,
              WebkitClipPath: isCurlVisible ? clipPolygon : undefined,
            }}
          >
            {/* Base Canvas: Text, Vectors, Background (Inverted via CSS class .dark-mode without inline style) */}
            <canvas
              ref={currentCanvasRef}
              className="pdf-page-canvas block mx-auto max-w-full h-auto transition-[filter] duration-200"
              style={{
                backgroundColor: '#ffffff',
              }}
            />

            {/* Dedicated Image Layer: Photos, illustrations, graphics (Re-inverted via .dark-mode canvas.image-layer to restore true original colors) */}
            <canvas
              ref={currentImageCanvasRef}
              className="image-layer pdf-image absolute inset-0 block mx-auto max-w-full h-auto pointer-events-none"
              style={{
                display: isDarkMode ? 'block' : 'none',
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

          {/* LAYER 3: 3D REAL PAGE CURL & SHADOW OVERLAY */}
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

          {/* Interactive Hover & Click Zones in the Corners */}
          {currentPage < (pdfDoc?.numPages || 1) && (
            <div
              className="absolute bottom-0 right-0 w-20 h-20 z-30 cursor-pointer"
              onMouseEnter={() => setIsHoveringCorner(true)}
              onMouseLeave={() => setIsHoveringCorner(false)}
              onClick={(e) => {
                e.stopPropagation();
                triggerCornerCurlTransition(currentPage + 1);
              }}
              title="Hacer clic para pasar página con efecto Page Curl 3D"
            />
          )}

          {currentPage > 1 && (
            <div
              className="absolute bottom-0 left-0 w-20 h-20 z-30 cursor-pointer"
              onMouseEnter={() => {
                setPeelCorner('bottom-left');
                setIsHoveringCorner(true);
              }}
              onMouseLeave={() => setIsHoveringCorner(false)}
              onClick={(e) => {
                e.stopPropagation();
                triggerCornerCurlTransition(currentPage - 1);
              }}
              title="Hacer clic para volver a la página anterior"
            />
          )}

          {/* Loading spinner overlay */}
          {isRendering && (
            <div className="absolute inset-0 bg-[#0a0e16]/50 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-40 transition-opacity">
              <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-[#111827]/95 border border-[#334155]/80 text-xs font-['JetBrains_Mono'] text-[#f59e0b] shadow-[0_12px_32px_rgba(0,0,0,0.85)] text-center animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
                  <span className="font-semibold">Cargando libro...</span>
                </div>
                <span className="text-[11px] text-[#94a3b8]">
                  Página {currentPage} de {pdfDoc?.numPages || 1}
                </span>
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
