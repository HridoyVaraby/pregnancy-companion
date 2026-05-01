import { useMemo } from 'react';
import Fuse from 'fuse.js';
import symptomsData from '../data/symptoms.json';

export type SymptomSeverity = 'low' | 'medium' | 'high';

export interface Symptom {
  id: string;
  name: string;
  keywords: string[];
  severity: SymptomSeverity;
  is_normal: boolean;
  advice: string;
}

const symptoms = symptomsData as Symptom[];

export function useSymptomMatch() {
  const fuse = useMemo(
    () =>
      new Fuse(symptoms, {
        keys: ['name', 'keywords'],
        threshold: 0.4, // Adjust for fuzzy matching sensitivity
        includeScore: true,
      }),
    []
  );

  const findMatch = (query: string): Symptom | null => {
    if (!query.trim()) return null;
    const results = fuse.search(query);
    if (results.length > 0) {
      return results[0].item;
    }
    return null;
  };

  return { findMatch };
}
