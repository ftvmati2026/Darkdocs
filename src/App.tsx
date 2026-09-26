/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from './utils/pdfSetup';
import { generateSamplePdfArrayBuffer } from './utils/samplePdf';
import {
  savePdfToDb,
  getAllPdfsFromDb,
  getPdfRecordFromDb,
  deletePdfFromDb,
  arrayBufferToBase64,
} from './utils/db';
import { StoredPdfRecord, VisualSettings } from './types';
import { Header } from './components/Header';
import { PdfViewer } from './components/PdfViewer';
import { FloatingHud } from './components/FloatingHud';
import { HomeScreen } from './components/HomeScreen';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ThemeModal, defaultVisualSettings } from './components/ThemeModal';
import { FullscreenHud } from './components/FullscreenHud';
import { playPageFlipSound } from './utils/audio';

const VISUAL_SETTINGS_KEY = 'darkdocs_visual_settings';
const LAST_ACTIVE_ID_KEY = 'darkdocs_last_active_id';

export default function App() {
  const [viewMode, setViewMode] = useState<'home' | 'viewer'>('home');
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number;
    percent: number;
    message?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stored PDF records from IndexedDB
  const [storedRecords, setStoredRecords] = useState<StoredPdfRecord[]>([]);

  // Modals & Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // Visual settings state (saved to localStorage)
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(() => {
    try {
      const saved = localStorage.getItem(VISUAL_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return defaultVisualSettings;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Persist visual settings
  const handleSettingsChange = (newSettings: VisualSettings) => {
    setVisualSettings(newSettings);
    try {
      localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  // Fullscreen event listener with webkit prefix support
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as unknown as { fullscreenElement?: Element; webkitFullscreenElement?: Element };
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Quick sound toggle handler
  const handleToggleSound = useCallback(() => {
    setVisualSettings((prev) => {
      const isCurrentlyEnabled = prev.isSoundEnabled !== false;
      const nextEnabled = !isCurrentlyEnabled;
      if (nextEnabled) {
        playPageFlipSound(false);
      }
      const updated = { ...prev, isSoundEnabled: nextEnabled };
      try {
        localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Fetch stored PDFs list from IndexedDB
  const refreshStoredRecords = useCallback(async () => {
    try {
      const records = await getAllPdfsFromDb();
      setStoredRecords(records);
      return records;
    } catch (err) {
      console.error('Error fetching records from IndexedDB:', err);
      return [];
    }
  }, []);

  /**
   * Calculate zoom scale to fit page in viewport (100% responsive for portrait and landscape)
   */
  const fitWidth = useCallback(
    async (activeDoc = pdfDoc) => {
      if (!activeDoc) return;
      try {
        const page = await activeDoc.getPage(currentPage);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        const containerWidth =
          containerRef.current?.clientWidth || window.innerWidth;
        const containerHeight =
          containerRef.current?.clientHeight || window.innerHeight;

        const isLandscape =
          window.innerWidth > window.innerHeight && window.innerHeight < 650;
        const isMobilePortrait = window.innerWidth < 640;

        const marginX = isLandscape ? 16 : isMobilePortrait ? 10 : 44;
        const availableWidth = Math.max(220, containerWidth - marginX);

        const scaleX = availableWidth / unscaledViewport.width;

        // In landscape orientation, also ensure the height doesn't overflow the viewport
        if (isLandscape) {
          const headerAndHudOffset = window.innerHeight < 450 ? 56 : 84;
          const availableHeight = Math.max(
            180,
            containerHeight - headerAndHudOffset
          );
          const scaleY = availableHeight / unscaledViewport.height;
          const combinedScale = Math.min(scaleX, scaleY);
          const newScale = Math.min(2.5, Math.max(0.35, combinedScale));
          setZoom(Number(newScale.toFixed(2)));
        } else {
          const newScale = Math.min(2.5, Math.max(0.35, scaleX));
          setZoom(Number(newScale.toFixed(2)));
        }
      } catch (err) {
        console.error('Fit width error:', err);
      }
    },
    [pdfDoc, currentPage]
  );

  /**
   * Load ArrayBuffer directly into pdfjs-dist with Lazy Loading and Progressive Feedback
   */
  const loadPdfFromArrayBuffer = useCallback(
    async (arrayBuffer: ArrayBuffer, name: string, recordId?: string) => {
      try {
        setIsLoading(true);
        setLoadingProgress({ loaded: 0, total: arrayBuffer.byteLength, percent: 12, message: 'Cargando libro...' });
        setErrorMessage(null);

        // Always clone the buffer for pdfjs to avoid detaching our storage copy
        const bufferForPdfJs = arrayBuffer.slice(0);

        // Lazy loading configuration: disableAutoFetch ensures pdf.js doesn't parse all pages upfront
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(bufferForPdfJs),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/',
          cMapPacked: true,
          disableAutoFetch: true, // Only fetch page streams on demand!
          disableStream: false,
          rangeChunkSize: 65536,
        });

        // Real-time progress feedback while reading document structure
        loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (total > 0) {
            const pct = Math.min(95, Math.max(12, Math.round((loaded / total) * 100)));
            setLoadingProgress({
              loaded,
              total,
              percent: pct,
              message: `Cargando libro... ${pct}%`,
            });
          } else {
            setLoadingProgress((prev) => ({
              loaded,
              total: 0,
              percent: prev ? Math.min(90, prev.percent + 15) : 35,
              message: 'Cargando libro...',
            }));
          }
        };

        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setFileName(name);
        if (recordId) {
          setActiveRecordId(recordId);
          try {
            localStorage.setItem(LAST_ACTIVE_ID_KEY, recordId);
          } catch {
            // ignore
          }
        }
        setCurrentPage(1);
        setTotalPages(doc.numPages);

        // Switch immediately to viewer mode so page 1 renders without delay
        setViewMode('viewer');
        setIsLoading(false);
        setLoadingProgress(null);

        // Auto calculate fit-width
        setTimeout(() => {
          fitWidth(doc);
        }, 50);

        return doc;
      } catch (err: unknown) {
        console.error('Error loading PDF with pdfjs-dist:', err);
        setErrorMessage(
          'No se pudo procesar el archivo PDF. Asegúrate de que sea un archivo PDF válido y sin clave.'
        );
        setIsLoading(false);
        setLoadingProgress(null);
        return null;
      }
    },
    [fitWidth]
  );

  // Initialize IndexedDB on mount and read all stored files
  useEffect(() => {
    (async () => {
      const records = await refreshStoredRecords();
      // If there was an active document previously, we can have it ready
      const lastId = localStorage.getItem(LAST_ACTIVE_ID_KEY);
      if (lastId && records.length > 0) {
        const lastRecord = await getPdfRecordFromDb(lastId);
        if (lastRecord && lastRecord.arrayBuffer) {
          // Pre-load with lazy loading
          const bufferCopy = lastRecord.arrayBuffer.slice(0);
          try {
            const loadingTask = pdfjsLib.getDocument({
              data: new Uint8Array(bufferCopy),
              cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/',
              cMapPacked: true,
              disableAutoFetch: true,
              disableStream: false,
            });
            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setFileName(lastRecord.name);
            setActiveRecordId(lastRecord.id);
            setTotalPages(doc.numPages);
            setCurrentPage(1);
          } catch {
            // ignore pre-load errors
          }
        }
      }
    })();
  }, [refreshStoredRecords]);

  /**
   * Real PDF File Loader via FileReader and background IndexedDB Persistence
   */
  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file) return;

      if (file.type && file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Por favor, selecciona un archivo en formato .pdf válido.');
        return;
      }

      setIsLoading(true);
      setLoadingProgress({ loaded: 0, total: file.size, percent: 10, message: 'Cargando libro...' });
      setErrorMessage(null);

      const reader = new FileReader();

      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          setErrorMessage('No se pudo leer el contenido del archivo.');
          setIsLoading(false);
          setLoadingProgress(null);
          return;
        }

        const id = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // 1. Immediately start PDF lazy loading and render page 1 without waiting for DB writes
        const doc = await loadPdfFromArrayBuffer(buffer.slice(0), file.name, id);

        // 2. Persist to IndexedDB asynchronously in the background so the main thread never freezes
        setTimeout(async () => {
          try {
            const record: StoredPdfRecord = {
              id,
              name: file.name,
              size: file.size,
              uploadDate: new Date().toISOString(),
              totalPages: doc ? doc.numPages : 1,
              arrayBuffer: buffer.slice(0),
            };
            await savePdfToDb(record);
            await refreshStoredRecords();
          } catch (dbErr) {
            console.warn('Background save to IndexedDB failed:', dbErr);
          }
        }, 80);
      };

      reader.onerror = () => {
        setErrorMessage('Error al leer el archivo desde el dispositivo.');
        setIsLoading(false);
        setLoadingProgress(null);
      };

      reader.readAsArrayBuffer(file);
    },
    [loadPdfFromArrayBuffer, refreshStoredRecords]
  );

  /**
   * Load Sample PDF for instant demonstration and save to IndexedDB
   */
  const handleLoadSample = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const sampleBuffer = generateSamplePdfArrayBuffer();
      const id = 'sample_bft_paper_2025';
      const name = 'BFT-2025-v4.2-Tolerancia-Fallos-Bizantinos.pdf';

      let dataBase64 = '';
      try {
        dataBase64 = arrayBufferToBase64(sampleBuffer);
      } catch {
        // ignore
      }

      // Save to IndexedDB immediately
      const record: StoredPdfRecord = {
        id,
        name,
        size: sampleBuffer.byteLength,
        uploadDate: new Date().toISOString(),
        totalPages: 3,
        arrayBuffer: sampleBuffer.slice(0),
        dataBase64: dataBase64 || undefined,
      };
      await savePdfToDb(record);
      await refreshStoredRecords();

      // Load into PDF viewer
      await loadPdfFromArrayBuffer(sampleBuffer.slice(0), name, id);
    } catch (err) {
      console.error('Error loading sample PDF:', err);
      setErrorMessage('Error al generar el PDF de muestra.');
      setIsLoading(false);
    }
  }, [loadPdfFromArrayBuffer, refreshStoredRecords]);

  /**
   * Load document directly from IndexedDB when clicked in History or Home
   */
  const handleSelectRecordFromHistory = useCallback(
    async (record: StoredPdfRecord) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        // If arrayBuffer is present and not detached, use it
        if (record.arrayBuffer && record.arrayBuffer.byteLength > 0) {
          await loadPdfFromArrayBuffer(record.arrayBuffer.slice(0), record.name, record.id);
        } else {
          // Fetch fresh copy from IndexedDB
          const fullRecord = await getPdfRecordFromDb(record.id);
          if (fullRecord && fullRecord.arrayBuffer && fullRecord.arrayBuffer.byteLength > 0) {
            await loadPdfFromArrayBuffer(fullRecord.arrayBuffer.slice(0), fullRecord.name, fullRecord.id);
          } else {
            throw new Error('No se encontró el contenido del PDF en IndexedDB.');
          }
        }
      } catch (err) {
        console.error('Error opening stored record:', err);
        setErrorMessage('No se pudo cargar el archivo guardado en el historial.');
        setIsLoading(false);
      }
    },
    [loadPdfFromArrayBuffer]
  );

  /**
   * Delete document from IndexedDB
   */
  const handleDeleteRecord = useCallback(
    async (id: string) => {
      try {
        await deletePdfFromDb(id);
        await refreshStoredRecords();
        if (activeRecordId === id) {
          setActiveRecordId(null);
          localStorage.removeItem(LAST_ACTIVE_ID_KEY);
        }
      } catch (err) {
        console.error('Error deleting record:', err);
      }
    },
    [activeRecordId, refreshStoredRecords]
  );

  const handleToggleFullscreen = () => {
    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => void;
    };
    const docEl = document.documentElement as unknown as {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => void;
    };

    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);

    if (!isFs) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err) => {
          console.warn('Native fullscreen request rejected:', err);
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen error:', err);
        });
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e16] text-[#dfe2ee] flex flex-col font-['Geist',sans-serif]">
      {/* Top Application Header with Darkdocs branding and Home navigation */}
      <Header
        fileName={fileName}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        isDarkMode={isDarkMode}
        isFullscreen={isFullscreen}
        isSoundEnabled={visualSettings.isSoundEnabled !== false}
        storedCount={storedRecords.length}
        viewMode={viewMode}
        onNavigateHome={() => setViewMode('home')}
        onContinueReading={() => setViewMode('viewer')}
        onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
        onZoomChange={(newZoom) => setZoom(Number(newZoom.toFixed(2)))}
        onFitWidth={() => fitWidth()}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSound={handleToggleSound}
        onFileUpload={handleFileUpload}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full pt-12 sm:pt-14 relative flex flex-col">
        {viewMode === 'home' || !pdfDoc ? (
          <HomeScreen
            activeFileName={fileName}
            activeCurrentPage={currentPage}
            activeTotalPages={totalPages}
            hasActiveDoc={!!pdfDoc}
            onContinueReading={() => setViewMode('viewer')}
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            storedRecords={storedRecords}
            activeRecordId={activeRecordId}
            onSelectRecord={handleSelectRecordFromHistory}
            onDeleteRecord={handleDeleteRecord}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : (
          <>
            <PdfViewer
              pdfDoc={pdfDoc}
              currentPage={currentPage}
              zoom={zoom}
              isDarkMode={isDarkMode}
              visualSettings={visualSettings}
              onPageCount={setTotalPages}
              onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
              containerRef={containerRef}
              onAutoFit={() => fitWidth()}
            />

            {/* Floating Reader Deck (HUD) */}
            <FloatingHud
              currentPage={currentPage}
              totalPages={totalPages}
              zoom={zoom}
              isDarkMode={isDarkMode}
              isSoundEnabled={visualSettings.isSoundEnabled !== false}
              onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
              onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
              onToggleSound={handleToggleSound}
            />

            {/* Discreet Floating Fullscreen Control HUD (available in fullscreen and mobile landscape) */}
            <FullscreenHud
              isVisible={
                isFullscreen ||
                (typeof window !== 'undefined' &&
                  window.innerHeight < 520 &&
                  window.innerWidth > window.innerHeight)
              }
              currentPage={currentPage}
              totalPages={totalPages}
              zoom={zoom}
              isDarkMode={isDarkMode}
              visualSettings={visualSettings}
              fileName={fileName}
              onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
              onNavigateHome={() => setViewMode('home')}
              onToggleFullscreen={handleToggleFullscreen}
              onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
              onFitWidth={() => fitWidth()}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
              onToggleSound={handleToggleSound}
            />
          </>
        )}
      </main>

      {/* Prominent Progressive Loading Overlay (Loader para libros pesados) */}
      {isLoading && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm rounded-3xl bg-[#111827] border border-[#334155]/90 p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-14 h-14 rounded-full border-4 border-[#334155] border-t-[#f59e0b] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[#f59e0b]/40 animate-pulse" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold font-['Space_Grotesk'] text-[#dfe2ee] tracking-tight">
              Cargando libro...
            </h3>
            <p className="text-xs text-[#94a3b8] mt-1 line-clamp-1 max-w-[280px]">
              {fileName || 'Leyendo estructura general del PDF...'}
            </p>

            {/* Animated Progress Bar */}
            <div className="w-full bg-[#1e293b] rounded-full h-2 overflow-hidden mt-4 mb-2">
              <div
                className="bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#4cd7f6] h-full transition-all duration-300 rounded-full"
                style={{ width: `${loadingProgress?.percent || 35}%` }}
              />
            </div>

            <div className="w-full flex justify-between items-center text-[11px] font-['JetBrains_Mono'] text-[#94a3b8]">
              <span>Progreso</span>
              <span className="text-[#f59e0b] font-medium">
                {loadingProgress?.percent || 35}%
              </span>
            </div>

            <span className="text-[10px] text-[#64748b] mt-3 tracking-wide">
              Renderizado bajo demanda activo: la primera página se mostrará de inmediato.
            </span>
          </div>
        </div>
      )}

      {/* History & Library Drawer (accessible from header button anytime) */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={storedRecords}
        activeRecordId={activeRecordId}
        onSelectRecord={handleSelectRecordFromHistory}
        onDeleteRecord={handleDeleteRecord}
      />

      {/* Visual Calibration Modal (Background, Text Tint & Contrast Sliders) */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        settings={visualSettings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}
