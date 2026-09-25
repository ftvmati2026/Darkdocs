import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  BookOpen,
  ArrowRight,
  Clock,
  Trash2,
  Search,
  Calendar,
  FileText,
  Sparkles,
  ChevronRight,
  BookMarked,
  Layers,
  FilterX
} from 'lucide-react';
import { StoredPdfRecord } from '../types';
import { Footer } from './Footer';

interface HomeScreenProps {
  activeFileName: string | null;
  activeCurrentPage: number;
  activeTotalPages: number;
  hasActiveDoc: boolean;
  onContinueReading: () => void;
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  storedRecords: StoredPdfRecord[];
  activeRecordId: string | null;
  onSelectRecord: (record: StoredPdfRecord) => void;
  onDeleteRecord: (id: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  activeFileName,
  activeCurrentPage,
  activeTotalPages,
  hasActiveDoc,
  onContinueReading,
  onFileUpload,
  onLoadSample,
  storedRecords,
  activeRecordId,
  onSelectRecord,
  onDeleteRecord,
  isLoading,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      onFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Filter stored records
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return storedRecords.filter((rec) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!rec.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 2. Date Filtering
      const recDate = new Date(rec.uploadDate);
      const recDateStr = recDate.toISOString().split('T')[0];

      if (dateFilterMode === 'today') {
        return recDateStr === todayStr;
      }

      if (dateFilterMode === 'week') {
        const diffDays = (now.getTime() - recDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }

      if (dateFilterMode === 'month') {
        const diffDays = (now.getTime() - recDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }

      if (dateFilterMode === 'custom' && selectedDate) {
        return recDateStr === selectedDate;
      }

      return true;
    });
  }, [storedRecords, searchQuery, dateFilterMode, selectedDate]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-8 selection:bg-[#f59e0b] selection:text-[#0f131c]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Hero Branding Section */}
      <div className="relative flex flex-col items-center text-center pt-2 sm:pt-4">
        {/* Ambient atmospheric glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[500px] h-[220px] bg-gradient-to-b from-[#f59e0b]/15 via-[#4cd7f6]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        {/* Brand Icon Emblem */}
        <div className="relative z-10 mb-3 sm:mb-4 flex items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#1c2028] to-[#0f131c] border border-[#334155] shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center justify-center relative group">
            <div className="absolute inset-0 rounded-2xl bg-[#f59e0b]/10 blur-md group-hover:bg-[#f59e0b]/20 transition-all" />
            <BookMarked className="w-8 h-8 sm:w-10 sm:h-10 text-[#f59e0b] relative z-10 transition-transform group-hover:scale-105" />
          </div>
        </div>

        <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight text-[#dfe2ee]">
          Dark<span className="text-[#f59e0b]">docs</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#94a3b8] max-w-lg leading-relaxed">
          Lector de documentos PDF de alto rendimiento con inversión cromática real para sesiones de lectura prolongadas y sin fatiga ocular.
        </p>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mt-4 px-4 py-2.5 rounded-lg bg-[#93000a]/40 border border-[#ffb4ab]/50 text-[#ffdad6] text-xs max-w-lg">
            {errorMessage}
          </div>
        )}

        {/* Global Loading Indicator */}
        {isLoading && (
          <div className="mt-4 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#181c24] border border-[#334155] text-xs font-['JetBrains_Mono'] text-[#f59e0b]">
            <div className="w-3.5 h-3.5 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
            <span>Cargando documento en el visor...</span>
          </div>
        )}
      </div>

      {/* Main Action Deck: Cargar Nuevo PDF & Continuar Leyendo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Botón Principal: Cargar Nuevo PDF */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
            hasActiveDoc ? 'md:col-span-7' : 'md:col-span-12'
          } ${
            isDragOver
              ? 'bg-[#1c2028] border-[#f59e0b] shadow-[0_0_25px_rgba(245,158,11,0.25)] scale-[1.01]'
              : 'bg-gradient-to-br from-[#181c24] to-[#111827] border-[#334155]/70 hover:border-[#f59e0b]/70 hover:bg-[#1c2028]'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#f59e0b] font-semibold uppercase tracking-wider block">
                Acción Principal
              </span>
              <h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#dfe2ee]">
                Cargar Nuevo PDF
              </h2>
              <p className="text-xs text-[#94a3b8] max-w-md">
                Arrastra tu archivo aquí o haz clic para abrirlo desde tu equipo. Se procesa de forma segura en tu navegador y se guarda en tu biblioteca.
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-[#0f131c] border border-[#334155] flex items-center justify-center shrink-0 text-[#f59e0b] shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0f131c] font-semibold text-xs font-['JetBrains_Mono'] tracking-wide flex items-center gap-2 shadow-md transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Seleccionar archivo PDF</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="px-3.5 py-2 rounded-lg bg-[#1c2028] hover:bg-[#262a33] text-[#4cd7f6] hover:text-[#acedff] border border-[#4cd7f6]/40 text-xs font-['JetBrains_Mono'] transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4cd7f6]" />
              <span>Cargar PDF de muestra</span>
            </button>
          </div>
        </div>

        {/* Botón Secundario Destacado: Continuar Leyendo PDF Actual */}
        {hasActiveDoc && (
          <div
            onClick={onContinueReading}
            className="md:col-span-5 cursor-pointer rounded-2xl border border-[#4cd7f6]/40 bg-gradient-to-br from-[#111827] to-[#0f131c] hover:border-[#4cd7f6] hover:bg-[#181c24] p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 group shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#4cd7f6] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4cd7f6] animate-pulse" />
                  Lectura en Progreso
                </span>
                <span className="text-[10px] font-['JetBrains_Mono'] px-2 py-0.5 rounded bg-[#4cd7f6]/10 text-[#4cd7f6]">
                  Abierto
                </span>
              </div>

              <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#dfe2ee] group-hover:text-white transition-colors truncate" title={activeFileName || ''}>
                {activeFileName || 'Documento sin título'}
              </h2>

              <p className="text-xs text-[#94a3b8] font-['JetBrains_Mono'] flex items-center gap-2">
                <span>Página {activeCurrentPage} de {activeTotalPages}</span>
                <span>•</span>
                <span className="text-[#56e5a9]">Modo Oscuro Activo</span>
              </p>
            </div>

            <div className="pt-5">
              <div className="w-full py-2.5 px-4 rounded-lg bg-[#1c2028] group-hover:bg-[#4cd7f6] group-hover:text-[#003640] text-[#dfe2ee] font-semibold text-xs font-['JetBrains_Mono'] flex items-center justify-between transition-all border border-[#334155]/60 group-hover:border-[#4cd7f6]">
                <span>Continuar leyendo PDF actual</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección Biblioteca / Historial de Archivos Recientes */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1f2937]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1c2028] border border-[#334155] flex items-center justify-center text-[#f59e0b]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#dfe2ee]">
                Archivos Recientes e Historial
              </h2>
              <p className="text-[11px] text-[#94a3b8] font-['JetBrains_Mono']">
                Guardados localmente en tu navegador con IndexedDB ({storedRecords.length})
              </p>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-['JetBrains_Mono']">
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('all');
                setSelectedDate('');
              }}
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                dateFilterMode === 'all'
                  ? 'bg-[#1c2028] border-[#f59e0b] text-[#f59e0b]'
                  : 'bg-[#0f131c] border-[#1f2937] text-[#94a3b8] hover:border-[#334155]'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('today');
                setSelectedDate('');
              }}
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                dateFilterMode === 'today'
                  ? 'bg-[#1c2028] border-[#f59e0b] text-[#f59e0b]'
                  : 'bg-[#0f131c] border-[#1f2937] text-[#94a3b8] hover:border-[#334155]'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('week');
                setSelectedDate('');
              }}
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                dateFilterMode === 'week'
                  ? 'bg-[#1c2028] border-[#f59e0b] text-[#f59e0b]'
                  : 'bg-[#0f131c] border-[#1f2937] text-[#94a3b8] hover:border-[#334155]'
              }`}
            >
              7 días
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('month');
                setSelectedDate('');
              }}
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                dateFilterMode === 'month'
                  ? 'bg-[#1c2028] border-[#f59e0b] text-[#f59e0b]'
                  : 'bg-[#0f131c] border-[#1f2937] text-[#94a3b8] hover:border-[#334155]'
              }`}
            >
              Este mes
            </button>
          </div>
        </div>

        {/* Search & Date Picker Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Buscar por nombre de archivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-[#111827] text-xs text-[#dfe2ee] placeholder-[#64748b] rounded-lg border border-[#334155]/60 focus:border-[#4cd7f6] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (e.target.value) setDateFilterMode('custom');
                }}
                className="w-full h-9 pl-9 pr-3 bg-[#111827] text-xs text-[#dfe2ee] rounded-lg border border-[#334155]/60 focus:border-[#4cd7f6] outline-none font-['JetBrains_Mono']"
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setDateFilterMode('all');
                }}
                className="h-9 px-2.5 rounded-lg bg-[#181c24] text-[#94a3b8] hover:text-[#ffdad6] text-xs border border-[#1f2937] flex items-center gap-1"
                title="Limpiar fecha"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* History Grid of Stored PDFs */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 px-6 rounded-2xl bg-[#111827]/40 border border-dashed border-[#1f2937] text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#181c24] border border-[#334155] flex items-center justify-center text-[#64748b] mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-['Space_Grotesk'] text-base font-semibold text-[#dfe2ee]">
              {storedRecords.length === 0 ? 'No hay PDFs en el historial todavía' : 'Sin coincidencias con los filtros'}
            </h3>
            <p className="text-xs text-[#94a3b8] max-w-sm mt-1 mb-4">
              {storedRecords.length === 0
                ? 'Todos los archivos que cargues en Darkdocs se guardarán automáticamente en tu navegador para lectura offline instantánea.'
                : 'Intenta limpiar el término de búsqueda o el filtro de fecha.'}
            </p>
            {storedRecords.length === 0 && (
              <button
                type="button"
                onClick={onLoadSample}
                className="px-4 py-2 rounded-lg bg-[#1c2028] hover:bg-[#262a33] border border-[#f59e0b]/40 text-[#f59e0b] text-xs font-['JetBrains_Mono'] flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar documento de demostración</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecords.map((record) => {
              const isActive = record.id === activeRecordId;
              return (
                <div
                  key={record.id}
                  onClick={() => onSelectRecord(record)}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isActive
                      ? 'bg-[#181c24] border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-[#111827] border-[#1f2937] hover:border-[#334155] hover:bg-[#181c24]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                            : 'bg-[#0f131c] text-[#4cd7f6]'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span
                          className="text-xs font-semibold text-[#dfe2ee] group-hover:text-white truncate block"
                          title={record.name}
                        >
                          {record.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] font-['JetBrains_Mono']">
                          <span>{record.totalPages} pág{record.totalPages > 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{formatFileSize(record.size)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRecord(record.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#64748b] hover:text-[#ffb4ab] hover:bg-[#93000a]/20 transition-colors shrink-0"
                      title="Eliminar de la biblioteca local"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1f2937]/70 text-[10px] text-[#94a3b8] font-['JetBrains_Mono']">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#64748b]" />
                      <span>{formatDate(record.uploadDate)}</span>
                    </div>

                    {isActive ? (
                      <span className="text-[#f59e0b] font-semibold bg-[#f59e0b]/10 px-2 py-0.5 rounded">
                        Documento Activo
                      </span>
                    ) : (
                      <span className="text-[#4cd7f6] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        <span>Leer</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pie de página con créditos y contacto */}
      <Footer />
    </div>
  );
};
