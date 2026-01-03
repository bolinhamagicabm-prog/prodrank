
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
  CloudOff,
  RefreshCw,
  Settings,
  Copy,
  AlertTriangle,
  Wifi,
  WifiOff,
  Save,
  CheckCircle2
} from 'lucide-react';
import { 
  Collaborator, 
  CollaboratorType, 
  ProductionLog, 
  ProductionError, 
  Interval
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [errors, setErrors] = useState<ProductionError[]>([]);
  
  const [syncUrl, setSyncUrl] = useState<string>(localStorage.getItem('prodrank_sync_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('prodrank_last_sync'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs para manter os dados mais recentes acessíveis em callbacks de sync
  const dataRef = useRef({ collaborators, logs, errors });
  const isInitialMount = useRef(true);

  // Sincroniza a Ref sempre que o estado mudar
  useEffect(() => {
    dataRef.current = { collaborators, logs, errors };
    
    // Salva localmente
    localStorage.setItem('prodrank_collaborators', JSON.stringify(collaborators));
    localStorage.setItem('prodrank_logs', JSON.stringify(logs));
    localStorage.setItem('prodrank_errors', JSON.stringify(errors));
    
    // Marca que há mudanças se não for o carregamento inicial
    if (!isInitialMount.current) {
      setHasUnsavedChanges(true);
    }
  }, [collaborators, logs, errors]);

  const handleCloudSync = useCallback(async (mode: 'push' | 'pull', customData?: any) => {
    if (!syncUrl || !syncUrl.includes('/exec')) {
      if (syncUrl.includes('/dev')) setSyncError('Erro: Use o link de IMPLANTAÇÃO (/exec)');
      return;
    }
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      // Usa os dados passados ou o valor atual da Ref (garante dados frescos)
      const currentData = customData || dataRef.current;
      
      const payload = {
        mode,
        data: currentData,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(syncUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (e) {
        if (text.includes('Google Accounts')) {
          throw new Error('Acesso negado. Configure "Quem pode acessar" como "Qualquer pessoa" no Google.');
        }
        throw new Error('Erro na resposta do Google. Refaça a implantação.');
      }

      if (result.status === 'success') {
        if (mode === 'pull') {
          const cloudData = result.data;
          if (cloudData) {
            if (Array.isArray(cloudData.collaborators)) setCollaborators(cloudData.collaborators);
            if (Array.isArray(cloudData.logs)) setLogs(cloudData.logs);
            if (Array.isArray(cloudData.errors)) setErrors(cloudData.errors);
          }
        }
        const now = new Date().toLocaleTimeString();
        setLastSync(now);
        setHasUnsavedChanges(false);
        setSyncError(null);
        localStorage.setItem('prodrank_last_sync', now);
      } else {
        throw new Error(result.message || 'Erro no script');
      }
    } catch (err: any) {
      console.error('Sync Error:', err);
      setSyncError(err.message || 'Erro de conexão');
    } finally {
      setIsSyncing(false);
    }
  }, [syncUrl]);

  // Carregamento inicial
  useEffect(() => {
    const savedCols = localStorage.getItem('prodrank_collaborators');
    const savedLogs = localStorage.getItem('prodrank_logs');
    const savedErrors = localStorage.getItem('prodrank_errors');
    
    if (savedCols) setCollaborators(JSON.parse(savedCols));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedErrors) setErrors(JSON.parse(savedErrors));
    
    // Pull inicial apenas se tiver URL
    if (syncUrl && syncUrl.includes('/exec')) {
      handleCloudSync('pull');
    }
    
    setTimeout(() => { isInitialMount.current = false; }, 1000);
  }, []);

  // Auto-push para mudanças normais (logs, erros)
  useEffect(() => {
    if (isInitialMount.current || !hasUnsavedChanges) return;
    
    const timer = setTimeout(() => {
      handleCloudSync('push');
    }, 2000); 
    
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, handleCloudSync]);

  const addCollaborator = (name: string, type: CollaboratorType) => {
    const newCol: Collaborator = { id: generateId(), name, type };
    setCollaborators(prev => [...prev, newCol]);
  };

  const executeDeleteCollaborator = async (id: string) => {
    // 1. Atualiza o estado local imediatamente
    const newCols = collaborators.filter(c => c.id !== id);
    const newLogs = logs.filter(l => l.collaboratorId !== id);
    const newErrors = errors.filter(e => e.collaboratorId !== id);
    
    setCollaborators(newCols);
    setLogs(newLogs);
    setErrors(newErrors);
    setConfirmDeleteId(null);

    // 2. Força o push imediato para a nuvem para evitar que o "pull" subsequente traga o dado antigo
    handleCloudSync('push', {
      collaborators: newCols,
      logs: newLogs,
      errors: newErrors
    });
  };

  const allRankings = useMemo(() => {
    return generateRankings(
      collaborators, 
      logs.filter(l => l.date.startsWith(selectedMonth)), 
      errors.filter(e => e.date.startsWith(selectedMonth))
    );
  }, [collaborators, logs, errors, selectedMonth]);

  const filteredRankings = useMemo(() => {
    return allRankings.filter(r => r.type === rankingCategory);
  }, [allRankings, rankingCategory]);

  const removeLog = (id: string) => {
    if (window.confirm('Excluir este registro?')) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleReset = () => {
    if (window.confirm('Isso apagará TUDO localmente. Continuar?')) {
      setCollaborators([]);
      setLogs([]);
      setErrors([]);
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl relative overflow-hidden text-slate-900">
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center z-20 shadow-lg border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg transform -rotate-3">P</div>
          <div className="flex flex-col -space-y-1">
            <span className="font-black text-lg tracking-tighter">PRODRANK</span>
            <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase">Enterprise Sync</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {syncUrl && (
            <div className="flex flex-col items-end mr-1">
              <div className="flex items-center space-x-1">
                {isSyncing ? (
                  <RefreshCw size={12} className="text-blue-400 animate-spin" />
                ) : syncError ? (
                  <WifiOff size={12} className="text-red-500" />
                ) : hasUnsavedChanges ? (
                  <Save size={12} className="text-amber-400 animate-pulse" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                )}
                <span className={`text-[9px] font-black uppercase ${
                  syncError ? 'text-red-500' : 
                  isSyncing ? 'text-blue-400' : 
                  hasUnsavedChanges ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {isSyncing ? 'Salvando...' : syncError ? 'Erro Sync' : hasUnsavedChanges ? 'Pendente' : 'Nuvem OK'}
                </span>
              </div>
              {lastSync && <span className="text-[7px] text-slate-500 font-bold">{lastSync}</span>}
            </div>
          )}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 bg-slate-50/50">
        {activeTab === 'ranking' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="🏆 Rankings" subtitle="Produtividade mensal por categoria" />
            <div className="px-4 space-y-4">
              <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-bold px-4 py-2.5 text-slate-700 outline-none"
                />
              </div>

              <div className="flex p-1.5 bg-slate-200/50 rounded-2xl border border-slate-100 shadow-inner">
                <button
                  onClick={() => setRankingCategory(CollaboratorType.CLT)}
                  className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${
                    rankingCategory === CollaboratorType.CLT ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' : 'text-slate-500'
                  }`}
                >
                  <Briefcase size={14} className="mr-2" /> CLT
                </button>
                <button
                  onClick={() => setRankingCategory(CollaboratorType.ESTAGIARIO)}
                  className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${
                    rankingCategory === CollaboratorType.ESTAGIARIO ? 'bg-white text-emerald-600 shadow-md transform scale-[1.02]' : 'text-slate-500'
                  }`}
                >
                  <GraduationCap size={14} className="mr-2" /> ESTAGIÁRIOS
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden divide-y divide-slate-100 shadow-xl shadow-slate-200/50">
                {filteredRankings.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                    <div className="p-4 bg-slate-50 rounded-full mb-4"><BarChart3 size={32} className="opacity-20" /></div>
                    <p className="text-xs font-bold uppercase tracking-widest">Sem dados este mês</p>
                  </div>
                ) : (
                  filteredRankings.map((rank, idx) => (
                    <div key={rank.collaboratorId} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
                          idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 tracking-tight">{rank.name}</p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{rank.netPackages} pkts líq.</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-xl leading-none ${rankingCategory === CollaboratorType.CLT ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {rank.minutesPerPackage === Infinity ? '---' : rank.minutesPerPackage.toFixed(2)}
                        </p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">min/pkt</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="animate-in slide-in-from-right duration-500">
            <SectionHeader title="Lançamentos" subtitle="Registe a produção do dia" />
            <div className="px-4 space-y-6 pb-8">
              <ProductionForm 
                collaborators={collaborators} 
                onSave={(log) => setLogs(prev => [...prev, { ...log, id: generateId() }])} 
              />
              <ErrorForm 
                collaborators={collaborators}
                onSave={(err) => setErrors(prev => [...prev, { ...err, id: generateId() }])}
              />
            </div>
          </div>
        )}

        {activeTab === 'collaborators' && (
          <div className="animate-in slide-in-from-left duration-500">
            <SectionHeader title="Equipe" subtitle="Gestão de usuários" />
            <div className="px-4 space-y-6">
              <CollaboratorForm onAdd={addCollaborator} />
              <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden divide-y divide-slate-100 shadow-lg">
                {collaborators.length === 0 ? (
                  <div className="p-10 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum colaborador cadastrado</div>
                ) : (
                  collaborators.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between min-h-[80px]">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-500 shadow-inner"><Users size={20} /></div>
                        <div>
                          <p className="font-black text-slate-800 tracking-tight">{c.name}</p>
                          <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest ${c.type === CollaboratorType.CLT ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.type}</span>
                        </div>
                      </div>
                      {confirmDeleteId === c.id ? (
                        <div className="flex items-center space-x-1 animate-in zoom-in duration-200">
                          <button onClick={() => setConfirmDeleteId(null)} className="p-2.5 bg-slate-100 rounded-xl text-slate-500"><X size={18}/></button>
                          <button 
                            onClick={() => executeDeleteCollaborator(c.id)} 
                            className="bg-red-600 text-white text-[10px] px-4 py-2.5 rounded-xl font-black uppercase shadow-lg shadow-red-200 active:scale-95 transition-transform"
                          >
                            Excluir
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(c.id)} className="p-4 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={22}/></button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-500">
            <SectionHeader title="Log" subtitle="Histórico de registros" />
            <div className="px-4 space-y-4">
               <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                 <h3 className="text-xs font-black text-slate-400 mb-5 flex items-center uppercase tracking-[0.2em]"><ClipboardList size={14} className="mr-2" /> Produção Recente</h3>
                 <div className="space-y-3">
                    {logs.length === 0 ? <p className="text-[10px] text-slate-400 font-bold uppercase py-4 text-center">Nenhum registro</p> : 
                    logs.slice().reverse().slice(0, 12).map(log => {
                      const col = collaborators.find(c => c.id === log.collaboratorId);
                      return (
                        <div key={log.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all">
                          <div>
                            <p className="font-bold text-slate-800 text-sm tracking-tight">{col?.name || 'Ex-Colaborador'}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{log.date} • {log.clockIn} às {log.clockOut}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-black text-blue-600 text-sm mr-2">{log.packages} PKTS</span>
                            <button onClick={() => removeLog(log.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      );
                    })}
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-300 p-4 space-y-6 pb-24">
            <SectionHeader title="Sincronização" subtitle="Nuvem Google Sheets" />
            
            <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500 text-white rounded-[1.2rem] shadow-lg shadow-blue-200"><Cloud size={24} /></div>
                <div>
                   <h3 className="font-black text-lg text-slate-800 leading-none">Status da Nuvem</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dados centralizados</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">URL de Implantação (/exec)</label>
                   {syncUrl.includes('/dev') && (
                     <span className="flex items-center text-[10px] text-red-600 font-black bg-red-100 px-3 py-1 rounded-full animate-pulse">
                       <AlertTriangle size={10} className="mr-1" /> LINK INVÁLIDO
                     </span>
                   )}
                </div>
                <input 
                  type="url" 
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={syncUrl}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setSyncUrl(val);
                    localStorage.setItem('prodrank_sync_url', val);
                  }}
                  className={`w-full px-5 py-4 text-sm font-bold border-2 rounded-2xl outline-none transition-all shadow-inner ${
                    syncUrl.includes('/dev') ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-100 focus:border-blue-500 bg-slate-50 text-slate-700'
                  }`}
                />
                {syncError && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start space-x-3">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-red-800 font-bold leading-tight">{syncError}</p>
                      <p className="text-[9px] text-red-500 mt-1 font-medium italic">Verifique as permissões do script.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => handleCloudSync('pull')}
                  disabled={!syncUrl || isSyncing}
                  className="bg-slate-900 text-white py-4.5 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-30 transition-all shadow-xl shadow-slate-200"
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  <span>Baixar Nuvem</span>
                </button>
                <button 
                  onClick={() => handleCloudSync('push')}
                  disabled={!syncUrl || isSyncing}
                  className="bg-blue-600 text-white py-4.5 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-30 transition-all shadow-xl shadow-blue-200"
                >
                  <Cloud size={14} />
                  <span>Subir Nuvem</span>
                </button>
              </div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-100 rounded-[2.5rem] p-6 space-y-4">
              <h4 className="text-xs font-black text-orange-800 flex items-center uppercase tracking-widest leading-none">
                <AlertTriangle size={16} className="mr-2" /> Atenção: Erro de Permissão?
              </h4>
              <div className="text-[11px] text-orange-800/80 space-y-3 font-bold leading-relaxed">
                <p>Se as exclusões estiverem "voltando", certifique-se de que o script foi atualizado e implantado corretamente:</p>
                <ul className="space-y-2">
                  <li className="flex items-start"><span className="w-5 h-5 bg-orange-200 rounded flex items-center justify-center text-[10px] mr-2 mt-0.5">1</span> Cole o código abaixo no Apps Script.</li>
                  <li className="flex items-start"><span className="w-5 h-5 bg-orange-200 rounded flex items-center justify-center text-[10px] mr-2 mt-0.5">2</span> <strong>Implantar</strong> &gt; <strong>Nova Implantação</strong>.
.</li>
                  <li className="flex items-start"><span className="w-5 h-5 bg-orange-200 rounded flex items-center justify-center text-[10px] mr-2 mt-0.5">3</span> Acesso: <strong>Qualquer Pessoa</strong>.</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                  alert('Código copiado!');
                }}
                className="w-full bg-white text-orange-600 py-4 border-2 border-orange-200 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all"
              >
                <Copy size={16} />
                <span>Copiar Código do Script</span>
              </button>
            </div>

            <button onClick={handleReset} className="w-full text-slate-400 text-[9px] font-black py-6 border-2 border-dashed border-slate-200 rounded-[2rem] uppercase tracking-[0.3em] active:bg-red-50 active:text-red-500 active:border-red-200 transition-all">Resetar App (Local)</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center px-4 py-3 pb-safe shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] z-50">
        <TabButton active={activeTab === 'ranking'} icon={BarChart3} label="Ranking" onClick={() => setActiveTab('ranking')} />
        <TabButton active={activeTab === 'input'} icon={Plus} label="Lançar" onClick={() => setActiveTab('input')} />
        <TabButton active={activeTab === 'collaborators'} icon={Users} label="Equipe" onClick={() => setActiveTab('collaborators')} />
        <TabButton active={activeTab === 'history'} icon={History} label="Histórico" onClick={() => setActiveTab('history')} />
      </nav>
    </div>
  );
};

// CÓDIGO DO APPS SCRIPT (VERSÃO 2.2 - PERSISTÊNCIA REFORÇADA)
const APPS_SCRIPT_CODE = `
/**
 * PRODRANK SYNC SCRIPT V2.2
 */

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var payload;
  
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJsonResponse({status: 'error', message: 'Payload inválido'});
  }
  
  var lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000); // Espera até 30s por segurança
    
    if (payload.mode === 'push') {
      props.setProperty('prodrank_db', JSON.stringify(payload.data));
      return createJsonResponse({status: 'success', message: 'Salvo com sucesso'});
    } else {
      var dataStr = props.getProperty('prodrank_db');
      var data = dataStr ? JSON.parse(dataStr) : { collaborators: [], logs: [], errors: [] };
      return createJsonResponse({status: 'success', data: data});
    }
  } catch (err) {
    return createJsonResponse({status: 'error', message: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return doPost({postData: {contents: JSON.stringify({mode: 'pull'})}});
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

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
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <h3 className="text-[10px] font-black text-slate-400 mb-5 flex items-center uppercase tracking-[0.2em]"><UserPlus size={16} className="mr-2 text-blue-500" /> Cadastro de Equipe</h3>
      <div className="space-y-4">
        <input type="text" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none bg-slate-50 text-slate-900 font-bold shadow-inner transition-all" />
        <div className="flex space-x-2">
          {Object.values(CollaboratorType).map(t => (
            <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${type === t ? 'bg-slate-900 text-white shadow-xl transform scale-[1.02]' : 'bg-slate-100 text-slate-400 border-2 border-transparent'}`}>{t}</button>
          ))}
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-95 transition-all">Adicionar Membro</button>
      </div>
    </form>
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collaboratorId) return alert('Selecione um colaborador');
    onSave(formData);
    alert('Produção salva!');
    setFormData(prev => ({ ...prev, packages: 0 }));
  };
  return (
    <form onSubmit={handleSubmit} className="bg-blue-600 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-200">
      <h3 className="text-[10px] font-black text-blue-200 mb-5 flex items-center uppercase tracking-[0.2em]"><ClipboardList size={18} className="mr-2" /> Lançar Pacotes</h3>
      <div className="space-y-4">
        <select value={formData.collaboratorId} onChange={(e) => setFormData(prev => ({...prev, collaboratorId: e.target.value}))} className="w-full px-5 py-4 rounded-2xl bg-blue-700/50 border-2 border-blue-400/30 text-white font-bold outline-none focus:border-white transition-all appearance-none">
          <option value="" className="text-slate-900">Selecionar...</option>
          {collaborators.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))} className="px-5 py-4 rounded-2xl bg-blue-700/50 border-2 border-blue-400/30 text-white font-bold text-xs outline-none" />
          <input type="number" placeholder="Pacotes" value={formData.packages || ''} onChange={(e) => setFormData(prev => ({...prev, packages: parseInt(e.target.value) || 0}))} className="px-5 py-4 rounded-2xl bg-blue-700/50 border-2 border-blue-400/30 text-white font-bold outline-none placeholder:text-blue-300" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[8px] text-blue-200 font-black uppercase tracking-[0.2em] ml-2">Entrada</label><input type="time" value={formData.clockIn} onChange={(e) => setFormData(prev => ({...prev, clockIn: e.target.value}))} className="w-full px-4 py-3 rounded-xl bg-blue-700/50 border-2 border-blue-400/30 text-white font-bold outline-none mt-1" /></div>
          <div><label className="text-[8px] text-blue-200 font-black uppercase tracking-[0.2em] ml-2">Saída</label><input type="time" value={formData.clockOut} onChange={(e) => setFormData(prev => ({...prev, clockOut: e.target.value}))} className="w-full px-4 py-3 rounded-xl bg-blue-700/50 border-2 border-blue-400/30 text-white font-bold outline-none mt-1" /></div>
        </div>
        <button type="submit" className="w-full bg-white text-blue-600 py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Registrar Hoje</button>
      </div>
    </form>
  );
};

const ErrorForm = ({ collaborators, onSave }: { collaborators: Collaborator[], onSave: (err: Omit<ProductionError, 'id'>) => void }) => {
  const [formData, setFormData] = useState({ collaboratorId: '', date: new Date().toISOString().slice(0, 10), quantity: 1 });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collaboratorId) return alert('Selecione um colaborador');
    onSave(formData);
    alert('Erro registrado!');
    setFormData(prev => ({ ...prev, quantity: 1 }));
  };
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] border-2 border-red-50 shadow-sm">
      <h3 className="text-[10px] font-black text-red-400 mb-5 flex items-center uppercase tracking-[0.2em]"><AlertCircle size={18} className="mr-2" /> Erro Detectado</h3>
      <div className="space-y-4">
        <select value={formData.collaboratorId} onChange={(e) => setFormData(prev => ({...prev, collaboratorId: e.target.value}))} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 text-slate-900 font-bold outline-none focus:border-red-200 transition-all">
          <option value="">Colaborador...</option>
          {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))} className="px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 text-slate-900 font-bold text-xs outline-none" />
          <input type="number" placeholder="Qtd Erros" value={formData.quantity || ''} onChange={(e) => setFormData(prev => ({...prev, quantity: parseInt(e.target.value) || 0}))} className="px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-50 text-slate-900 font-bold outline-none" />
        </div>
        <button type="submit" className="w-full bg-red-600 text-white py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-100 active:scale-95 transition-all">Lançar Penalidade</button>
      </div>
    </form>
  );
};

export default App;
