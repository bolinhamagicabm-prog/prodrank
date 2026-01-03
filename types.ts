
export enum CollaboratorType {
  CLT = 'CLT',
  ESTAGIARIO = 'ESTAGIÁRIO'
}

export interface Collaborator {
  id: string;
  name: string;
  type: CollaboratorType;
}

export interface Interval {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface ProductionLog {
  id: string;
  collaboratorId: string;
  date: string; // ISO Date YYYY-MM-DD
  packages: number;
  clockIn: string; // HH:mm
  clockOut: string; // HH:mm
  breaks: Interval[];
}

export interface ProductionError {
  id: string;
  collaboratorId: string;
  date: string;
  quantity: number;
}

export interface RankingEntry {
  collaboratorId: string;
  name: string;
  type: CollaboratorType;
  totalPackages: number;
  netPackages: number;
  totalErrors: number;
  totalMinutes: number;
  minutesPerPackage: number;
}

export interface MonthlyRanking {
  month: string; // YYYY-MM
  rankings: RankingEntry[];
}
