
import { ProductionLog, ProductionError, RankingEntry, Collaborator, CollaboratorType } from '../types';

export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const calculateWorkedMinutes = (log: ProductionLog): number => {
  const total = timeToMinutes(log.clockOut) - timeToMinutes(log.clockIn);
  const totalBreakTime = log.breaks.reduce((acc, interval) => {
    return acc + (timeToMinutes(interval.end) - timeToMinutes(interval.start));
  }, 0);
  return Math.max(0, total - totalBreakTime);
};

export const ERROR_PENALTY = 50;

export const generateRankings = (
  collaborators: Collaborator[],
  logs: ProductionLog[],
  errors: ProductionError[]
): RankingEntry[] => {
  const results: Record<string, {
    totalPackages: number;
    totalMinutes: number;
    totalErrors: number;
  }> = {};

  // Initialize
  collaborators.forEach(c => {
    results[c.id] = { totalPackages: 0, totalMinutes: 0, totalErrors: 0 };
  });

  // Aggregate Logs
  logs.forEach(log => {
    if (results[log.collaboratorId]) {
      results[log.collaboratorId].totalPackages += log.packages;
      results[log.collaboratorId].totalMinutes += calculateWorkedMinutes(log);
    }
  });

  // Aggregate Errors
  errors.forEach(err => {
    if (results[err.collaboratorId]) {
      results[err.collaboratorId].totalErrors += err.quantity;
    }
  });

  return collaborators.map(c => {
    const data = results[c.id] || { totalPackages: 0, totalMinutes: 0, totalErrors: 0 };
    const netPackages = Math.max(0, data.totalPackages - (data.totalErrors * ERROR_PENALTY));
    
    // Minuto por pacote: tempo total / pacotes líquidos
    // Se não produziu nada, o tempo é considerado "Infinito" para o ranking
    const mpk = netPackages > 0 ? data.totalMinutes / netPackages : Infinity;

    return {
      collaboratorId: c.id,
      name: c.name,
      type: c.type,
      totalPackages: data.totalPackages,
      netPackages,
      totalErrors: data.totalErrors,
      totalMinutes: data.totalMinutes,
      minutesPerPackage: mpk
    };
  }).sort((a, b) => {
    // No ranking de "tempo por peça", o MENOR valor é o MELHOR
    if (a.minutesPerPackage === b.minutesPerPackage) return 0;
    return a.minutesPerPackage - b.minutesPerPackage;
  });
};
