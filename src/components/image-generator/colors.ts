export type TextColorChoice = 'auto' | string;

export interface TextColorOption {
  id: TextColorChoice;
  label: string;
  /** null = herda da skin */
  color: string | null;
}

export const TEXT_COLOR_OPTIONS: TextColorOption[] = [
  { id: 'auto', label: 'Auto', color: null },
  { id: '#FFFFFF', label: 'Branco', color: '#FFFFFF' },
  { id: '#0A0A0A', label: 'Preto', color: '#0A0A0A' },
  { id: '#FBBF24', label: 'Âmbar', color: '#FBBF24' },
  { id: '#FB7185', label: 'Rosa', color: '#FB7185' },
  { id: '#C084FC', label: 'Roxo', color: '#C084FC' },
  { id: '#22D3EE', label: 'Ciano', color: '#22D3EE' },
  { id: '#34D399', label: 'Verde', color: '#34D399' },
  { id: '#60A5FA', label: 'Azul', color: '#60A5FA' },
  { id: '#FEF3C7', label: 'Creme', color: '#FEF3C7' },
  { id: '#F97316', label: 'Laranja', color: '#F97316' },
  { id: '#E879F9', label: 'Magenta', color: '#E879F9' },
];

export const DEFAULT_TEXT_COLOR: TextColorChoice = 'auto';

export function resolveTextColor(choice: TextColorChoice): string | null {
  if (choice === 'auto') return null;
  return choice;
}
