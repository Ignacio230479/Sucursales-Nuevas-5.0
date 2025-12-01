import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Upload,
  FolderOpen, 
  Trash2, 
  Pencil, 
  Building2,
  X,
  Loader2,
  Calendar,
  User,
  Briefcase,
  Zap,
  HardHat,
  Wifi,
  Package,
  Signpost,
  FileCheck,
  Truck,
  Paintbrush,
  MessageCircle,
  Send,
  Bot,
  Minimize2
} from 'lucide-react';
import { INITIAL_ACTIVITIES, GOOGLE_SHEET_CSV_URL } from './constants';
import { Activity, Status } from './types';

// --- Utility Components ---

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const cat = category.toLowerCase();
  const iconProps = { className: "w-5 h-5", strokeWidth: 2 };

  if (cat.includes('electricidad') || cat.includes('energia') || cat.includes('iluminacion')) {
    return <Zap {...iconProps} className="w-5 h-5 text-yellow-500 fill-yellow-100" />;
  }
  if (cat.includes('civil') || cat.includes('construccion') || cat.includes('demolicion') || cat.includes('albañileria') || cat.includes('pisos')) {
    return <HardHat {...iconProps} className="w-5 h-5 text-orange-600" />;
  }
  if (cat.includes('comunicacion') || cat.includes('internet') || cat.includes('red') || cat.includes('datos')) {
    return <Wifi {...iconProps} className="w-5 h-5 text-blue-500" />;
  }
  if (cat.includes('deposito') || cat.includes('insumo') || cat.includes('material') || cat.includes('estanteria')) {
    return <Package {...iconProps} className="w-5 h-5 text-amber-700" />;
  }
  if (cat.includes('carteleria') || cat.includes('imagen') || cat.includes('brand')) {
    return <Signpost {...iconProps} className="w-5 h-5 text-pink-600" />;
  }
  if (cat.includes('habilitacion') || cat.includes('legal') || cat.includes('permiso') || cat.includes('certificado')) {
    return <FileCheck {...iconProps} className="w-5 h-5 text-emerald-600" />;
  }
  if (cat.includes('equipamiento') || cat.includes('mueble') || cat.includes('traslado') || cat.includes('logistica')) {
    return <Truck {...iconProps} className="w-5 h-5 text-cyan-600" />;
  }
  if (cat.includes('pintura')) {
    return <Paintbrush {...iconProps} className="w-5 h-5 text-rose-500" />;
  }

  // Fallback
  return <FolderOpen {...iconProps} className="w-5 h-5 text-blue-400" />;
};

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  let styles = '';
  switch (status) {
    case Status.COMPLETED:
      styles = 'bg-white border border-green-500 text-green-700';
      break;
    case Status.IN_PROGRESS:
      styles = 'bg-amber-100 text-amber-800 border border-amber-200';
      break;
    case Status.PENDING:
      styles = 'bg-gray-100 text-gray-600 border border-gray-200';
      break;
    default:
      styles = 'bg-gray-100 text-gray-600 border border-gray-200';
  }
  
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs uppercase font-bold tracking-wide whitespace-nowrap ${styles}`}>
      {status}
    </span>
  );
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="flex items-center gap-2 w-full md:w-24">
      <span className="text-xs font-bold text-blue-900 w-6 text-right">{progress}%</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-700 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; subValue?: string }> = ({ label, value, subValue }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-w-[140px] transition-transform hover:-translate-y-1 duration-300 z-10 relative">
    <div className="text-3xl font-bold text-blue-900 mb-1">{value}</div>
    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide text-center">{label}</div>
    {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
  </div>
);

// --- Helper Functions ---

const cleanString = (str: string) => {
  if (!str) return "";
  // First normalize to separate accents
  // Then replace the accent characters
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const compareIds = (idA: string, idB: string) => {
  const partsA = idA.split('.').map(Number);
  const partsB = idB.split('.').map(Number);
  
  const length = Math.max(partsA.length, partsB.length);
  
  for (let i = 0; i < length; i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA !== valB) return valA - valB;
  }
  return 0;
};

const parseCSVLine = (line: string): string[] => {
  const row: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim().replace(/^"|"$/g, ''));
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  row.push(currentVal.trim().replace(/^"|"$/g, ''));
  return row;
};

// Deduplicate activities by ID, preferring the later one in the list
const deduplicateActivities = (activities: Activity[]): Activity[] => {
  const map = new Map<string, Activity>();
  activities.forEach(a => {
    if (a.id) map.set(a.id, a);
  });
  return Array.from(map.values());
};

// --- Modal Component ---

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Activity) => void;
  existingCategories: string[];
}

const NewActivityModal: React.FC<NewActivityModalProps> = ({ isOpen, onClose, onSave, existingCategories }) => {
  const [formData, setFormData] = useState({
    id: '',
    category: '',
    customCategory: '',
    name: '',
    provider: '',
    responsible: '',
    status: Status.PENDING,
    progress: 0,
    cost: 0,
    startDate: '',
    endDate: ''
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: '',
        category: existingCategories[0] || '',
        customCategory: '',
        name: '',
        provider: '',
        responsible: '',
        status: Status.PENDING,
        progress: 0,
        cost: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      setIsCustomCategory(false);
    }
  }, [isOpen, existingCategories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? formData.customCategory : formData.category;
    
    if (!formData.id || !formData.name || !finalCategory) {
      alert('Por favor complete los campos obligatorios (ID, Categoria, Nombre)');
      return;
    }

    onSave({
      ...formData,
      category: cleanString(finalCategory),
      name: cleanString(formData.name),
      provider: cleanString(formData.provider),
      responsible: cleanString(formData.responsible),
      id: formData.id,
      cost: Number(formData.cost),
      progress: Number(formData.progress)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 h-[90vh] md:h-auto overflow-y-auto">
        <div className="bg-blue-900 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" />
            Nueva Actividad
          </h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          
          <div className="col-span-2">
             <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Categoria</label>
             <div className="flex gap-2 flex-col md:flex-row">
                {!isCustomCategory ? (
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setIsCustomCategory(true);
                        setFormData(prev => ({ ...prev, customCategory: '' }));
                      } else {
                        setFormData(prev => ({ ...prev, category: e.target.value }));
                      }
                    }}
                  >
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="NEW" className="font-bold text-blue-600">+ Nueva Categoria...</option>
                  </select>
                ) : (
                  <div className="w-full flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Nombre de la nueva categoria"
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.customCategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsCustomCategory(false)}
                      className="text-xs text-red-500 hover:underline px-2"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
             </div>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">ID (ej. 10.1)</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              placeholder="1.0"
              required
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Responsable</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.responsible}
              onChange={(e) => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Descripcion de la Actividad</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej. Colocacion de luminarias..."
              required
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Proveedor / Empresa</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.provider}
              onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
            />
          </div>

          <div className="col-span-2 md:col-span-1">
             <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Estado</label>
             <select 
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Status }))}
              >
                <option value={Status.PENDING}>{Status.PENDING}</option>
                <option value={Status.IN_PROGRESS}>{Status.IN_PROGRESS}</option>
                <option value={Status.COMPLETED}>{Status.COMPLETED}</option>
              </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Costo ($)</label>
            <input 
              type="number" 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Progreso (%)</label>
            <input 
              type="number" 
              min="0"
              max="100"
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.progress}
              onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Fecha Inicio</label>
            <input 
              type="date" 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Fecha Fin</label>
            <input 
              type="date" 
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <div className="col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md transition-colors text-sm"
            >
              Guardar Actividad
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

// --- Chat Agent Component ---

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hola. Soy tu asistente virtual de proyecto. ¿En que puedo ayudarte hoy?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://primary-production-e953.up.railway.app/webhook/Sucursales-JB', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (!response.ok) {
        throw new Error('Error en la comunicacion');
      }

      const data = await response.json();
      
      // Adapt based on webhook response structure (assuming { output: "text" } or { message: "text" } or just text)
      // Usually n8n or generic webhooks return JSON. We'll try to find the text field.
      let botText = "Respuesta recibida";
      
      if (typeof data === 'string') {
        botText = data;
      } else if (data.output) {
        botText = data.output;
      } else if (data.message) {
        botText = data.message;
      } else if (data.text) {
        botText = data.text;
      } else {
        botText = JSON.stringify(data);
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, hubo un error al conectar con el servidor.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[450px] rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-blue-900 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-800 rounded-full">
                <Bot className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Asistente Virtual</h3>
                <p className="text-[10px] text-blue-200">En linea</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
               <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-blue-800 rounded transition-colors text-blue-200 hover:text-white">
                 <Minimize2 className="w-4 h-4" />
               </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-gray-100 border border-transparent focus:bg-white focus:border-blue-300 rounded-full px-4 py-2 text-sm focus:outline-none transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-900 text-white rounded-full hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3.5 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center ${
          isOpen ? 'bg-gray-200 text-gray-600' : 'bg-blue-900 text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};


// --- Main Component ---

export default function App() {
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('Todas');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        // FORCE UTF-8 Decoding to handle characters like 'ó', 'ñ', etc. correctly
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);
        
        const lines = text.split(/\r\n|\n/);
        
        const newActivities: Activity[] = [];
        
        // Skip header if it exists
        const hasHeader = lines[0] && (lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('categoria'));
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const row = parseCSVLine(line);
          if (row.length < 3) continue;

          const id = row[0];
          const category = cleanString(row[1] || '');
          const name = cleanString(row[2] || '');
          const provider = cleanString(row[3] || '');
          const responsible = cleanString(row[4] || '');
          
          let status = Status.PENDING;
          const statusStr = (row[5] || '').toLowerCase();
          if (statusStr.includes('proceso') || statusStr.includes('progress')) status = Status.IN_PROGRESS;
          else if (statusStr.includes('realizada') || statusStr.includes('completada') || statusStr.includes('completed')) status = Status.COMPLETED;
          
          const progress = parseInt(row[6]?.replace(/[^0-9]/g, '') || '0');
          const cost = parseFloat(row[7]?.replace(/[^0-9.-]/g, '') || '0');
          const startDate = row[8] || '';
          const endDate = row[9] || '';

          if (id && name) {
            newActivities.push({
              id, category, name, provider, responsible, status, progress, cost, startDate, endDate
            });
          }
        }

        if (newActivities.length > 0) {
          // Use dedup function to clean data from CSV + ensure no duplicates with initial state if any
          setActivities(deduplicateActivities(newActivities));
        }
      } catch (error) {
        console.error("Failed to fetch Google Sheet data, using fallback", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter(a => a.status === Status.COMPLETED).length;
    const inProgress = activities.filter(a => a.status === Status.IN_PROGRESS).length;
    const pending = activities.filter(a => a.status === Status.PENDING).length;
    const totalCost = activities.reduce((sum, a) => sum + a.cost, 0);
    const progressSum = activities.reduce((sum, a) => sum + a.progress, 0);
    const overallProgress = total > 0 ? Math.round(progressSum / total) : 0;

    return { total, completed, inProgress, pending, overallProgress, totalCost };
  }, [activities]);

  // Filtering, Sorting and Grouping
  const groupedAndSortedActivities = useMemo<[string, Activity[]][]>(() => {
    // 1. Filter
    const filtered = activities.filter(activity => {
      const matchesSearch = 
        activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        activeFilter === 'Todas' ? true :
        activeFilter === 'Realizadas' ? activity.status === Status.COMPLETED :
        activeFilter === 'En Proceso' ? activity.status === Status.IN_PROGRESS :
        activeFilter === 'Por Hacer' ? activity.status === Status.PENDING : true;

      return matchesSearch && matchesFilter;
    });

    // 2. Sort Items by ID
    filtered.sort((a, b) => compareIds(a.id, b.id));

    // 3. Group
    const groups: Record<string, Activity[]> = {};
    filtered.forEach(act => {
      if (!groups[act.category]) {
        groups[act.category] = [];
      }
      groups[act.category].push(act);
    });

    // 4. Sort Groups
    return Object.entries(groups).sort(([, itemsA], [, itemsB]) => {
      if (itemsA.length === 0 || itemsB.length === 0) return 0;
      return compareIds(itemsA[0].id, itemsB[0].id);
    });

  }, [activities, searchTerm, activeFilter]);

  // Unique Categories for Dropdown
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(activities.map(a => a.category))).sort();
  }, [activities]);

  // Formatters
  const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });

  const handleDelete = (id: string) => {
    if(window.confirm('¿Esta seguro de eliminar esta actividad? Esta accion solo afectara su vista local.')) {
      setActivities(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleAddActivity = (newActivity: Activity) => {
    // Add allows duplicates or updates? Let's strictly update if ID exists, or add.
    setActivities(prev => deduplicateActivities([...prev, newActivity]));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        alert("El archivo esta vacio");
        return;
      }

      try {
        const lines = text.split(/\r\n|\n/);
        const newActivities: Activity[] = [];
        
        // Smarter header detection: Check if first line looks like header (has 'id' or 'categoria')
        const hasHeader = lines[0] && (lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('categoria'));
        const startIndex = hasHeader ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const row = parseCSVLine(line);
          if (row.length < 3) continue;

          const id = row[0] || Math.random().toString(36).substr(2, 6);
          const category = cleanString(row[1] || 'Importado');
          const name = cleanString(row[2] || 'Sin Nombre');
          const provider = cleanString(row[3] || '');
          const responsible = cleanString(row[4] || '');
          
          let status = Status.PENDING;
          const statusStr = (row[5] || '').toLowerCase();
          if (statusStr.includes('proceso')) status = Status.IN_PROGRESS;
          else if (statusStr.includes('realizada') || statusStr.includes('completada')) status = Status.COMPLETED;
          
          const progress = parseInt(row[6]?.replace(/[^0-9]/g, '') || '0');
          const cost = parseFloat(row[7]?.replace(/[^0-9.-]/g, '') || '0');
          const startDate = row[8] || new Date().toISOString().split('T')[0];
          const endDate = row[9] || new Date().toISOString().split('T')[0];

          newActivities.push({
            id, category, name, provider, responsible, status, progress, cost, startDate, endDate
          });
        }

        if (newActivities.length > 0) {
          setActivities(prev => deduplicateActivities([...prev, ...newActivities]));
          alert(`Importacion exitosa: ${newActivities.length} actividades agregadas.`);
        } else {
          alert('No se encontraron actividades validas en el archivo CSV. Verifique el formato.');
        }
      } catch (err) {
        console.error("Error parsing CSV:", err);
        alert('Hubo un error al procesar el archivo CSV.');
      }
      
      // Reset input value to allow selecting the same file again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const triggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans relative">
      
      <NewActivityModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddActivity}
        existingCategories={uniqueCategories}
      />

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.txt"
        className="hidden"
      />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white pt-6 pb-28 px-4 md:px-12 rounded-b-[2rem] shadow-lg relative">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="text-yellow-400 w-8 h-8" strokeWidth={1.5} />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Proyecto Sucursal Fontana</h1>
          </div>
          <p className="text-blue-200 text-xs font-light px-2">
            Responsable de Proyecto: <span className="font-medium text-white">Juan Ignacio Cedrolla</span> | 
            Inicio: <span className="font-medium text-white">28/11/2025</span> | 
            Habilitacion: <span className="font-medium text-white">05/12/2026</span>
          </p>
        </div>
      </div>

      <div className="max-w-[98%] md:max-w-[95%] xl:max-w-7xl mx-auto px-2 sm:px-4 -mt-12">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 mb-6">
          <StatCard label="Total Actividades" value={stats.total} />
          <StatCard label="Realizadas" value={stats.completed} />
          <StatCard label="En Proceso" value={stats.inProgress} />
          <StatCard label="Por Hacer" value={stats.pending} />
          <StatCard label="Progreso General" value={`${stats.overallProgress}%`} />
          <StatCard label="Inversion Total" value={currencyFormatter.format(stats.totalCost)} />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar actividad..." 
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
            {['Todas', 'Por Hacer', 'En Proceso', 'Realizadas'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeFilter === filter 
                    ? 'bg-blue-900 text-white' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva</span>
            </button>
            <button 
              onClick={triggerImport}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar</span>
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm">
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Data Container (Responsive) */}
        <div className="relative min-h-[300px]">
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center flex-col gap-2 rounded-xl">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-900 font-medium">Cargando datos del proyecto...</p>
            </div>
          )}

          {!isLoading && groupedAndSortedActivities.length === 0 && (
             <div className="bg-white p-8 text-center text-gray-500 rounded-xl shadow-sm border border-gray-200">
               No se encontraron actividades.
             </div>
          )}

          {/* DESKTOP VIEW: Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-blue-900 text-white text-[11px] uppercase tracking-wider">
                    <th className="px-3 py-3 font-semibold w-12 text-center">#</th>
                    <th className="px-3 py-3 font-semibold min-w-[200px]">ACTIVIDAD</th>
                    <th className="px-3 py-3 font-semibold w-32">EMPRESA/PROVEEDOR</th>
                    <th className="px-3 py-3 font-semibold w-32">RESPONSABLE</th>
                    <th className="px-3 py-3 font-semibold w-24">ESTADO</th>
                    <th className="px-3 py-3 font-semibold w-28">PROGRESO</th>
                    <th className="px-3 py-3 font-semibold w-24 text-right">COSTO</th>
                    <th className="px-3 py-3 font-semibold w-24">FECHA INICIO</th>
                    <th className="px-3 py-3 font-semibold w-24">FECHA FIN</th>
                    <th className="px-3 py-3 font-semibold w-20 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {groupedAndSortedActivities.map(([category, items]) => (
                    <React.Fragment key={category}>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={10} className="px-3 py-2">
                          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                            <CategoryIcon category={category} />
                            <span>{category}</span>
                            <span className="text-gray-500 font-normal text-xs ml-1">({items.length})</span>
                          </div>
                        </td>
                      </tr>
                      {items.map((activity) => (
                        <tr key={activity.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors group">
                          <td className="px-3 py-3 text-center font-bold text-gray-700">{activity.id}</td>
                          <td className="px-3 py-3 font-medium text-gray-800 break-words max-w-[250px]">{activity.name}</td>
                          <td className="px-3 py-3 text-gray-600 truncate max-w-[150px]" title={activity.provider}>{activity.provider}</td>
                          <td className="px-3 py-3 text-gray-600 truncate max-w-[150px]" title={activity.responsible}>{activity.responsible}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={activity.status} />
                          </td>
                          <td className="px-3 py-3">
                            <ProgressBar progress={activity.progress} />
                          </td>
                          <td className="px-3 py-3 font-medium text-green-600 tabular-nums text-right whitespace-nowrap">
                            {currencyFormatter.format(activity.cost)}
                          </td>
                          <td className="px-3 py-3 text-gray-500 tabular-nums whitespace-nowrap">{activity.startDate}</td>
                          <td className="px-3 py-3 text-gray-500 tabular-nums whitespace-nowrap">{activity.endDate}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button className="p-1 bg-amber-400 text-white rounded hover:bg-amber-500 transition-colors shadow-sm">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDelete(activity.id)}
                                className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
               <span>{activities.length} registros totales</span>
               <div className="flex gap-1">
                 <button className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 text-xs">Anterior</button>
                 <button className="px-2 py-1 bg-blue-900 text-white border border-blue-900 rounded shadow-sm text-xs">1</button>
                 <button className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 text-xs">Siguiente</button>
               </div>
            </div>
          </div>

          {/* MOBILE VIEW: Cards */}
          <div className="md:hidden space-y-4">
             {groupedAndSortedActivities.map(([category, items]) => (
                <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                   {/* Category Header */}
                   <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                        <CategoryIcon category={category} />
                        <span>{category}</span>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {items.length}
                      </span>
                   </div>

                   {/* Activity Cards */}
                   <div className="divide-y divide-gray-100">
                      {items.map(activity => (
                         <div key={activity.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold font-mono">
                                    {activity.id}
                                  </span>
                                  <StatusBadge status={activity.status} />
                               </div>
                               <div className="flex gap-2">
                                 <button className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100">
                                    <Pencil className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={() => handleDelete(activity.id)}
                                   className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                 >
                                    <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                            </div>

                            <h3 className="text-sm font-bold text-gray-800 leading-snug">
                               {activity.name}
                            </h3>

                            <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs text-gray-500">
                               {activity.provider && (
                                 <div className="flex items-center gap-1.5 overflow-hidden">
                                    <Briefcase className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="truncate">{activity.provider}</span>
                                 </div>
                               )}
                               {activity.responsible && (
                                 <div className="flex items-center gap-1.5 overflow-hidden">
                                    <User className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="truncate">{activity.responsible}</span>
                                 </div>
                               )}
                               <div className="flex items-center gap-1.5 col-span-2">
                                  <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span>{activity.startDate} - {activity.endDate}</span>
                               </div>
                            </div>

                            <div className="mt-1 pt-3 border-t border-gray-50 flex items-end justify-between gap-4">
                               <div className="flex-1">
                                  <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-medium">
                                     <span>Progreso</span>
                                     <span>{activity.progress}%</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                                    <div 
                                      className="h-full bg-blue-700 rounded-full"
                                      style={{ width: `${activity.progress}%` }}
                                    />
                                  </div>
                               </div>
                               <div className="text-right">
                                  <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Costo</div>
                                  <div className="text-sm font-bold text-green-600 flex items-center justify-end gap-0.5">
                                    {currencyFormatter.format(activity.cost)}
                                  </div>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>

        </div>

      </div>
      <ChatWidget />
    </div>
  );
}
