import React from 'react';
import { X, Sliders, RotateCcw, Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { VisualSettings, BackgroundPreset, TextColorPreset } from '../types';
import { playPageFlipSound } from '../utils/audio';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VisualSettings;
  onSettingsChange: (newSettings: VisualSettings) => void;
}

export const defaultVisualSettings: VisualSettings = {
  backgroundPreset: 'black',
  backgroundIntensity: 0.95,
  textColorPreset: 'white',
  textContrast: 1.05,
  isSoundEnabled: true,
};

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  if (!isOpen) return null;

  const bgOptions: { id: BackgroundPreset; label: string; color: string; desc: string }[] = [
    {
      id: 'black',
      label: 'Negro Puro',
      color: '#000000',
      desc: 'Máximo contraste OLED',
    },
    {
      id: 'sepia',
      label: 'Sepia Cálido',
      color: '#1c1712',
      desc: 'Tono ámbar para noche',
    },
    {
      id: 'gray',
      label: 'Gris Oscuro',
      color: '#1e1e1e',
      desc: 'Gris suave balanceado',
    },
  ];

  const textOptions: { id: TextColorPreset; label: string; color: string; sample: string }[] = [
    { id: 'white', label: 'Blanco', color: '#f8fafc', sample: 'Aa' },
    { id: 'sepia', label: 'Sepia Suave', color: '#f5e6d3', sample: 'Aa' },
    { id: 'amber', label: 'Ámbar Cálido', color: '#ffc174', sample: 'Aa' },
    { id: 'green', label: 'Verde Suave', color: '#56e5a9', sample: 'Aa' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#111827] border border-[#334155]/80 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 text-[#dfe2ee] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1f2937]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1c2028] border border-[#334155] flex items-center justify-center text-[#f59e0b]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Space_Grotesk'] text-base font-semibold text-[#dfe2ee] tracking-tight">
                Calibración Visual
              </h3>
              <p className="text-[11px] text-[#94a3b8] font-['JetBrains_Mono']">
                Ajuste fino de fondo, texto y descanso ocular
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

        {/* Modal Body */}
        <div className="py-4 space-y-5 text-xs">
          {/* 1. Color de Fondo del Visor */}
          <div>
            <label className="block font-medium text-[#dfe2ee] mb-2 font-['JetBrains_Mono'] flex items-center justify-between">
              <span>Color de Fondo</span>
              <span className="text-[11px] text-[#94a3b8]">
                {bgOptions.find((o) => o.id === settings.backgroundPreset)?.label}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {bgOptions.map((opt) => {
                const isSelected = settings.backgroundPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onSettingsChange({ ...settings, backgroundPreset: opt.id })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#f59e0b] bg-[#1c2028] shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'border-[#1f2937] hover:border-[#334155] bg-[#0f131c]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div
                        className="w-5 h-5 rounded-md border border-[#334155]"
                        style={{ backgroundColor: opt.color }}
                      />
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#f59e0b]" />}
                    </div>
                    <div className="font-semibold text-[11px] text-[#dfe2ee] truncate">
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-[#94a3b8] truncate">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Slider Intensidad / Brillo del Fondo */}
          <div>
            <div className="flex items-center justify-between mb-1.5 font-['JetBrains_Mono']">
              <span className="text-[#dfe2ee]">Intensidad / Brillo del Fondo</span>
              <span className="text-[#f59e0b] font-mono">
                {Math.round(settings.backgroundIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.15"
              step="0.05"
              value={settings.backgroundIntensity}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  backgroundIntensity: parseFloat(e.target.value),
                })
              }
              className="w-full h-1.5 bg-[#1f2937] rounded-lg appearance-none cursor-pointer accent-[#f59e0b]"
            />
            <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1 font-mono">
              <span>Más oscuro (50%)</span>
              <span>Predeterminado</span>
              <span>Más brillo (115%)</span>
            </div>
          </div>

          {/* 3. Color del Texto */}
          <div>
            <label className="block font-medium text-[#dfe2ee] mb-2 font-['JetBrains_Mono'] flex items-center justify-between">
              <span>Tono del Texto / Contraste</span>
              <span className="text-[11px] text-[#94a3b8]">
                {textOptions.find((o) => o.id === settings.textColorPreset)?.label}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {textOptions.map((opt) => {
                const isSelected = settings.textColorPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onSettingsChange({ ...settings, textColorPreset: opt.id })
                    }
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'border-[#4cd7f6] bg-[#1c2028] shadow-[0_0_12px_rgba(76,215,246,0.25)]'
                        : 'border-[#1f2937] hover:border-[#334155] bg-[#0f131c]'
                    }`}
                  >
                    <span
                      className="font-bold text-base leading-none"
                      style={{ color: opt.color }}
                    >
                      {opt.sample}
                    </span>
                    <span className="text-[10px] text-[#94a3b8] leading-tight truncate max-w-full">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Slider de Intensidad de Texto / Contraste */}
          <div>
            <div className="flex items-center justify-between mb-1.5 font-['JetBrains_Mono']">
              <span className="text-[#dfe2ee]">Contraste de Texto</span>
              <span className="text-[#4cd7f6] font-mono">
                {Math.round(settings.textContrast * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.35"
              step="0.05"
              value={settings.textContrast}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  textContrast: parseFloat(e.target.value),
                })
              }
              className="w-full h-1.5 bg-[#1f2937] rounded-lg appearance-none cursor-pointer accent-[#4cd7f6]"
            />
            <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1 font-mono">
              <span>Atenuado (75%)</span>
              <span>100%</span>
              <span>Alto contraste (135%)</span>
            </div>
          </div>

          {/* 5. Efecto de Sonido al Pasar Página */}
          <div className="p-3 rounded-xl bg-[#0f131c] border border-[#1f2937] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                settings.isSoundEnabled !== false
                  ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                  : 'bg-[#1c2028] text-[#94a3b8]'
              }`}>
                {settings.isSoundEnabled !== false ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-['Space_Grotesk'] text-xs font-semibold text-[#dfe2ee] block">
                  Sonido de Hoja de Papel
                </span>
                <span className="text-[10px] text-[#94a3b8] font-['JetBrains_Mono']">
                  Efecto acústico sutil al pasar cada página
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const newState = settings.isSoundEnabled === false;
                onSettingsChange({ ...settings, isSoundEnabled: newState });
                if (newState) {
                  playPageFlipSound(false);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-['JetBrains_Mono'] font-medium transition-colors border ${
                settings.isSoundEnabled !== false
                  ? 'bg-[#1c2028] border-[#f59e0b] text-[#f59e0b]'
                  : 'bg-[#1c2028] border-[#334155] text-[#94a3b8]'
              }`}
            >
              {settings.isSoundEnabled !== false ? 'Activado' : 'Silenciado'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#1f2937] flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSettingsChange(defaultVisualSettings)}
            className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] hover:text-[#dfe2ee] transition-colors font-['JetBrains_Mono']"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0f131c] font-semibold text-xs font-['JetBrains_Mono'] transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
