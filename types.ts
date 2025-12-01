export enum Status {
  PENDING = 'Por hacer',
  IN_PROGRESS = 'En proceso',
  COMPLETED = 'Realizada'
}

export interface Activity {
  id: string;
  category: string;
  name: string;
  provider: string;
  responsible: string;
  status: Status;
  progress: number;
  cost: number;
  startDate: string;
  endDate: string;
}

export interface ProjectStats {
  totalActivities: number;
  completed: number;
  inProgress: number;
  pending: number;
  overallProgress: number;
  totalInvestment: number;
}
