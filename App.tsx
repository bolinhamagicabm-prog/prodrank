
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Users, 
  BarChart3, 
  ClipboardList, 
  AlertCircle, 
  History,
  Plus,
  Trash2,
  UserPlus,
  X,
  Briefcase,
  GraduationCap,
  Cloud,
  RefreshCw,
  Settings,
  Copy,
  AlertTriangle,
  Wifi,
  Save,
  CheckCircle2,
  Calendar,
  Clock,
  PlusCircle,
  MinusCircle,
  Edit2,
  Check,
  AlertOctagon
} from 'lucide-react';
import { 
  Collaborator, 
  CollaboratorType, 
  ProductionLog, 
  ProductionError, 
  Interval,
  ErrorType
} from './types';
import { generateRankings } from './utils/calculations';

const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

const TabButton = ({ active, icon: Icon, label, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-2 transition-colors outline-none select-none active:scale-90 ${
      active ? 'text-blue-600' : 'text-slate-400'
    }`}
  >
    <Icon size={24} />
    <span className="text-xs mt-1 font-medium">{label}</span>
  </button>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6 px-4 pt-4">
    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'input' | 'collaborators' | 'history' | 'settings'>('ranking');
  const [rankingCategory, setRankingCategory] = useState<CollaboratorType>(CollaboratorType.CLT);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [errors, setErrors] = useState<ProductionError[]>([]);
  
  const [syncUrl, setSyncUrl] = useState<string>(localStorage.getItem('prodrank_sync_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('prodrank_last_sync'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Estado para edição
  const [editingItem, setEditingItem] = useState<{ type: 'log' | 'error', data: any } | null>(null);

  const dataRef = useRef({ collaborators, logs, errors });
  const isInitialMount = useRef(true);

  useEffect(() => {
    dataRef.current = { collaborators, logs, errors };
    localStorage.setItem('prodrank_collaborators', JSON.stringify(collaborators));
    localStorage.setItem('prodrank_logs', JSON.stringify(logs));
    localStorage.setItem('prodrank_errors', JSON.stringify(errors));
    if (!isInitialMount.current) {
      setHasUnsavedChanges(true);
    }
  }, [collaborators, logs, errors]);

  const handleCloudSync = useCallback(async (mode: 'push' | 'pull', customData?: any) => {
    if (!syncUrl || !syncUrl.includes('/exec')) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const currentData = customData || dataRef.current;
      const payload = { mode, data: currentData, timestamp: new Date().toISOString() };
      const response = await fetch(syncUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch (e) { throw new Error('Erro na resposta do Google.'); }
      if (result.status === 'success') {
        if (mode === 'pull' && result.data) {
          if (Array.isArray(result.data.collaborators)) setCollaborators(result.data.collaborators);
          if (Array.isArray(result.data.logs)) setLogs(result.data.logs);
          if (Array.isArray(result.data.errors)) setErrors(result.data.errors);
        }
        const now = new Date().toLocaleTimeString();
        setLastSync(now);
        setHasUnsavedChanges(false);
        localStorage.setItem('prodrank_last_sync', now);
      }
    } catch (err: any) {
      setSyncError(err.message || 'Erro de conexão');
    } finally { setIsSyncing(false); }
  }, [syncUrl]);

  useEffect(() => {
    const savedCols = localStorage.getItem('prodrank_collaborators');
    const savedLogs = localStorage.getItem('prodrank_logs');
    const savedErrors = localStorage.getItem('prodrank_errors');
    if (savedCols) setCollaborators(JSON.parse(savedCols));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedErrors) setErrors(JSON.parse(savedErrors));
    if (syncUrl && syncUrl.includes('/exec')) handleCloudSync('pull');
    setTimeout(() => { isInitialMount.current = false; }, 1000);
  }, []);

  useEffect(() => {
    if (isInitialMount.current || !hasUnsavedChanges) return;
    const timer = setTimeout(() => { handleCloudSync('push'); }, 2000); 
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, handleCloudSync]);

  const allRankings = useMemo(() => {
    return generateRankings(
      collaborators, 
      logs.filter(l => l.date >= startDate && l.date <= endDate), 
      errors.filter(e => e.date >= startDate && e.date <= endDate)
    );
  }, [collaborators, logs, errors, startDate, endDate]);

  const filteredRankings = useMemo(() => {
    return allRankings.filter(r => r.type === rankingCategory);
  }, [allRankings, rankingCategory]);

  const addCollaborator = (name: string, type: CollaboratorType) => {
    setCollaborators(prev => [...prev, { id: generateId(), name, type }]);
  };

  const executeDeleteCollaborator = async (id: string) => {
    const newCols = collaborators.filter(c => c.id !== id);
    const newLogs = logs.filter(l => l.collaboratorId !== id);
    const newErrors = errors.filter(e => e.collaboratorId !== id);
    setCollaborators(newCols);
    setLogs(newLogs);
    setErrors(newErrors);
    setConfirmDeleteId(null);
    handleCloudSync('push', { collaborators: newCols, logs: newLogs, errors: newErrors });
  };

  const saveProduction = (log: Omit<ProductionLog, 'id'>) => {
    setLogs(prev => [...prev, { ...log, id: generateId() }]);
    setActiveTab('history');
  };

  const saveError = (err: Omit<ProductionError, 'id'>) => {
    setErrors(prev => [...prev, { ...err, id: generateId() }]);
    setActiveTab('history');
  };

  const updateItem = (updated: any) => {
    if (editingItem?.type === 'log') {
      setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
    } else {
      setErrors(prev => prev.map(e => e.id === updated.id ? updated : e));
    }
    setEditingItem(null);
  };

  const deleteItem = (id: string, type: 'log' | 'error') => {
    if (!window.confirm('Excluir este registro permanentemente?')) return;
    if (type === 'log') {
      setLogs(prev => prev.filter(l => l.id !== id));
    } else {
      setErrors(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl relative overflow-hidden text-slate-900">
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center z-20 shadow-lg border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg transform -rotate-3">P</div>
          <div className="font-black text-lg tracking-tighter">PRODRANK</div>
        </div>
        <div className="flex items-center space-x-2">
          {syncUrl && (
            <div className="flex flex-col items-end mr-1">
              <div className="flex items-center space-x-1">
                {isSyncing ? <RefreshCw size={12} className="text-blue-400 animate-spin" /> : <Wifi size={12} className={hasUnsavedChanges ? 'text-amber-400 animate-pulse' : 'text-emerald-400'} />}
                <span className={`text-[9px] font-black uppercase ${hasUnsavedChanges ? 'text-amber-400' : 'text-emerald-400'}`}>{isSyncing ? 'Sync...' : hasUnsavedChanges ? 'Pendente' : 'Nuvem OK'}</span>
              </div>
            </div>
          )}
          <button onClick={() => setActiveTab('settings')} className="p-2.5 bg-slate-800 rounded-xl text-slate-500 hover:text-slate-300"><Settings size={20} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 bg-slate-50/50">
        {activeTab === 'ranking' && (
          <div className="animate-in fade-in duration-500">
            <SectionHeader title="🏆 Rankings" subtitle="Produtividade por período" />
            <div className="px-4 space-y-4">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 text-[10px] font-black p-3 rounded-xl outline-none" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 text-[10px] font-black p-3 rounded-xl outline-none" />
                </div>
              </div>

              <div className="flex p-1 bg-slate-200/50 rounded-2xl">
                <button onClick={() => setRankingCategory(CollaboratorType.CLT)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${rankingCategory === CollaboratorType.CLT ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>CLT</button>
                <button onClick={() => setRankingCategory(CollaboratorType.ESTAGIARIO)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${rankingCategory === CollaboratorType.ESTAGIARIO ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500'}`}>ESTAGIÁRIOS</button>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden divide-y divide-slate-100 shadow-lg">
                {filteredRankings.map((rank, idx) => (
                  <div key={rank.collaboratorId} className="p-5 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</div>
                      <div>
                        <p className="font-black text-slate-800 tracking-tight">{rank.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{rank.netPackages} pkts líq.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-xl ${rankingCategory === CollaboratorType.CLT ? 'text-blue-600' : 'text-emerald-600'}`}>{rank.minutesPerPackage === Infinity ? '---' : rank.minutesPerPackage.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase">min/pkt</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="animate-in slide-in-from-right duration-500 p-4 space-y-6 pb-24">
            <ProductionForm collaborators={collaborators} onSave={saveProduction} />
            <ErrorForm collaborators={collaborators} onSave={saveError} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500 p-4">
            <SectionHeader title="Histórico" subtitle="Produção e Penalidades" />
            
            <div className="space-y-3 pb-24">
              {[...logs.map(l => ({ ...l, entryType: 'log' as const })), ...errors.map(e => ({ ...e, entryType: 'error' as const }))]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(item => {
                  const col = collaborators.find(c => c.id === item.collaboratorId);
                  const isLog = item.entryType === 'log';
                  return (
                    <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl ${isLog ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                          {isLog ? <ClipboardList size={20} /> : <AlertOctagon size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{col?.name || 'Desconhecido'}</p>
                          <div className="flex items-center space-x-2 text-[9px] font-bold text-slate-400 uppercase">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span className={isLog ? 'text-blue-500' : 'text-red-500'}>
                              {isLog ? `${(item as any).packages} Pacotes` : (item as any).type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingItem({ type: isLog ? 'log' : 'error', data: item })}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteItem(item.id, isLog ? 'log' : 'error')}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === 'collaborators' && (
          <div className="p-4 space-y-6">
            <CollaboratorForm onAdd={addCollaborator} />
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden divide-y divide-slate-100 shadow-lg">
              {collaborators.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-slate-100 rounded-2xl text-slate-500"><Users size={20} /></div>
                    <div>
                      <p className="font-black text-slate-800 tracking-tight">{c.name}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase ${c.type === CollaboratorType.CLT ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.type}</span>
                    </div>
                  </div>
                  <button onClick={() => executeDeleteCollaborator(c.id)} className="p-4 text-slate-300 hover:text-red-400"><Trash2 size={22}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="p-4 space-y-6">
             <SectionHeader title="Sincronização" />
             <input type="url" placeholder="URL do Google Sheets" value={syncUrl} onChange={(e) => { setSyncUrl(e.target.value); localStorage.setItem('prodrank_sync_url', e.target.value); }} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none text-sm font-bold" />
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleCloudSync('pull')} className="bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase">Baixar Nuvem</button>
                <button onClick={() => handleCloudSync('push')} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase">Subir Nuvem</button>
             </div>
             <button onClick={handleReset} className="w-full text-slate-400 text-[9px] font-black py-4 border-2 border-dashed border-slate-200 rounded-2xl uppercase">Resetar Dados Locais</button>
           </div>
        )}
      </main>

      {/* Modal de Edição */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className={`p-6 text-white flex justify-between items-center sticky top-0 z-10 ${editingItem.type === 'log' ? 'bg-blue-600' : 'bg-red-600'}`}>
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center">
                <Edit2 size={16} className="mr-2" /> Editar Lançamento
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-white/20 rounded-xl transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {editingItem.type === 'log' ? (
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Pacotes</label>
                        <input type="number" value={editingItem.data.packages} onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, packages: parseInt(e.target.value)}})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Data</label>
                        <input type="date" value={editingItem.data.date} onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, date: e.target.value}})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none" />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Entrada</label>
                        <input type="time" value={editingItem.data.clockIn} onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, clockIn: e.target.value}})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Saída</label>
                        <input type="time" value={editingItem.data.clockOut} onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, clockOut: e.target.value}})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none" />
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <div className="flex justify-between items-center">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Intervalos</label>
                       <button onClick={() => setEditingItem({...editingItem, data: {...editingItem.data, breaks: [...editingItem.data.breaks, {start: '12:00', end: '13:00'}]}})} className="p-1 bg-blue-50 text-blue-600 rounded-lg"><Plus size={14}/></button>
                     </div>
                     <div className="space-y-2">
                       {editingItem.data.breaks.map((b: Interval, idx: number) => (
                         <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl">
                            <input type="time" value={b.start} onChange={(e) => {
                              const nb = [...editingItem.data.breaks]; nb[idx].start = e.target.value;
                              setEditingItem({...editingItem, data: {...editingItem.data, breaks: nb}});
                            }} className="bg-transparent font-bold text-[10px] w-full" />
                            <input type="time" value={b.end} onChange={(e) => {
                              const nb = [...editingItem.data.breaks]; nb[idx].end = e.target.value;
                              setEditingItem({...editingItem, data: {...editingItem.data, breaks: nb}});
                            }} className="bg-transparent font-bold text-[10px] w-full" />
                            <button onClick={() => {
                              const nb = editingItem.data.breaks.filter((_: any, i: number) => i !== idx);
                              setEditingItem({...editingItem, data: {...editingItem.data, breaks: nb}});
                            }} className="text-red-400"><MinusCircle size={14}/></button>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Quantidade</label>
                        <input type="number" value={editingItem.data.quantity} onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, quantity: parseInt(e.target.value)}})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-red-500 outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Tipo</label>
                        <select value={editingItem.data.type} onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, type: e.target.value as ErrorType}})} className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none">
                          <option value={ErrorType.ERRO_PACOTE}>ERRO PACOTE</option>
                          <option value={ErrorType.FALTA}>FALTA</option>
                        </select>
                     </div>
                   </div>
                   <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Data</label>
                        <input type="date" value={editingItem.data.date} onChange={(e) => setEditingItem({...editingItem, data: {...editingItem.data, date: e.target.value}})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-red-500 outline-none" />
                   </div>
                </div>
              )}
              <button 
                onClick={() => updateItem(editingItem.data)}
                className={`w-full py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg ${editingItem.type === 'log' ? 'bg-blue-600 shadow-blue-200' : 'bg-red-600 shadow-red-200'}`}
              >
                <Check size={16} />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center px-4 py-3 pb-safe shadow-lg z-50">
        <TabButton active={activeTab === 'ranking'} icon={BarChart3} label="Ranking" onClick={() => setActiveTab('ranking')} />
        <TabButton active={activeTab === 'input'} icon={Plus} label="Lançar" onClick={() => setActiveTab('input')} />
        <TabButton active={activeTab === 'history'} icon={History} label="Histórico" onClick={() => setActiveTab('history')} />
        <TabButton active={activeTab === 'collaborators'} icon={Users} label="Equipe" onClick={() => setActiveTab('collaborators')} />
      </nav>
    </div>
  );
};

const ProductionForm = ({ collaborators, onSave }: { collaborators: Collaborator[], onSave: (log: Omit<ProductionLog, 'id'>) => void }) => {
  const [formData, setFormData] = useState({
    collaboratorId: '',
    date: new Date().toISOString().slice(0, 10),
    packages: 0,
    clockIn: '08:00',
    clockOut: '17:00',
    breaks: [{ start: '12:00', end: '13:00' }] as Interval[]
  });

  const addBreak = () => {
    setFormData(prev => ({
      ...prev,
      breaks: [...prev.breaks, { start: '13:00', end: '13:15' }]
    }));
  };

  const removeBreak = (index: number) => {
    setFormData(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }));
  };

  const updateBreak = (index: number, field: keyof Interval, value: string) => {
    setFormData(prev => {
      const newBreaks = [...prev.breaks];
      newBreaks[index] = { ...newBreaks[index], [field]: value };
      return { ...prev, breaks: newBreaks };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collaboratorId) return alert('Selecione um colaborador');
    onSave(formData);
    setFormData(prev => ({ ...prev, packages: 0 }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-600 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-200 space-y-4">
      <h3 className="text-[10px] font-black text-blue-200 flex items-center uppercase tracking-widest"><ClipboardList size={18} className="mr-2" /> Produção</h3>
      <select value={formData.collaboratorId} onChange={(e) => setFormData(prev => ({...prev, collaboratorId: e.target.value}))} className="w-full px-5 py-4 rounded-2xl bg-blue-700/50 border-2 border-blue-400/30 text-white font-bold outline-none appearance-none">
        <option value="" className="text-slate-900">Selecionar...</option>
        {collaborators.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
      </select>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[8px] text-blue-200 font-black uppercase ml-1">Data</label>
          <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))} className="w-full p-3.5 rounded-xl bg-blue-700/50 text-white font-bold text-xs border-2 border-transparent focus:border-white/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] text-blue-200 font-black uppercase ml-1">Pacotes</label>
          <input type="number" placeholder="Pacotes" value={formData.packages || ''} onChange={(e) => setFormData(prev => ({...prev, packages: parseInt(e.target.value) || 0}))} className="w-full p-3.5 rounded-xl bg-blue-700/50 text-white font-bold outline-none border-2 border-transparent focus:border-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-blue-500/30 pt-4">
        <div className="space-y-1">
          <label className="text-[8px] text-blue-200 font-black uppercase ml-1">Entrada</label>
          <input type="time" value={formData.clockIn} onChange={(e) => setFormData(prev => ({...prev, clockIn: e.target.value}))} className="w-full p-3 rounded-xl bg-blue-700/50 text-white font-bold outline-none border-2 border-transparent focus:border-white/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] text-blue-200 font-black uppercase ml-1">Saída</label>
          <input type="time" value={formData.clockOut} onChange={(e) => setFormData(prev => ({...prev, clockOut: e.target.value}))} className="w-full p-3 rounded-xl bg-blue-700/50 text-white font-bold outline-none border-2 border-transparent focus:border-white/20" />
        </div>
      </div>

      {/* Gerenciamento de Períodos (Intervalos) */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <label className="text-[9px] font-black text-blue-200 uppercase tracking-widest flex items-center">
            <Clock size={12} className="mr-2" /> Períodos de Intervalo
          </label>
          <button type="button" onClick={addBreak} className="p-1 bg-blue-400/40 text-white rounded-lg hover:bg-white/20 transition-all">
            <Plus size={14} />
          </button>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {formData.breaks.map((brk, idx) => (
            <div key={idx} className="flex items-center space-x-2 bg-blue-800/20 p-2 rounded-xl border border-white/5">
              <input type="time" value={brk.start} onChange={(e) => updateBreak(idx, 'start', e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none w-full text-center" />
              <span className="text-white/20">-</span>
              <input type="time" value={brk.end} onChange={(e) => updateBreak(idx, 'end', e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none w-full text-center" />
              <button type="button" onClick={() => removeBreak(idx)} className="p-1 text-white/30 hover:text-red-400"><MinusCircle size={14}/></button>
            </div>
          ))}
          {formData.breaks.length === 0 && <p className="text-[8px] text-blue-300/50 text-center py-2 uppercase font-black">Nenhum intervalo adicionado</p>}
        </div>
      </div>

      <button type="submit" className="w-full bg-white text-blue-600 py-4.5 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Registrar Produção</button>
    </form>
  );
};

const ErrorForm = ({ collaborators, onSave }: { collaborators: Collaborator[], onSave: (err: Omit<ProductionError, 'id'>) => void }) => {
  const [formData, setFormData] = useState({ 
    collaboratorId: '', 
    date: new Date().toISOString().slice(0, 10), 
    quantity: 1,
    type: ErrorType.ERRO_PACOTE 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collaboratorId) return alert('Selecione um colaborador');
    onSave(formData);
    setFormData(prev => ({ ...prev, quantity: 1 }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] border-2 border-red-50 shadow-sm space-y-4">
      <h3 className="text-[10px] font-black text-red-500 flex items-center uppercase tracking-widest"><AlertOctagon size={18} className="mr-2" /> Penalidade</h3>
      
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        <button type="button" onClick={() => setFormData({...formData, type: ErrorType.ERRO_PACOTE})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.type === ErrorType.ERRO_PACOTE ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}>Erro (-50)</button>
        <button type="button" onClick={() => setFormData({...formData, type: ErrorType.FALTA})} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.type === ErrorType.FALTA ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}>Falta (-10)</button>
      </div>

      <select value={formData.collaboratorId} onChange={(e) => setFormData(prev => ({...prev, collaboratorId: e.target.value}))} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 text-slate-900 font-bold outline-none appearance-none">
        <option value="">Colaborador...</option>
        {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))} className="p-4 rounded-xl bg-slate-50 font-bold text-xs" />
        <input type="number" value={formData.quantity} onChange={(e) => setFormData(prev => ({...prev, quantity: parseInt(e.target.value) || 0}))} className="p-4 rounded-xl bg-slate-50 font-bold outline-none" />
      </div>
      <button type="submit" className="w-full bg-red-600 text-white py-4.5 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Registrar Penalidade</button>
    </form>
  );
};

const CollaboratorForm = ({ onAdd }: { onAdd: (name: string, type: CollaboratorType) => void }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<CollaboratorType>(CollaboratorType.CLT);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), type);
    setName('');
  };
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadastro</h3>
      <input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 font-bold outline-none" />
      <div className="flex space-x-2">
        {Object.values(CollaboratorType).map(t => (
          <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${type === t ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>{t}</button>
        ))}
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white py-4.5 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Adicionar Membro</button>
    </form>
  );
};

const handleReset = () => {
  if (window.confirm('Apagar tudo localmente?')) { localStorage.clear(); window.location.reload(); }
};

export default App;
