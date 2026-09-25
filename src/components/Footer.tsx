import React from 'react';
import { Phone, Mail, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto border-t border-[#1f2937]/80 bg-[#0a0e16]/90 backdrop-blur-md py-6 px-4 text-center">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-3">
        {/* Creator attribution */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="font-['Space_Grotesk'] text-xs sm:text-sm font-semibold tracking-tight text-[#dfe2ee]">
            Diseñado y Desarrollado en su totalidad por{' '}
            <span className="text-[#f59e0b] font-bold">Matías Gómez</span>
          </span>
        </div>

        {/* Contact links */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-['JetBrains_Mono'] text-[#94a3b8]">
          <a
            href="tel:+5492612404479"
            className="inline-flex items-center gap-1.5 hover:text-[#4cd7f6] transition-colors group"
            title="Llamar o enviar mensaje"
          >
            <Phone className="w-3.5 h-3.5 text-[#4cd7f6] group-hover:scale-110 transition-transform" />
            <span>+54 9 2612404479</span>
          </a>

          <span className="hidden sm:inline text-[#334155]">•</span>

          <a
            href="mailto:ftvmati2022@gmail.com"
            className="inline-flex items-center gap-1.5 hover:text-[#f59e0b] transition-colors group"
            title="Enviar correo electrónico"
          >
            <Mail className="w-3.5 h-3.5 text-[#f59e0b] group-hover:scale-110 transition-transform" />
            <span>ftvmati2022@gmail.com</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
