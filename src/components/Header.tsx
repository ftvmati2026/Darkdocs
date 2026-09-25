import React, { useState } from 'react';
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  FileText,
  Menu,
  X,
  BookOpen,
  Sliders,
  BookMarked,
  ArrowRight,
  Home
} from 'lucide-react';

interface HeaderProps {
  fileName: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  isDarkMode: boolean;
  isFullscreen: boolean;
  storedCount: number;
  viewMode: 'home' | 'viewer';
  onNavigateHome: () => void;
  onContinueReading: () => void;
  onPageChange: (page: number) => void;
  onZoomChange: (newZoom: number) => void;
  onFitWidth: () => void;
  onToggleDarkMode: () => void;
  onToggleFullscreen: () => void;
  onFileUpload: (file: File) => void;
  onOpenHistory: () => void;
  onOpenThemeModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  currentPage,
  totalPages,
  zoom,
  isDarkMode,
  isFullscreen,
  storedCount,
  viewMode,
  onNavigateHome,
  onContinueReading,
  onPageChange,
  onZoomChange,
  onFitWidth,
  onToggleDarkMode,
  onToggleFullscreen,
  onFileUpload,
  onOpenHistory,
  onOpenThemeModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageInput, setPageInput] = useState(currentPage.toString());

  React.useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      onFileUpload(file);
      setMobileMenuOpen(false);
    }
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0e16]/95 backdrop-blur-xl border-b border-[#1f2937]/70 shadow-[0_1px_12px_rgba(0,0,0,0.6)]">
        <div className="h-14 w-full px-3 sm:px-6 flex items-center justify-between gap-2">
          {/* Left: Brand Logo that navigates to Home Screen */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2 select-none group text-left cursor-pointer focus:outline-none"
              title="Ir a la Pantalla de Inicio / Biblioteca (Darkdocs)"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1c2028] border border-[#334155] flex items-center justify-center text-[#f59e0b] shadow-inner group-hover:border-[#f59e0b] transition-all">
                <BookMarked className="w-4 h-4 text-[#f59e0b] group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex flex-col">
                <span className="font-['Space_Grotesk'] text-base sm:text-lg font-bold tracking-tight text-[#dfe2ee] leading-none">
                  Dark<span className="text-[#f59e0b]">docs</span>
                </span>
                <span className="text-[9px] text-[#94a3b8] font-['JetBrains_Mono'] tracking-wider uppercase opacity-75">
                  Lector PDF
                </span>
              </div>
            </button>

            {/* If in Home view and there is an active doc, show "Volver al lector" shortcut */}
            {viewMode === 'home' && fileName && (
              <button
                type="button"
                onClick={onContinueReading}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181c24] hover:bg-[#1c2028] text-[#4cd7f6] border border-[#4cd7f6]/40 text-xs font-['JetBrains_Mono'] transition-all shadow"
                title="Volver al documento que estás leyendo"
              >
                <span>Volver al lector</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Desktop: Subir PDF Button */}
            <label className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] hover:text-white border border-[#334155]/60 transition-colors cursor-pointer text-xs font-medium tracking-wide">
              <Upload className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Subir PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>

            {/* Biblioteca / Historial Trigger Button */}
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181c24] hover:bg-[#262a33] text-[#dfe2ee] border border-[#1f2937] hover:border-[#334155] text-xs font-['JetBrains_Mono'] transition-colors"
              title="Biblioteca de PDFs guardados en IndexedDB"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#4cd7f6]" />
              <span className="hidden md:inline">Historial</span>
              {storedCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#4cd7f6]/20 text-[#4cd7f6] font-semibold">
                  {storedCount}
                </span>
              )}
            </button>

            {/* In viewer mode: show active document name */}
            {viewMode === 'viewer' && fileName && (
              <div
                className="hidden xl:flex items-center gap-1.5 text-xs text-[#94a3b8] max-w-[170px] truncate"
                title={fileName}
              >
                <FileText className="w-3.5 h-3.5 shrink-0 text-[#f59e0b]" />
                <span className="truncate">{fileName}</span>
              </div>
            )}
          </div>

          {/* Center (Desktop / Tablet in Viewer mode): Pagination & Zoom Controls */}
          {viewMode === 'viewer' && totalPages > 0 && (
            <div className="hidden lg:flex items-center gap-3">
              {/* Pagination Controls */}
              <div className="flex items-center gap-1 bg-[#181c24] px-1 py-0.5 rounded-md border border-[#1f2937]">
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#262a33] text-[#94a3b8] hover:text-[#dfe2ee] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 px-1">
                  <span className="text-xs text-[#94a3b8] font-['JetBrains_Mono']">Pág.</span>
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageInputSubmit}
                    className="w-9 h-6 bg-[#1c2028] text-center font-['JetBrains_Mono'] text-xs font-semibold text-[#f59e0b] rounded outline-none border border-[#334155]/50 focus:border-[#4cd7f6]"
                  />
                  <span className="text-xs text-[#94a3b8] font-['JetBrains_Mono']">
                    de {totalPages}
                  </span>
                </form>

                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#262a33] text-[#94a3b8] hover:text-[#dfe2ee] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#181c24] px-1.5 py-0.5 rounded-md border border-[#1f2937]">
                <button
                  type="button"
                  onClick={() => onZoomChange(Math.max(0.4, zoom - 0.15))}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#262a33] text-[#94a3b8] hover:text-[#dfe2ee] transition-colors"
                  title="Reducir zoom"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="px-2 font-['JetBrains_Mono'] text-xs text-[#dfe2ee] min-w-[3.5rem] text-center select-none">
                  {zoomPercent}%
                </span>

                <button
                  type="button"
                  onClick={() => onZoomChange(Math.min(3.0, zoom + 0.15))}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#262a33] text-[#94a3b8] hover:text-[#dfe2ee] transition-colors"
                  title="Aumentar zoom"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-[#334155]/50 mx-1" />

                <button
                  type="button"
                  onClick={onFitWidth}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#262a33] text-[#94a3b8] hover:text-[#dfe2ee] text-xs font-['JetBrains_Mono'] transition-colors"
                  title="Ajustar al ancho"
                >
                  <span>Ajustar ancho</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Pagination for Mobile / Tablet in topbar (Viewer mode only) */}
          {viewMode === 'viewer' && totalPages > 0 && (
            <div className="flex lg:hidden items-center gap-0.5 bg-[#181c24] px-1 py-0.5 rounded-md border border-[#1f2937]">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="w-7 h-7 flex items-center justify-center rounded text-[#94a3b8] disabled:opacity-20"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-['JetBrains_Mono'] text-[#f59e0b] px-1 font-semibold">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded text-[#94a3b8] disabled:opacity-20"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Right: Desktop Actions & Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* If in viewer mode, button to go to Home */}
            {viewMode === 'viewer' && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181c24] hover:bg-[#262a33] text-[#94a3b8] hover:text-[#dfe2ee] border border-[#1f2937] text-xs font-medium transition-colors"
                title="Ir a Inicio"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Inicio</span>
              </button>
            )}

            {/* Calibración Visual Button */}
            <button
              type="button"
              onClick={onOpenThemeModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1c2028] hover:bg-[#262a33] text-[#dfe2ee] border border-[#334155]/60 text-xs font-medium transition-colors"
              title="Ajustar color de fondo, intensidad y tono de texto"
            >
              <Sliders className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="hidden md:inline">Calibración</span>
            </button>

            {/* Dark Mode Invert Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all text-xs font-medium ${
                isDarkMode
                  ? 'bg-[#1c2028] border-[#4cd7f6]/40 text-[#4cd7f6] hover:bg-[#262a33]'
                  : 'bg-[#1c2028] border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#262a33]'
              }`}
              title={isDarkMode ? 'Modo Oscuro Invertido Activado' : 'Modo Original'}
            >
              {isDarkMode ? (
                <>
                  <Moon className="w-3.5 h-3.5 fill-[#4cd7f6]/20" />
                  <span className="hidden md:inline">Modo Oscuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Original</span>
                </>
              )}
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="hidden sm:flex w-8 h-8 items-center justify-center rounded-md bg-[#1c2028] border border-[#1f2937] hover:bg-[#262a33] text-[#94a3b8] hover:text-[#dfe2ee] transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex lg:hidden w-8 h-8 items-center justify-center rounded-md bg-[#1c2028] border border-[#334155]/80 text-[#dfe2ee] hover:bg-[#262a33] transition-colors"
              title="Abrir menú de controles"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Collapsible Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden flex flex-col pt-14 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border-b border-[#334155]/80 shadow-2xl p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Navigation links for Home / Viewer */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onNavigateHome();
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 text-xs font-semibold ${
                  viewMode === 'home'
                    ? 'bg-[#1c2028] border-[#f59e0b] text-[#f59e0b]'
                    : 'bg-[#181c24] border-[#1f2937] text-[#dfe2ee]'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Inicio</span>
              </button>

              {fileName && (
                <button
                  type="button"
                  onClick={() => {
                    onContinueReading();
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 text-xs font-semibold ${
                    viewMode === 'viewer'
                      ? 'bg-[#1c2028] border-[#4cd7f6] text-[#4cd7f6]'
                      : 'bg-[#181c24] border-[#1f2937] text-[#dfe2ee]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Documento</span>
                </button>
              )}
            </div>

            {/* Document Name if loaded */}
            {fileName && (
              <div className="p-2.5 rounded-lg bg-[#0f131c] border border-[#1f2937] flex items-center gap-2 text-xs text-[#dfe2ee]">
                <FileText className="w-4 h-4 text-[#f59e0b] shrink-0" />
                <span className="truncate font-medium">{fileName}</span>
              </div>
            )}

            {/* Upload PDF action */}
            <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0f131c] font-semibold text-xs font-['JetBrains_Mono'] tracking-wide cursor-pointer transition-colors shadow">
              <Upload className="w-4 h-4" />
              <span>Subir nuevo archivo PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>

            {/* Zoom & Fit-Width Controls (if in viewer mode) */}
            {viewMode === 'viewer' && totalPages > 0 && (
              <div className="p-3 rounded-lg bg-[#181c24] border border-[#1f2937] space-y-2">
                <span className="text-xs font-medium text-[#94a3b8] font-['JetBrains_Mono'] block">
                  Controles de Zoom ({zoomPercent}%)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onZoomChange(Math.max(0.4, zoom - 0.15))}
                    className="flex-1 py-1.5 rounded bg-[#1c2028] border border-[#334155] text-center text-[#dfe2ee] text-xs font-['JetBrains_Mono'] hover:bg-[#262a33]"
                  >
                    - Reducir
                  </button>
                  <button
                    type="button"
                    onClick={() => onZoomChange(Math.min(3.0, zoom + 0.15))}
                    className="flex-1 py-1.5 rounded bg-[#1c2028] border border-[#334155] text-center text-[#dfe2ee] text-xs font-['JetBrains_Mono'] hover:bg-[#262a33]"
                  >
                    + Aumentar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onFitWidth();
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-1.5 rounded bg-[#1c2028] border border-[#f59e0b]/50 text-center text-[#f59e0b] text-xs font-['JetBrains_Mono'] hover:bg-[#262a33]"
                  >
                    Ajustar ancho
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenThemeModal();
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-lg bg-[#181c24] border border-[#1f2937] hover:border-[#334155] flex flex-col items-center justify-center gap-1.5 text-xs text-[#dfe2ee]"
              >
                <Sliders className="w-4 h-4 text-[#f59e0b]" />
                <span className="font-medium">Calibración Visual</span>
                <span className="text-[10px] text-[#94a3b8]">Fondo y Texto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleDarkMode();
                }}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 text-xs ${
                  isDarkMode
                    ? 'bg-[#181c24] border-[#4cd7f6]/50 text-[#4cd7f6]'
                    : 'bg-[#181c24] border-[#f59e0b]/50 text-[#f59e0b]'
                }`}
              >
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="font-medium">{isDarkMode ? 'Modo Oscuro' : 'Modo Original'}</span>
                <span className="text-[10px] text-[#94a3b8]">{isDarkMode ? 'Inversión Activa' : 'Normal'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenHistory();
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg bg-[#181c24] border border-[#1f2937] hover:border-[#334155] flex items-center justify-center gap-2 text-xs text-[#dfe2ee]"
              >
                <BookOpen className="w-4 h-4 text-[#4cd7f6]" />
                <span>Biblioteca ({storedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleFullscreen();
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg bg-[#181c24] border border-[#1f2937] hover:border-[#334155] flex items-center justify-center gap-2 text-xs text-[#dfe2ee]"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span>{isFullscreen ? 'Salir Zen' : 'Pantalla Zen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
