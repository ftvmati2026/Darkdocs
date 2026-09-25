import React from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface FloatingHudProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  isDarkMode: boolean;
  onPageChange: (page: number) => void;
  onToggleDarkMode: () => void;
}

export const FloatingHud: React.FC<FloatingHudProps> = ({
  currentPage,
  totalPages,
  zoom,
  isDarkMode,
  onPageChange,
  onToggleDarkMode,
}) => {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <aside
      aria-label="Estado de lectura"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] pointer-events-auto"
    >
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#111827]/90 backdrop-blur-md border border-[#334155]/60 shadow-[0_8px_32px_rgba(0,0,0,0.7)] text-[#dfe2ee]">
        {/* Live status dot & page count */}
        <div className="flex items-center gap-2 select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f59e0b]" />
          </span>
          <span className="font-['JetBrains_Mono'] text-xs text-[#dfe2ee] font-medium whitespace-nowrap">
            Página {currentPage} de {totalPages}
          </span>
        </div>

        <span className="w-1 h-3 bg-[#31353e] rounded-full hidden xs:inline-block" />

        {/* Zoom badge */}
        <span className="font-['JetBrains_Mono'] text-xs text-[#4cd7f6] bg-[#4cd7f6]/10 px-2 py-0.5 rounded font-mono hidden xs:inline-block">
          {zoomPercent}%
        </span>

        <span className="w-1 h-3 bg-[#31353e] rounded-full" />

        {/* Inverted / Dark Mode indicator */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer text-xs"
          title="Alternar modo invertido"
        >
          <Eye className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#56e5a9]' : 'text-[#94a3b8]'}`} />
          <span
            className={`font-['JetBrains_Mono'] text-xs font-medium hidden sm:inline-block ${
              isDarkMode ? 'text-[#56e5a9]' : 'text-[#94a3b8]'
            }`}
          >
            {isDarkMode ? 'Modo Invertido Activo' : 'Modo Original'}
          </span>
        </button>

        <span className="w-1 h-3 bg-[#31353e] rounded-full hidden md:inline-block" />

        {/* Key shortcut helper */}
        <div className="hidden md:flex items-center gap-1 text-[#94a3b8] font-['JetBrains_Mono'] text-xs select-none">
          <span>Usa</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#262a33] text-[#dfe2ee] text-[11px] border border-[#334155]/60 font-mono">
            ←
          </kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[#262a33] text-[#dfe2ee] text-[11px] border border-[#334155]/60 font-mono">
            →
          </kbd>
          <span className="text-[#94a3b8]/80 text-[11px]">o scroll</span>
        </div>

        {/* Quick page jumper stepper */}
        <div className="flex items-center ml-1 border-l border-[#31353e] pl-2 gap-0.5">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#262a33] text-[#94a3b8] hover:text-[#f59e0b] disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#262a33] text-[#94a3b8] hover:text-[#f59e0b] disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
