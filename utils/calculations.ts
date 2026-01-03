
import { ProductionLog, ProductionError, RankingEntry, Collaborator, ErrorType } from '../types';

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

export const PENALTIES: Record<ErrorType, number> = {
  [ErrorType.ERRO_PACOTE]: 50,
  [ErrorType.FALTA]: 10
};

export const generateRankings = (
  collaborators: Collaborator[],
  logs: ProductionLog[],
  errors: ProductionError[]
): RankingEntry[] => {
  const results: Record<string, {
    totalPackages: number;
    totalMinutes: number;
    totalPenalty: number;
    totalErrorCount: number;
  }> = {};

  // Initialize
  collaborators.forEach(c => {
    results[c.id] = { totalPackages: 0, totalMinutes: 0, totalPenalty: 0, totalErrorCount: 0 };
  });

  // Aggregate Logs
  logs.forEach(log => {
    if (results[log.collaboratorId]) {
      results[log.collaboratorId].totalPackages += log.packages;
      results[log.collaboratorId].totalMinutes += calculateWorkedMinutes(log);
    }
  });

  // Aggregate Errors with specific penalties
  errors.forEach(err => {
    if (results[err.collaboratorId]) {
      const penaltyValue = PENALTIES[err.type] || 0;
      results[err.collaboratorId].totalPenalty += (err.quantity * penaltyValue);
      results[err.collaboratorId].totalErrorCount += err.quantity;
    }
  });

  return collaborators.map(c => {
    const data = results[c.id] || { totalPackages: 0, totalMinutes: 0, totalPenalty: 0, totalErrorCount: 0 };
    const netPackages = Math.max(0, data.totalPackages - data.totalPenalty);
    
    // Minuto por pacote: tempo total / pacotes líquidos
    const mpk = netPackages > 0 ? data.totalMinutes / netPackages : Infinity;

    return {
      collaboratorId: c.id,
      name: c.name,
      type: c.type,
      totalPackages: data.totalPackages,
      netPackages,
      totalErrors: data.totalErrorCount,
      totalMinutes: data.totalMinutes,
      minutesPerPackage: mpk
    };
  }).sort((a, b) => {
    if (a.minutesPerPackage === b.minutesPerPackage) return 0;
    return a.minutesPerPackage - b.minutesPerPackage;
  });
};
