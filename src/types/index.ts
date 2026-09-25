export interface StoredPdfRecord {
  id: string;
  name: string;
  size: number;
  uploadDate: string; // ISO string
  totalPages: number;
  arrayBuffer?: ArrayBuffer;
  dataBase64?: string;
}

export type BackgroundPreset = 'black' | 'sepia' | 'gray';
export type TextColorPreset = 'white' | 'sepia' | 'amber' | 'green';

export interface VisualSettings {
  backgroundPreset: BackgroundPreset;
  backgroundIntensity: number; // 0.6 to 1.0 (brightness / opacity)
  textColorPreset: TextColorPreset;
  textContrast: number; // 0.7 to 1.3
}
