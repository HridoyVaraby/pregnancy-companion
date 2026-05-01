import Dexie, { type EntityTable } from 'dexie';

export interface SymptomLog {
  id?: number;
  query: string;
  timestamp: Date;
  matchId?: string;
  matchName?: string;
  severity?: 'low' | 'medium' | 'high';
  advice?: string;
  isAiEnriched: boolean;
}

const db = new Dexie('PregnancyCompanionDB') as Dexie & {
  logs: EntityTable<
    SymptomLog,
    'id' // primary key "id" (for the typings only)
  >;
};

// Schema declaration
db.version(1).stores({
  logs: '++id, query, timestamp, severity, isAiEnriched' // Primary key and indexed props
});

export { db };
