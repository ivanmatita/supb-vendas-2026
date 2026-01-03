
import React, { useState, useEffect } from 'react';
import { DocumentSeries, User, ViewState, WorkLocation, CashRegister } from '../types';
import { generateId, formatDate, formatCurrency } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  Users, FileText, Plus, Trash2, CheckSquare, Square, Save, Pencil, 
  Upload, MapPin, CreditCard, X, UserPlus, Building, DollarSign, 
  LayoutDashboard, Image as ImageIcon, RefreshCw, Calendar, 
  User as UserIcon, Info, Database, Shield, Lock, Phone, Mail, Check, ShieldCheck,
  MoreVertical, Key, Settings as SettingsIcon, History, FileBadge,
  CheckCircle, Ban, AlertCircle
} from 'lucide-react';

interface SettingsProps {
  series: DocumentSeries[];
  onSaveSeries: (series: DocumentSeries) => void;
  onEditSeries?: (series: DocumentSeries) => void;
  users: User[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  workLocations: WorkLocation[];
  onSaveWorkLocation: (wl: WorkLocation) => void;
  onDeleteWorkLocation: (id: string) => void;
  cashRegisters: CashRegister[];
  onSaveCashRegister: (cr: CashRegister) => void;
  onDeleteCashRegister: (id: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  series, onSaveSeries, onEditSeries,
  users: localUsers, onSaveUser, onDeleteUser,
  workLocations, onSaveWorkLocation, onDeleteWorkLocation,
  cashRegisters, onSaveCashRegister, onDeleteCashRegister
}) => {
  const [activeTab, setActiveTab] = useState<'SERIES' | 'USERS' | 'LOCATIONS' | 'CASH_REGISTERS'>('SERIES');
  const [isLoading, setIsLoading] = useState(false);
  const [cloudUsers, setCloudUsers] = useState<any[]>([]);
  const [openOpcMenuId, setOpenOpcMenuId] = useState<string | null>(null);
  
  // Modal states
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // Series Form State
  const [newSeries, setNewSeries] = useState<Partial<DocumentSeries>>({
      name: '',
      code: '',
      type: 'NORMAL',
      year: new Date().getFullYear(),
      isActive: true,
      allowedUserIds: [],
      bankDetails: '',
      footerText: ''
  });

  // User Form State
  const [newUser, setNewUser] = useState({
      id: '',
      nome: '',
      utilizador: '',
      email: '',
      telefone: '',
      password: '123',
      validade_tipo: 'Ilimitado' as 'Ilimitado' | 'Data',
      validade_data: '',
      isRobot: false,
      termsAccepted: false,
      permissoes: [] as ViewState[]
  });

  const availablePermissions: {id: ViewState, label: string}[] = [
      { id: 'DASHBOARD', label: 'Painel de Bordo' },
      { id: 'WORKSPACE', label: 'Local de Trabalho' },
      { id: 'SECRETARIA_LIST', label: 'Secretaria Beta' },
      { id: 'POS', label: 'Frente de Caixa (POS)' },
      { id: 'INVOICES', label: 'Vendas / Faturas' },
      { id: 'PURCHASES', label: 'Compras / Fornecedores' },
      { id: 'STOCK', label: 'Gestão de Stocks' },
      { id: 'FINANCE_GROUP', label: 'Financeiro e Caixa' },
      { id: 'ACCOUNTING_GROUP', label: 'Contabilidade e IVA' },
      { id: 'HR', label: 'Recursos Humanos' },
      { id: 'SETTINGS', label: 'Definições do Sistema' }
  ];

  // Carregar utilizadores sempre ao montar para garantir dados no seletor de séries
  useEffect(() => {
      fetchCloudUsers();
  }, []);

  useEffect(() => {
      if (activeTab === 'USERS') fetchCloudUsers();
  }, [activeTab]);

  async function fetchCloudUsers() {
      setIsLoading(true);
      try {
          const { data, error } = await supabase.from('utilizadores').select('*').order('created_at', { ascending: false });
          if (error) {
              console.error("Erro ao buscar usuários da cloud:", error.message);
          } else if (data) {
              setCloudUsers(data);
          }
      } catch (err) { 
          console.error("Falha de conexão Supabase:", err); 
      } finally { 
          setIsLoading(false); 
      }
  }

  const handleSaveSeries = () => {
      if (!newSeries.name || !newSeries.code) return alert("Nome e Código da Série são obrigatórios.");
      if (newSeries.allowedUserIds?.length === 0) return alert("Deve selecionar pelo menos um utilizador para esta série.");

      const seriesToSave: DocumentSeries = {
          id: newSeries.id || generateId(),
          name: newSeries.name!,
          code: newSeries.code!.toUpperCase(),
          type: (newSeries.type as any) || 'NORMAL',
          year: newSeries.year || new Date().getFullYear(),
          currentSequence: newSeries.currentSequence || 1,
          sequences: newSeries.sequences || {},
          isActive: newSeries.isActive ?? true,
          allowedUserIds: newSeries.allowedUserIds || [],
          bankDetails: newSeries.bankDetails || '',
          footerText: newSeries.footerText || ''
      };

      if (newSeries.id) {
          onEditSeries?.(seriesToSave);
      } else {
          onSaveSeries(seriesToSave);
      }
      setIsSeriesModalOpen(false);
      alert("Série fiscal registada com sucesso!");
  };

  const handleSaveUserCloud = async () => {
      if (!newUser.nome || !newUser.utilizador || !newUser.email) return alert("Preencha Nome, Utilizador e Email.");
      if (!newUser.id && !newUser.isRobot) return alert("Por favor, prove que não é um robot.");
      if (!newUser.id && !newUser.termsAccepted) return alert("Deve aceitar os termos e privacidade.");

      setIsLoading(true);
      try {
          let companyId = '00000000-0000-0000-0000-000000000001';
          const { data: companies } = await supabase.from('empresas').select('id').limit(1);
          if (companies && companies.length > 0) companyId = companies[0].id;

          const payload = {
              nome: newUser.nome,
              email: newUser.email,
              utilizador: newUser.utilizador,
              telefone: newUser.telefone,
              validade_acesso: newUser.validade_tipo === 'Ilimitado' ? null : newUser.validade_data,
              permissoes: newUser.permissoes,
              empresa_id: companyId 
          };

          const { error } = newUser.id 
            ? await supabase.from('utilizadores').update(payload).eq('id', newUser.id)
            : await supabase.from('utilizadores').insert({ ...payload, password: '123' });
          
          if (error) {
              if (error.code === '23505') throw new Error("E-mail ou Utilizador já existe.");
              if (error.message.includes("schema cache")) throw new Error("Erro de Cache. Tente novamente em 5 segundos.");
              throw error;
          }
          
          setIsUserModalOpen(false);
          await fetchCloudUsers();
          alert(newUser.id ? "Utilizador atualizado!" : "Utilizador registado na Cloud!");
          resetUserForm();
      } catch (err: any) { 
          alert("Erro: " + (err.message || "Falha na conexão.")); 
      } finally { 
          setIsLoading(false); 
      }
  };

  const handleResetPassword = async (userId: string) => {
      if (confirm("Deseja redefinir a password deste utilizador para '123'?")) {
          setIsLoading(true);
          try {
              const { error } = await supabase
                .from('utilizadores')
                .update({ password: '123' })
                .eq('id', userId);
              
              if (error) throw error;
              alert("Password redefinida com sucesso para '123'!");
          } catch (err: any) {
              alert("Erro ao redefinir password: " + err.message);
          } finally {
              setIsLoading(false);
          }
      }
  };

  const resetUserForm = () => {
      setNewUser({
          id: '', nome: '', utilizador: '', email: '', telefone: '', password: '123',
          validade_tipo: 'Ilimitado', validade_data: '', isRobot: false, termsAccepted: false, permissoes: []
      });
  };

  const handleEditUser = (user: any) => {
      setNewUser({
          id: user.id,
          nome: user.nome,
          utilizador: user.utilizador,
          email: user.email,
          telefone: user.telefone || '',
          password: user.password,
          validade_tipo: user.validade_acesso ? 'Data' : 'Ilimitado',
          validade_data: user.validade_acesso || '',
          isRobot: true,
          termsAccepted: true,
          permissoes: user.permissoes || []
      });
      setOpenOpcMenuId(null);
      setIsUserModalOpen(true);
  };

  const togglePermission = (id: ViewState) => {
      setNewUser(prev => ({
          ...prev,
          permissoes: prev.permissoes.includes(id) 
            ? prev.permissoes.filter(p => p !== id) 
            : [...prev.permissoes, id]
      }));
  };

  const toggleUserInSeries = (userId: string) => {
      setNewSeries(prev => ({
          ...prev,
          allowedUserIds: prev.allowedUserIds?.includes(userId)
            ? prev.allowedUserIds.filter(id => id !== userId)
            : [...(prev.allowedUserIds || []), userId]
      }));
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
                 <h1 className="text-xl font-bold text-slate-800">Definições Gerais</h1>
                 <p className="text-xs text-slate-500">Configuração do sistema e parâmetros</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                {['SERIES', 'USERS', 'LOCATIONS', 'CASH_REGISTERS'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)} 
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap text-sm border ${activeTab === tab ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {tab === 'SERIES' ? 'Séries Fiscais' : tab === 'USERS' ? 'Utilizadores' : tab === 'LOCATIONS' ? 'Locais' : 'Caixas'}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'SERIES' && (
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="p-4 flex justify-between items-center bg-slate-100 border-b border-slate-200">
                    <div className="flex flex-col">
                        <h3 className="font-bold text-sm text-slate-700 uppercase flex items-center gap-2"><FileText size={14}/> SÉRIES DE FATURAÇÃO</h3>
                        <p className="text-[10px] text-slate-400 italic uppercase">Gestão de Sequências e Permissões (AGT Angola)</p>
                    </div>
                    <button onClick={() => { setNewSeries({ type: 'NORMAL', year: new Date().getFullYear(), allowedUserIds: [], isActive: true }); setIsSeriesModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-blue-700 text-sm shadow-md">
                        <Plus size={16}/> Criar Nova Série
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-700 text-white font-bold uppercase border-b">
                            <tr>
                                <th className="p-3">Série / Código</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Ano</th>
                                <th className="p-3">Utilizadores</th>
                                <th className="p-3 text-center">Estado</th>
                                <th className="p-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {series.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{s.name}</div>
                                        <div className="font-mono text-blue-600 font-bold">{s.code}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${s.type === 'NORMAL' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {s.type === 'NORMAL' ? 'Normal' : 'Recuperação Manual'}
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold">{s.year}</td>
                                    <td className="p-3">
                                        <div className="flex -space-x-2">
                                            {s.allowedUserIds.slice(0, 3).map(uid => (
                                                <div key={uid} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold" title={localUsers.find(u => u.id === uid)?.name}>
                                                    {localUsers.find(u => u.id === uid)?.name?.charAt(0)}
                                                </div>
                                            ))}
                                            {s.allowedUserIds.length > 3 && (
                                                <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                                                    +{s.allowedUserIds.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        {s.isActive ? <CheckCircle size={16} className="text-emerald-500 mx-auto"/> : <Ban size={16} className="text-slate-300 mx-auto"/>}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => { setNewSeries(s); setIsSeriesModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL: NOVA/EDITAR SÉRIE */}
        {isSeriesModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                        <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
                            <FileBadge className="text-blue-400"/> {newSeries.id ? 'Editar Série Fiscal' : 'Registar Série Automática (AGT)'}
                        </h3>
                        <button onClick={() => setIsSeriesModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Nome da Série (ex: Série Geral 2025)</label>
                                <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-500 outline-none" value={newSeries.name || ''} onChange={e => setNewSeries({...newSeries, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Código Identificação (ex: A, B, POS)</label>
                                <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-black text-blue-700 uppercase" value={newSeries.code || ''} onChange={e => setNewSeries({...newSeries, code: e.target.value})} maxLength={5} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Série</label>
                                <select className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold" value={newSeries.type} onChange={e => setNewSeries({...newSeries, type: e.target.value as any})}>
                                    <option value="NORMAL">Série Normal (Auto)</option>
                                    <option value="MANUAL">Recuperação Documentos Manuais</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                                <Users size={14} className="text-blue-600"/> Utilizadores Autorizados (Informações da Gestão de Utilizadores)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {cloudUsers.length > 0 ? cloudUsers.map(u => (
                                    <label key={u.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${newSeries.allowedUserIds?.includes(u.id) ? 'bg-white border-blue-500 shadow-sm' : 'bg-transparent border-slate-200 hover:border-blue-200'}`} onClick={() => toggleUserInSeries(u.id)}>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-800 uppercase">{u.nome}</span>
                                            <span className="text-[9px] font-bold text-blue-600">@{u.utilizador}</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${newSeries.allowedUserIds?.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                            {newSeries.allowedUserIds?.includes(u.id) && <Check size={12} className="text-white" />}
                                        </div>
                                    </label>
                                )) : (
                                    <div className="col-span-2 py-8 text-center text-slate-400 italic text-[10px]">A carregar utilizadores do sistema...</div>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-start gap-3">
                            <AlertCircle className="text-orange-600 mt-0.5" size={18}/>
                            <p className="text-[9px] text-orange-800 font-bold leading-relaxed uppercase">
                                ATENÇÃO: As séries fiscais não podem ser eliminadas após a emissão do primeiro documento certificado. A numeração será sequencial e ininterrupta.
                            </p>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-900 flex justify-end gap-3 border-t-4 border-slate-800">
                        <button onClick={() => setIsSeriesModalOpen(false)} className="px-10 py-4 border-2 border-slate-700 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-800 transition">Cancelar</button>
                        <button onClick={handleSaveSeries} className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl hover:bg-blue-500 transition transform active:scale-95 flex items-center gap-2">
                            <Save size={16}/> REGISTAR SÉRIE
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'USERS' && (
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="p-4 flex justify-between items-center bg-slate-100 border-b border-slate-200">
                    <div className="flex flex-col">
                        <h3 className="font-bold text-sm text-slate-700 uppercase flex items-center gap-2"><Users size={14}/> GESTÃO DE UTILIZADORES</h3>
                        <p className="text-[10px] text-slate-400 italic uppercase">Utilizadores do Sistema (Sincronizado Cloud)</p>
                    </div>
                    <button onClick={() => { resetUserForm(); setIsUserModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-blue-700 text-sm shadow-md">
                        <UserPlus size={16}/> Novo Utilizador
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                        <thead className="bg-slate-700 text-white font-bold uppercase border-b border-slate-800">
                            <tr>
                                <th className="p-3 w-8 text-center border-r border-slate-600">Ln</th>
                                <th className="p-3 border-r border-slate-600">Utilizador</th>
                                <th className="p-3 border-r border-slate-600">UserName</th>
                                <th className="p-3 border-r border-slate-600">Validade</th>
                                <th className="p-3 border-r border-slate-600 text-center">Admin</th>
                                <th className="p-3 border-r border-slate-600">Level</th>
                                <th className="p-3 border-r border-slate-600">Email</th>
                                <th className="p-3 border-r border-slate-600">Contacto</th>
                                <th className="p-3 border-r border-slate-600 text-center">Status</th>
                                <th className="p-3 border-r border-slate-600 text-center">MFA</th>
                                <th className="p-3 border-r border-slate-600 text-center">Log</th>
                                <th className="p-3 text-center">OPC</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {cloudUsers.map((u, idx) => (
                                <tr key={u.id} className="hover:bg-blue-50 transition-colors font-medium text-slate-700 border-b">
                                    <td className="p-3 text-center bg-slate-50 border-r border-slate-200 font-bold">{idx + 1}</td>
                                    <td className="p-3 border-r border-slate-200 font-black text-blue-700">{u.utilizador}</td>
                                    <td className="p-3 border-r border-slate-200 uppercase font-bold">{u.nome}</td>
                                    <td className="p-3 border-r border-slate-200">{u.validade_acesso ? formatDate(u.validade_acesso) : 'ILIMITADO'}</td>
                                    <td className="p-3 border-r border-slate-200 text-center">
                                        {u.permissoes?.includes('SETTINGS') ? <ShieldCheck size={14} className="mx-auto text-emerald-500"/> : <X size={14} className="mx-auto text-slate-300"/>}
                                    </td>
                                    <td className="p-3 border-r border-slate-200">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-slate-500 border border-slate-200">
                                            {u.permissoes?.length > 5 ? 'AVANÇADO' : 'OPERADOR'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-r border-slate-200 italic">{u.email}</td>
                                    <td className="p-3 border-r border-slate-200">{u.telefone || '---'}</td>
                                    <td className="p-3 border-r border-slate-200 text-center font-black">
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] ${u.status === 'Ativo' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700'}`}>
                                            ATIVO
                                        </span>
                                    </td>
                                    <td className="p-3 border-r border-slate-200 text-center">
                                        <span className="text-[8px] text-slate-400 font-bold">OFF</span>
                                    </td>
                                    <td className="p-3 border-r border-slate-200 text-center">
                                        <button className="text-blue-500 hover:text-blue-700"><History size={14} className="mx-auto"/></button>
                                    </td>
                                    <td className="p-3 text-center relative">
                                        <button 
                                            onClick={() => setOpenOpcMenuId(openOpcMenuId === u.id ? null : u.id)}
                                            className="p-1 hover:bg-slate-200 rounded transition text-slate-600"
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {openOpcMenuId === u.id && (
                                            <div className="absolute right-full top-0 mt-2 mr-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-right-2">
                                                <div className="bg-slate-900 text-white p-2 text-[9px] font-black uppercase text-center border-b border-slate-700">Ações Disponíveis</div>
                                                <button onClick={() => handleEditUser(u)} className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b">
                                                    <Pencil size={14} className="text-blue-600"/> <span className="font-bold">Editar Utilizador</span>
                                                </button>
                                                <button onClick={() => handleEditUser(u)} className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b">
                                                    <Shield size={14} className="text-indigo-600"/> <span className="font-bold">Editar Permissões</span>
                                                </button>
                                                <button onClick={() => handleResetPassword(u.id)} className="w-full text-left p-3 hover:bg-red-50 flex items-center gap-3 transition-colors text-red-600">
                                                    <Key size={14} className="text-red-500"/> <span className="font-black">Reset Password</span>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {isUserModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
                            <UserPlus className="text-blue-400"/> {newUser.id ? 'Editar Utilizador' : 'Novo Utilizador do Sistema'}
                        </h3>
                        <button onClick={() => setIsUserModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest border-b pb-2">Informações de Acesso</h4>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Nome a apresentar</label>
                                <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-500 outline-none transition" placeholder="Nome Completo" value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Utilizador</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 text-slate-400" size={18}/>
                                    <input className="w-full pl-10 p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-500 outline-none" placeholder="ID de utilizador" value={newUser.utilizador} onChange={e => setNewUser({...newUser, utilizador: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Password</label>
                                    <input className="w-full p-3 border-2 border-slate-100 bg-slate-200 rounded-xl font-black text-center" value={newUser.id ? '••••••' : '123'} disabled />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Telefone</label>
                                    <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-mono" placeholder="(+000) 000 000 000" value={newUser.telefone} onChange={e => setNewUser({...newUser, telefone: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Email</label>
                                <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold" placeholder="email@exemplo.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                            <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                                <ShieldCheck className="text-blue-600"/> Permissões de Acesso
                            </h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {availablePermissions.map(perm => (
                                    <label key={perm.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition cursor-pointer ${newUser.permissoes.includes(perm.id) ? 'bg-white border-blue-400 shadow-sm' : 'bg-transparent border-slate-200 opacity-60 hover:opacity-100'}`}>
                                        <span className={`text-xs font-black uppercase ${newUser.permissoes.includes(perm.id) ? 'text-blue-800' : 'text-slate-500'}`}>{perm.label}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${newUser.permissoes.includes(perm.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`} onClick={(e) => { e.preventDefault(); togglePermission(perm.id); }}>
                                            {newUser.permissoes.includes(perm.id) && <Check size={12} className="text-white" />}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-blue-200 text-[10px] font-bold max-w-md leading-relaxed uppercase tracking-tight">
                            A password padrão é 123. No primeiro Login, o utilizador é obrigado a redefinir a sua password.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setIsUserModalOpen(false)} className="px-10 py-4 border-2 border-slate-700 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-800 transition">CANCELAR</button>
                            <button onClick={handleSaveUserCloud} disabled={isLoading} className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl hover:bg-blue-500 transition transform active:scale-95 disabled:opacity-50 flex items-center gap-3">
                                {isLoading ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} {newUser.id ? 'ATUALIZAR DADOS' : 'GRAVAR NA CLOUD'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Settings;
