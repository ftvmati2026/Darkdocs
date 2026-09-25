import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Search,
  Trash2,
  FileText,
  Clock,
  ArrowRight,
  FilterX
} from 'lucide-react';
import { StoredPdfRecord } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: StoredPdfRecord[];
  activeRecordId: string | null;
  onSelectRecord: (record: StoredPdfRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  records,
  activeRecordId,
  onSelectRecord,
  onDeleteRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

  const formatFileSize = (bytes: number): string => {
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

  // Filter records based on search query and date criteria
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return records.filter((rec) => {
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
  }, [records, searchQuery, dateFilterMode, selectedDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full sm:max-w-md h-full bg-[#111827] border-l border-[#334155]/80 shadow-2xl flex flex-col text-[#dfe2ee]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="h-16 px-5 border-b border-[#1f2937] flex items-center justify-between shrink-0 bg-[#0f131c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1c2028] border border-[#334155] flex items-center justify-center text-[#f59e0b]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-base font-semibold text-[#dfe2ee]">
                Biblioteca e Historial
              </h3>
              <p className="text-[11px] text-[#94a3b8] font-['JetBrains_Mono']">
                {records.length} {records.length === 1 ? 'documento guardado' : 'documentos guardados'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1c2028] text-[#94a3b8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Area */}
        <div className="p-4 border-b border-[#1f2937] bg-[#181c24]/50 space-y-3 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-[#0f131c] text-xs text-[#dfe2ee] placeholder-[#64748b] rounded-md border border-[#334155]/60 focus:border-[#4cd7f6] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-['JetBrains_Mono']">
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
              Últimos 7 días
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

          {/* Date Picker Input */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (e.target.value) setDateFilterMode('custom');
                }}
                className="w-full h-8 pl-8 pr-2 bg-[#0f131c] text-xs text-[#dfe2ee] rounded-md border border-[#334155]/60 focus:border-[#4cd7f6] outline-none font-['JetBrains_Mono']"
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setDateFilterMode('all');
                }}
                className="h-8 px-2 flex items-center gap-1 rounded bg-[#1c2028] text-[#94a3b8] hover:text-[#ffdad6] text-xs border border-[#1f2937]"
                title="Limpiar fecha"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span className="hidden xs:inline text-[10px]">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#1f2937] rounded-xl text-[#94a3b8]">
              <FileText className="w-8 h-8 text-[#64748b] mb-2" />
              <p className="text-xs font-medium text-[#dfe2ee]">No se encontraron documentos</p>
              <p className="text-[11px] text-[#64748b] mt-1">
                {records.length === 0
                  ? 'Los PDFs que subas se guardarán automáticamente aquí en IndexedDB.'
                  : 'Prueba a cambiar el filtro de fecha o el término de búsqueda.'}
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const isActive = record.id === activeRecordId;
              return (
                <div
                  key={record.id}
                  onClick={() => {
                    onSelectRecord(record);
                    onClose();
                  }}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-[#1c2028] border-[#f59e0b] shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                      : 'bg-[#181c24]/90 border-[#1f2937] hover:border-[#334155] hover:bg-[#1c2028]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                            : 'bg-[#0f131c] text-[#4cd7f6]'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-[#dfe2ee] truncate group-hover:text-white" title={record.name}>
                        {record.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(record.id)}
                        className="w-7 h-7 flex items-center justify-center rounded text-[#64748b] hover:text-[#ffb4ab] hover:bg-[#93000a]/20 transition-colors"
                        title="Eliminar de la biblioteca local"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#94a3b8] font-['JetBrains_Mono'] pt-1 border-t border-[#1f2937]/60">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#64748b]" />
                      <span>{formatDate(record.uploadDate)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[#94a3b8]">
                      <span>{record.totalPages} pág{record.totalPages > 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{formatFileSize(record.size)}</span>
                      {isActive ? (
                        <span className="text-[#f59e0b] font-semibold text-[10px] ml-1 bg-[#f59e0b]/10 px-1.5 py-0.2 rounded">
                          Leyendo
                        </span>
                      ) : (
                        <ArrowRight className="w-3 h-3 text-[#4cd7f6] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
