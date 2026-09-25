import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Home,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Sliders,
  Maximize,
} from 'lucide-react';
import { VisualSettings } from '../types';

interface FullscreenHudProps {
  isVisible: boolean;
  currentPage: number;
  totalPages: number;
  zoom: number;
  isDarkMode: boolean;
  visualSettings: VisualSettings;
  fileName: string | null;
  onPageChange: (newPage: number) => void;
  onNavigateHome: () => void;
  onToggleFullscreen: () => void;
  onToggleDarkMode: () => void;
  onFitWidth: () => void;
  onOpenThemeModal: () => void;
  onToggleSound: () => void;
}

export const FullscreenHud: React.FC<FullscreenHudProps> = ({
  isVisible,
  currentPage,
  totalPages,
  zoom,
  isDarkMode,
  visualSettings,
  fileName,
  onPageChange,
  onNavigateHome,
  onToggleFullscreen,
  onToggleDarkMode,
  onFitWidth,
  onOpenThemeModal,
  onToggleSound,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHoveredOrActive, setIsHoveredOrActive] = useState(true);

  // Auto-dim button after 4 seconds of inactivity if menu is not open
  useEffect(() => {
    if (isOpen) {
      setIsHoveredOrActive(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsHoveredOrActive(false);
    }, 4000);

    const handleActivity = () => {
      setIsHoveredOrActive(true);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Corner Trigger Button */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[100] pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111827]/95 backdrop-blur-md border border-[#334155] text-[#dfe2ee] shadow-[0_8px_24px_rgba(0,0,0,0.85)] hover:border-[#f59e0b] active:scale-95 transition-all duration-300 ${
            isHoveredOrActive || isOpen
              ? 'opacity-100 scale-100'
              : 'opacity-50 hover:opacity-100 scale-95'
          }`}
          title="Menú de lectura en pantalla completa"
        >
          {isOpen ? (
            <X className="w-4 h-4 text-[#f59e0b]" />
          ) : (
            <Menu className="w-4 h-4 text-[#f59e0b]" />
          )}
          <span className="font-['JetBrains_Mono'] text-xs font-medium">
            {isOpen ? 'Cerrar' : 'Menú'}
          </span>
        </button>
      </div>

      {/* Modal / Flyout HUD Panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/65 backdrop-blur-xs flex items-start justify-end p-3 sm:p-5 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xs mt-12 bg-[#111827] border border-[#334155] rounded-2xl shadow-2xl p-4 space-y-3.5 text-[#dfe2ee]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#f59e0b] uppercase font-semibold">
                  Modo Inmersivo Zen
                </span>
                <span className="text-xs font-semibold truncate text-[#dfe2ee]" title={fileName || ''}>
                  {fileName || 'Documento PDF'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#1c2028] text-[11px] font-['JetBrains_Mono'] text-[#4cd7f6] shrink-0 font-medium">
                Pág. {currentPage}/{totalPages}
              </span>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              {/* Navigate to Home */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateHome();
                }}
                className="p-2.5 rounded-xl bg-[#1c2028] hover:bg-[#262a33] border border-[#1f2937] hover:border-[#f59e0b] flex items-center gap-2 transition-colors text-left"
              >
                <Home className="w-4 h-4 text-[#f59e0b] shrink-0" />
                <span>Inicio</span>
              </button>

              {/* Exit Fullscreen */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onToggleFullscreen();
                }}
                className="p-2.5 rounded-xl bg-[#1c2028] hover:bg-[#262a33] border border-[#1f2937] hover:border-[#4cd7f6] flex items-center gap-2 transition-colors text-left"
              >
                <Minimize2 className="w-4 h-4 text-[#4cd7f6] shrink-0" />
                <span>Salir Zen</span>
              </button>
            </div>

            {/* Pagination stepper */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0f131c] border border-[#1f2937]">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="p-1.5 rounded-lg hover:bg-[#1c2028] text-[#94a3b8] hover:text-[#dfe2ee] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-['JetBrains_Mono'] text-xs font-semibold text-[#f59e0b]">
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="p-1.5 rounded-lg hover:bg-[#1c2028] text-[#94a3b8] hover:text-[#dfe2ee] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Reading mode toggles */}
            <div className="space-y-1.5 text-xs">
              {/* Dark mode invert */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="w-full p-2 rounded-lg bg-[#181c24] hover:bg-[#1c2028] border border-[#1f2937] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isDarkMode ? <Moon className="w-4 h-4 text-[#4cd7f6]" /> : <Sun className="w-4 h-4 text-[#f59e0b]" />}
                  <span>{isDarkMode ? 'Modo Oscuro Invertido' : 'Modo Original'}</span>
                </div>
                <span className="text-[11px] font-['JetBrains_Mono'] text-[#94a3b8]">
                  {isDarkMode ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Sound effect toggle */}
              <button
                type="button"
                onClick={onToggleSound}
                className="w-full p-2 rounded-lg bg-[#181c24] hover:bg-[#1c2028] border border-[#1f2937] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  {visualSettings.isSoundEnabled !== false ? (
                    <Volume2 className="w-4 h-4 text-[#56e5a9]" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-[#94a3b8]" />
                  )}
                  <span>Sonido de Página</span>
                </div>
                <span className="text-[11px] font-['JetBrains_Mono'] text-[#94a3b8]">
                  {visualSettings.isSoundEnabled !== false ? 'Activo' : 'Mute'}
                </span>
              </button>

              {/* Auto fit width */}
              <button
                type="button"
                onClick={() => {
                  onFitWidth();
                  setIsOpen(false);
                }}
                className="w-full p-2 rounded-lg bg-[#181c24] hover:bg-[#1c2028] border border-[#1f2937] flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Maximize className="w-4 h-4 text-[#f59e0b]" />
                  <span>Ajustar ancho 100%</span>
                </div>
                <span className="text-[11px] font-['JetBrains_Mono'] text-[#4cd7f6]">
                  {Math.round(zoom * 100)}%
                </span>
              </button>

              {/* Visual calibration */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenThemeModal();
                }}
                className="w-full p-2 rounded-lg bg-[#181c24] hover:bg-[#1c2028] border border-[#1f2937] flex items-center gap-2 transition-colors text-[#dfe2ee]"
              >
                <Sliders className="w-4 h-4 text-[#f59e0b]" />
                <span>Calibración de Fondo y Texto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
