import { Activity, Status } from './types';

export const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTI8Y2Xs0F1dQ9MCBXFueCvIu4FpR0kZZchEUxYIQJzRlZ-qCuYW5hFNATbVJ5e8eYCmYI8mK6Ny6IH/pub?gid=0&single=true&output=csv';

export const INITIAL_ACTIVITIES: Activity[] = [
  // Carteleria
  {
    id: '10.1',
    category: 'Carteleria',
    name: 'Cartel exterior de identificacion de la sucursal',
    provider: 'Zip Carteles Bs As',
    responsible: 'Agustin',
    status: Status.IN_PROGRESS,
    progress: 50,
    cost: 2448396,
    startDate: '2025-12-05',
    endDate: '2025-12-18'
  },
  // Comunicaciones
  {
    id: '9.1',
    category: 'Comunicaciones',
    name: 'Pedido e instalacion de servicio de internet empresarial',
    provider: 'Everton',
    responsible: 'Juan Ignacio Cedrolla',
    status: Status.IN_PROGRESS,
    progress: 50,
    cost: 45000,
    startDate: '2025-12-05',
    endDate: '2025-12-15'
  },
  // Deposito e Insumos
  {
    id: '5.1',
    category: 'Deposito e Insumos',
    name: 'Construccion/habilitacion de deposito cerrado para guardado de materiales',
    provider: 'Jorge Guerra',
    responsible: 'Juan Ignacio Cedrolla',
    status: Status.IN_PROGRESS,
    progress: 10,
    cost: 350000,
    startDate: '2025-12-01',
    endDate: '2025-12-20'
  },
  {
    id: '5.2',
    category: 'Deposito e Insumos',
    name: 'Compra de estanterias metalicas reforzadas',
    provider: 'Metalurgica Sur',
    responsible: 'Roberto Gomez',
    status: Status.PENDING,
    progress: 0,
    cost: 850000,
    startDate: '2025-12-10',
    endDate: '2025-12-15'
  },
  {
    id: '5.3',
    category: 'Deposito e Insumos',
    name: 'Instalacion de sistema de ventilacion forzada',
    provider: 'Aire Total SA',
    responsible: 'Agustin',
    status: Status.COMPLETED,
    progress: 100,
    cost: 120000,
    startDate: '2025-11-28',
    endDate: '2025-12-02'
  },
  // Obra Civil
  {
    id: '3.1',
    category: 'Obra Civil',
    name: 'Demolicion de mamposteria interior',
    provider: 'Construcciones S.R.L.',
    responsible: 'Arq. Mariana Lopez',
    status: Status.COMPLETED,
    progress: 100,
    cost: 4500000,
    startDate: '2025-11-29',
    endDate: '2025-12-05'
  },
  {
    id: '3.2',
    category: 'Obra Civil',
    name: 'Colocacion de pisos de porcelanato',
    provider: 'Construcciones S.R.L.',
    responsible: 'Arq. Mariana Lopez',
    status: Status.PENDING,
    progress: 0,
    cost: 8900000,
    startDate: '2025-12-20',
    endDate: '2026-01-10'
  },
  // Electricidad
  {
    id: '4.1',
    category: 'Electricidad',
    name: 'Cableado estructurado cat 6',
    provider: 'ElectroRed',
    responsible: 'Carlos Tevez',
    status: Status.IN_PROGRESS,
    progress: 30,
    cost: 1200000,
    startDate: '2025-12-08',
    endDate: '2025-12-22'
  }
];