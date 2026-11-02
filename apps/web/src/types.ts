export interface User { id: number; username: string; name: string; role: 'ADMIN' | 'FARMER' }
export interface Herb {
  id: number; name: string; scientificName: string; family: string; part: string;
  region: string; description: string; growthDays: number; tempMin: number; tempMax: number;
  moistureMin: number; moistureMax: number; _count?: { batches: number };
}
export interface Plot { id: number; name: string; location: string; area: number; soil: string; manager: string; batches?: Batch[] }
export interface Batch {
  id: number; code: string; herbId: number; plotId: number; herb: Herb; plot: Plot;
  plantedAt: string; expectedAt: string; quantity: number; notes: string;
  status: 'GROWING' | 'HARVESTED'; harvest?: Harvest | null;
}
export interface FarmTask {
  id: number; title: string; kind: string; batchId: number; batch: Batch; assigneeId: number;
  assignee: User; dueAt: string; status: 'TODO' | 'DONE'; notes: string; result: string; completedAt: string | null;
}
export interface Reading {
  id: number; plotId: number; temperature: number; humidity: number; moisture: number;
  light: number; simulated: boolean; recordedAt: string;
}
export interface MonitorPlot extends Plot { readings: Reading[]; batches: Batch[] }
export interface FarmAlert {
  id: number; batch: Batch; message: string; metric: string; status: 'OPEN' | 'RESOLVED';
  resolution: string; createdAt: string; resolvedAt: string | null; reading: Reading;
}
export interface Harvest {
  id: number; batch: Batch; batchId: number; operator: User; traceCode: string;
  harvestedAt: string; weight: number; grade: string; destination: string; notes: string;
}
export interface Trace { harvest: Harvest; tasks: FarmTask[]; readings: Reading[]; disclaimer: string }
export interface DashboardData {
  stats: { plotCount: number; area: number; herbCount: number; growingCount: number; taskCount: number; overdueCount: number; alertCount: number; harvestWeight: number; harvestCount: number };
  tasks: FarmTask[]; alerts: FarmAlert[]; batches: Batch[];
}
