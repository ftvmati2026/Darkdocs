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

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
   * Calculate zoom scale to fit page width in viewport
   */
  const fitWidth = useCallback(
    async (activeDoc = pdfDoc) => {
      if (!activeDoc) return;
      try {
        const page = await activeDoc.getPage(currentPage);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        const containerWidth =
          containerRef.current?.clientWidth || window.innerWidth;
        const marginOffset = window.innerWidth < 640 ? 24 : 64;
        const availableWidth = Math.max(260, containerWidth - marginOffset);

        const newScale = Math.min(2.5, Math.max(0.4, availableWidth / unscaledViewport.width));
        setZoom(Number(newScale.toFixed(2)));
      } catch (err) {
        console.error('Fit width error:', err);
      }
    },
    [pdfDoc, currentPage]
  );

  /**
   * Load ArrayBuffer directly into pdfjs-dist and switch to viewer mode
   */
  const loadPdfFromArrayBuffer = useCallback(
    async (arrayBuffer: ArrayBuffer, name: string, recordId?: string) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Always clone the buffer for pdfjs to avoid detaching our storage copy
        const bufferForPdfJs = arrayBuffer.slice(0);

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(bufferForPdfJs),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/',
          cMapPacked: true,
        });

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
        setIsLoading(false);

        // Switch immediately to viewer mode
        setViewMode('viewer');

        // Auto calculate fit-width
        setTimeout(() => {
          fitWidth(doc);
        }, 60);

        return doc;
      } catch (err: unknown) {
        console.error('Error loading PDF with pdfjs-dist:', err);
        setErrorMessage(
          'No se pudo procesar el archivo PDF. Asegúrate de que sea un archivo PDF válido y sin clave.'
        );
        setIsLoading(false);
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
          // Pre-load but keep on Home view until user clicks "Continuar leyendo" or chooses to
          const bufferCopy = lastRecord.arrayBuffer.slice(0);
          try {
            const loadingTask = pdfjsLib.getDocument({
              data: new Uint8Array(bufferCopy),
              cMapUrl: 'https://unpkg.com/pdfjs-dist@legacy/cmaps/',
              cMapPacked: true,
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
   * Real PDF File Loader via FileReader and immediate IndexedDB Persistence
   * Guaranteed: Saves before/during rendering and refreshes history instantly.
   */
  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file) return;

      if (file.type && file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Por favor, selecciona un archivo en formato .pdf válido.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const reader = new FileReader();

      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          setErrorMessage('No se pudo leer el contenido del archivo.');
          setIsLoading(false);
          return;
        }

        const id = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Generate base64 backup safely
        let dataBase64 = '';
        try {
          dataBase64 = arrayBufferToBase64(buffer);
        } catch (b64Err) {
          console.warn('Base64 conversion failed:', b64Err);
        }

        // 1. First, save to IndexedDB immediately with cloned buffer
        try {
          const record: StoredPdfRecord = {
            id,
            name: file.name,
            size: file.size,
            uploadDate: new Date().toISOString(),
            totalPages: 1, // updated once doc is loaded
            arrayBuffer: buffer.slice(0),
            dataBase64: dataBase64 || undefined,
          };
          await savePdfToDb(record);
          await refreshStoredRecords();
        } catch (dbErr) {
          console.error('Error saving to IndexedDB:', dbErr);
        }

        // 2. Load into PDF viewer
        const doc = await loadPdfFromArrayBuffer(buffer.slice(0), file.name, id);

        if (doc) {
          // Update totalPages in IndexedDB
          try {
            const updatedRecord: StoredPdfRecord = {
              id,
              name: file.name,
              size: file.size,
              uploadDate: new Date().toISOString(),
              totalPages: doc.numPages,
              arrayBuffer: buffer.slice(0),
              dataBase64: dataBase64 || undefined,
            };
            await savePdfToDb(updatedRecord);
            await refreshStoredRecords();
          } catch {
            // ignore
          }
        }
      };

      reader.onerror = () => {
        setErrorMessage('Error al leer el archivo desde el dispositivo.');
        setIsLoading(false);
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
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error('Error exiting fullscreen:', err);
        });
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
        storedCount={storedRecords.length}
        viewMode={viewMode}
        onNavigateHome={() => setViewMode('home')}
        onContinueReading={() => setViewMode('viewer')}
        onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
        onZoomChange={(newZoom) => setZoom(Number(newZoom.toFixed(2)))}
        onFitWidth={() => fitWidth()}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onToggleFullscreen={handleToggleFullscreen}
        onFileUpload={handleFileUpload}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full pt-14 relative flex flex-col">
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
              onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(totalPages, page)))}
              onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
            />
          </>
        )}
      </main>

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
