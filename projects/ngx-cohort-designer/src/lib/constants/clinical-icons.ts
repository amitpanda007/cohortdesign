import { IconOption } from '../models/cohort-designer.model';

export const CLINICAL_ICONS: IconOption[] = [
  {
    id: 'clock',
    name: 'Delay / Time',
    viewBox: '0 0 24 24',
    svgPath: `
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
      <polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    `
  },
  {
    id: 'calendar',
    name: 'Minimal Days / Interval',
    viewBox: '0 0 24 24',
    svgPath: `
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
    `
  },
  {
    id: 'shield',
    name: 'Safety / DLT Gate',
    viewBox: '0 0 24 24',
    svgPath: `
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `
  },
  {
    id: 'scale',
    name: 'Randomization',
    viewBox: '0 0 24 24',
    svgPath: `
      <path d="M12 3v18M3 7l4 8M17 15l4-8M3 7h8M13 7h8M7 15a4 4 0 0 0-8 0h8zm14 0a4 4 0 0 0-8 0h8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `
  },
  {
    id: 'beaker',
    name: 'Biomarker / Assay',
    viewBox: '0 0 24 24',
    svgPath: `
      <path d="M4.5 3h15M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M6 14h12M10 3v5M14 3v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `
  },
  {
    id: 'check-circle',
    name: 'Clearance Gate',
    viewBox: '0 0 24 24',
    svgPath: `
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="22 4 12 14.01 9 11.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `
  },
  {
    id: 'diamond',
    name: 'Decision Gate',
    viewBox: '0 0 24 24',
    svgPath: `
      <polygon points="12 2 22 12 12 22 2 12 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `
  },
  {
    id: 'git-branch',
    name: 'Split / Crossover',
    viewBox: '0 0 24 24',
    svgPath: `
      <line x1="6" y1="3" x2="6" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="18" cy="6" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M18 9a9 9 0 0 1-9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    `
  }
];
