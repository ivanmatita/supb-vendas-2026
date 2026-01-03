
import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, Purchase, InvoiceStatus, PurchaseType, InvoiceType, Client, WorkProject, PurchaseItem } from '../types';
import { formatCurrency, formatDate, exportToExcel, generateId } from '../utils';
import { printDocument, downloadPDF } from "../utils/exportUtils";
import { supabase } from '../services/supabaseClient';
import { 
  Search, Download, Printer, Filter, BriefcaseBusiness, ArrowUpRight, 
  ArrowDownLeft, FileText, Eye, Building2, Layout, PlusCircle, Calendar, 
  User, Hash, MapPin, Phone, Info, X, CheckCircle, Save, RefreshCw, Calculator,
  Clock, Link, List, ChevronRight, BarChart3, TrendingUp, AlertCircle, Edit3, Loader2
} from 'lucide-react';

interface WorkspaceProps {
  invoices: Invoice[];
  purchases: Purchase[];
  clients: Client[];
  onViewInvoice: (invoice: Invoice) => void;
  onRefreshPurchases?: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ invoices, purchases, clients, onViewInvoice, onRefreshPurchases }) => {
  const [mode, setMode] = useState<'MOVEMENTS' | 'PROJECTS'>('PROJECTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Work Projects State
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<WorkProject | null>(null);
  const [newProject, setNewProject] = useState<Partial<WorkProject>>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    personnelPerDay: 0,
    totalPersonnel: 0,
    contact: '',
    observations: '',
    description: ''
  });

  const [selectedProjectForView, setSelectedProjectForView] = useState<WorkProject | null>(null);
  const [projectReportSearch, setProjectReportSearch] = useState('');

  useEffect(() => {
      loadProjects();
  }, []);

  async function loadProjects() {
      setIsLoadingProjects(true);
      try {
          const { data, error } = await supabase
            .from('locais_trabalho')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (data) {
              const mapped: WorkProject[] = data.map(d => ({
                  id: d.id,
                  clientId: d.cliente_id,
                  clientName: clients.find(c => c.id === d.cliente_id)?.name || 'Cliente Cloud',
                  startDate: d.data_abertura,
                  endDate: d.data_encerramento,
                  title: d.titulo,
                  code: d.codigo,
                  personnelPerDay: d.efectivos_dia,
                  totalPersonnel: d.total_efectivos,
                  location: d.localizacao,
                  description: d.descricao,
                  contact: d.contacto,
                  observations: d.observacoes
              }));
              setProjects(mapped);
          }
      } catch (err) { console.error("Erro ao carregar obras:", err); } finally { setIsLoadingProjects(false); }
  }

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.clientId || !newProject.title || !newProject.location) return alert("Preencha os campos obrigatórios (*)");

    setIsSaving(true);
    try {
        const payload: any = {
            cliente_id: newProject.clientId,
            data_abertura: newProject.startDate,
            data_encerramento: newProject.endDate,
            titulo: newProject.title,
            codigo: newProject.code || `OBR-${Math.floor(Math.random() * 1000)}`,
            efectivos_dia: newProject.personnelPerDay,
            total_efectivos: newProject.totalPersonnel,
            localizacao: newProject.location,
            descricao: newProject.description,
            contacto: newProject.contact,
            observacoes: newProject.observations,
            empresa_id: '00000000-0000-0000-0000-000000000001'
        };

        const { error } = editingProject 
            ? await supabase.from('locais_trabalho').update(payload).eq('id', editingProject.id)
            : await supabase.from('locais_trabalho').insert(payload);

        if (error) throw error;

        setShowProjectForm(false);
        setEditingProject(null);
        setNewProject({ startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], personnelPerDay: 0, totalPersonnel: 0 });
        loadProjects();
        alert(editingProject ? "Projecto atualizado!" : "Projecto registado com sucesso!");
    } catch (err: any) { alert(`Erro ao gravar na Cloud: ${err.message}`); } finally { setIsSaving(false); }
  };

  const combinedMovements = useMemo(() => {
    const rows: any[] = [];
    invoices.forEach(inv => {
        const project = projects.find(p => p.id === inv.workLocationId);
        rows.push({
            id: inv.id,
            date: inv.date,
            time: inv.time || '--:--',
            type: inv.type,
            docNumber: inv.number,
            entity: inv.clientName,
            value: inv.total,
            operator: inv.operatorName || 'Admin',
            reference: inv.sourceInvoiceId || '---',
            projectTitle: project?.title || 'Obra Geral',
            source: inv
        });
    });
    return rows.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, projects]);

  const handleEditClick = (p: WorkProject) => {
      setEditingProject(p);
      setNewProject({
          clientId: p.clientId,
          startDate: p.startDate,
          endDate: p.endDate,
          title: p.title,
          code: p.code,
          personnelPerDay: p.personnelPerDay,
          totalPersonnel: p.totalPersonnel,
          location: p.location,
          description: p.description,
          contact: p.contact,
          observations: p.observations
      });
      setShowProjectForm(true);
  };

  const renderProjectReport = () => {
    if (!selectedProjectForView) return null;
    const projectInvoices = invoices.filter(i => i.workLocationId === selectedProjectForView.id && i.isCertified && i.status !== 'Anulado');
    const projectPurchases = purchases.filter(p => p.workLocationId === selectedProjectForView.id && p.status !== 'CANCELLED');
    
    const filteredInvoices = projectInvoices.filter(i => 
        i.number.toLowerCase().includes(projectReportSearch.toLowerCase()) || 
        i.clientName.toLowerCase().includes(projectReportSearch.toLowerCase())
    );

    const totalInvoiced = projectInvoices.reduce((acc, i) => acc + i.total, 0);
    const totalCosts = projectPurchases.reduce((acc, p) => acc + p.total, 0);

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-800 animate-in zoom-in-95">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0 border-b-4 border-indigo-600">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black uppercase shadow-xl">{selectedProjectForView.code?.substring(0,2)}</div>
                        <div>
                           <h2 className="text-xl font-black uppercase tracking-tighter">Relatório do Local de Trabalho</h2>
                           <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">{selectedProjectForView.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadPDF('project-report-area', `Relatorio_Obra_${selectedProjectForView.code}.pdf`)} className="p-3 bg-white/10 hover:bg-blue-600 rounded-xl transition text-white border border-white/5"><Download size={20}/></button>
                        <button onClick={() => printDocument('project-report-area')} className="p-3 bg-white/10 hover:bg-blue-600 rounded-xl transition text-white border border-white/5"><Printer size={20}/></button>
                        <button onClick={() => setSelectedProjectForView(null)} className="p-3 bg-white/10 hover:bg-red-600 rounded-xl transition border border-white/5 ml-2"><X size={20}/></button>
                    </div>
                </div>

                <div className="bg-white p-4 border-b border-slate-100 flex gap-4 print:hidden">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
                        <input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold transition-all" placeholder="Pesquisar faturas desta obra..." value={projectReportSearch} onChange={e => setProjectReportSearch(e.target.value)}/>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-slate-50 custom-scrollbar" id="project-report-area">
                    <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                            <div className="space-y-6">
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><Info size={16} className="text-indigo-600"/> Dados Cadastrais</h3>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">Referência</p><p className="font-black text-indigo-700">{selectedProjectForView.code}</p></div>
                                    <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase">Abertura</p><p className="font-bold">{formatDate(selectedProjectForView.startDate)}</p></div>
                                    <div className="space-y-1 col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase">Localização</p><div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/><span className="font-bold">{selectedProjectForView.location}</span></div></div>
                                    <div className="space-y-1 col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase">Cliente</p><div className="flex items-center gap-2"><Building2 size={14} className="text-slate-400"/><span className="font-black uppercase">{selectedProjectForView.clientName}</span></div></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><BarChart3 size={16} className="text-emerald-600"/> Balanço Financeiro</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                        <span className="text-[10px] font-black text-emerald-800 uppercase">Total Faturado</span>
                                        <span className="text-xl font-black text-emerald-700">{formatCurrency(totalInvoiced)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                                        <span className="text-[10px] font-black text-red-800 uppercase">Total de Custos</span>
                                        <span className="text-xl font-black text-red-700">{formatCurrency(totalCosts)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-slate-900 rounded-2xl text-white shadow-xl">
                                        <span className="text-[10px] font-black text-blue-400 uppercase">Margem Bruta</span>
                                        <span className="text-xl font-black">{formatCurrency(totalInvoiced - totalCosts)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><FileText size={16} className="text-blue-600"/> Documentos de Venda Associados</h3>
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-[10px] border-collapse">
                                    <thead className="bg-slate-50 font-black uppercase text-slate-500 border-b">
                                        <tr><th className="p-4">Data</th><th className="p-4">Documento</th><th className="p-4">Tipo</th><th className="p-4 text-right">Valor Total</th><th className="p-4 text-center">Estado</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredInvoices.map(inv => (
                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                <td className="p-4 font-mono">{formatDate(inv.date)}</td>
                                                <td className="p-4 font-black text-blue-700">{inv.number}</td>
                                                <td className="p-4 font-bold">{inv.type}</td>
                                                <td className="p-4 text-right font-black">{formatCurrency(inv.total)}</td>
                                                <td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">CERTIFICADO</span></td>
                                            </tr>
                                        ))}
                                        {filteredInvoices.length === 0 && (
                                            <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase italic">Sem documentos para exibir</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
        {renderProjectReport()}
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
                 <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BriefcaseBusiness/> Local de Trabalho</h1>
                 <p className="text-xs text-slate-500">Monitorização de obras e serviços (Sincronizado Cloud)</p>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => setMode(mode === 'MOVEMENTS' ? 'PROJECTS' : 'MOVEMENTS')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${mode === 'PROJECTS' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                    <Layout size={18}/> {mode === 'PROJECTS' ? 'Ver Movimentos Gerais' : 'Ver Gestão de Obras'}
                 </button>
                 <button onClick={() => exportToExcel(projects, "Workspace")} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700"><Download size={16}/> Exportar</button>
            </div>
        </div>

        {mode === 'MOVEMENTS' ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-green-500 shadow-lg flex justify-between items-center">
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase">Faturação em Obras</p><h3 className="text-2xl font-black text-green-600">{formatCurrency(invoices.reduce((a,b)=>a+b.total,0))}</h3></div>
                        <ArrowUpRight className="text-green-200" size={48}/>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-red-500 shadow-lg flex justify-between items-center">
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase">Custos Alocados</p><h3 className="text-2xl font-black text-red-600">{formatCurrency(purchases.reduce((a,b)=>a+b.total,0))}</h3></div>
                        <ArrowDownLeft className="text-red-200" size={48}/>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-blue-500 shadow-lg flex justify-between items-center">
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase">Projectos Cloud</p><h3 className="text-2xl font-black text-blue-600">{projects.length}</h3></div>
                        <Building2 className="text-blue-200" size={48}/>
                    </div>
                </div>
                
                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-slate-900 text-white p-4 font-bold uppercase text-xs tracking-widest">Movimentos e Documentos de Obras/Serviços</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px] border-collapse">
                            <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-tighter border-b">
                                <tr>
                                    <th className="p-3 border-r">Data / Hora</th>
                                    <th className="p-3 border-r">Local de Trabalho</th>
                                    <th className="p-3 border-r">Documento</th>
                                    <th className="p-3 border-r">Cliente</th>
                                    <th className="p-3 border-r">Operador</th>
                                    <th className="p-3 border-r text-right">Valor</th>
                                    <th className="p-3 border-r">Ref. Associada</th>
                                    <th className="p-3 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {combinedMovements.map(m => (
                                    <tr key={m.id} className="hover:bg-blue-50 transition-colors group">
                                        <td className="p-3 border-r font-medium">
                                            <div className="flex items-center gap-2"><Calendar size={12} className="text-slate-400"/> {formatDate(m.date)}</div>
                                            <div className="flex items-center gap-2 mt-1"><Clock size={12} className="text-slate-400"/> {m.time}</div>
                                        </td>
                                        <td className="p-3 border-r font-black text-blue-800 uppercase">{m.projectTitle}</td>
                                        <td className="p-3 border-r">
                                            <div className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black w-fit mb-1">{m.type}</div>
                                            <div className="font-bold text-slate-700">{m.docNumber}</div>
                                        </td>
                                        <td className="p-3 border-r font-medium">{m.entity}</td>
                                        <td className="p-3 border-r">
                                            <div className="flex items-center gap-1"><User size={12} className="text-slate-400"/> {m.operator}</div>
                                        </td>
                                        <td className="p-3 border-r text-right font-black text-green-700 bg-slate-50/50">{formatCurrency(m.value)}</td>
                                        <td className="p-3 border-r text-slate-500 italic">
                                            <div className="flex items-center gap-1"><Link size={10}/> {m.reference}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => onViewInvoice(m.source)} className="p-1.5 bg-white border rounded-lg hover:text-blue-600 transition shadow-sm"><Eye size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {combinedMovements.length === 0 && (
                                    <tr><td colSpan={8} className="p-20 text-center text-slate-300 font-black uppercase tracking-[5px] bg-slate-50 italic">Sem movimentos registados em obras</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-xl gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl shadow-inner">
                            <MapPin size={32}/>
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 uppercase tracking-tighter text-xl">Gestão de Obras e Serviços</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controlo de faturamento e custos por localidade</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-slate-50 px-6 py-2 rounded-2xl border flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Total Obras</span>
                            <span className="text-lg font-black text-slate-800">{projects.length}</span>
                        </div>
                        <button onClick={() => { setEditingProject(null); setShowProjectForm(true); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 shadow-2xl transition transform active:scale-95 text-sm uppercase tracking-widest">
                            <PlusCircle size={20}/> Registar Obra
                        </button>
                    </div>
                </div>

                <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2 font-black uppercase text-xs tracking-[3px]">
                           <List size={16} className="text-blue-400"/> Listagem de Projectos Ativos
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2 text-slate-500" size={14}/>
                            <input className="pl-10 pr-4 py-1.5 bg-slate-800 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-white" placeholder="Filtrar por nome ou COD..."/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b-2">
                                <tr>
                                    <th className="p-5 border-r">Identificação</th>
                                    <th className="p-5 border-r">Cliente Beneficiário</th>
                                    <th className="p-5 border-r">Vigência</th>
                                    <th className="p-5 border-r text-center">Efectivos</th>
                                    <th className="p-5 border-r">Localização</th>
                                    <th className="p-5 text-right">Faturação Relacionada</th>
                                    <th className="p-5 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projects.map(p => {
                                    const projInvoices = invoices.filter(inv => inv.workLocationId === p.id && inv.isCertified && inv.status !== 'Anulado');
                                    const totalInvoiced = projInvoices.reduce((acc, i) => acc + i.total, 0);

                                    return (
                                        <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="p-5 border-r">
                                                <div className="text-[10px] font-mono text-indigo-500 font-bold mb-1">{p.code}</div>
                                                <div className="font-black text-slate-800 uppercase tracking-tight">{p.title}</div>
                                            </td>
                                            <td className="p-5 border-r">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={14} className="text-slate-400"/>
                                                    <span className="font-bold text-slate-600">{p.clientName}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 border-r font-medium">
                                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                    <Calendar size={12}/> <span className="text-[10px] uppercase font-bold">Desde:</span> {formatDate(p.startDate)}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar size={12}/> <span className="text-[10px] uppercase font-bold">Até:</span> {p.endDate ? formatDate(p.endDate) : 'Indefinido'}
                                                </div>
                                            </td>
                                            <td className="p-5 border-r text-center">
                                                <div className="inline-flex flex-col bg-slate-50 border px-3 py-1 rounded-xl">
                                                    <span className="text-lg font-black text-slate-800">{p.totalPersonnel}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Pessoal</span>
                                                </div>
                                            </td>
                                            <td className="p-5 border-r">
                                                <div className="flex items-start gap-2 max-w-[200px]">
                                                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/>
                                                    <span className="text-[10px] font-medium text-slate-600 leading-relaxed">{p.location}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right border-r bg-slate-50/30">
                                                <div className="font-black text-emerald-600 text-lg leading-none">{formatCurrency(totalInvoiced)}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Docs Certificados: {projInvoices.length}</div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => setSelectedProjectForView(p)} className="p-2 bg-white border rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all hover:scale-110"><Eye size={16}/></button>
                                                    <button onClick={() => handleEditClick(p)} className="p-2 bg-white border rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all hover:scale-110"><Edit3 size={16}/></button>
                                                    <button className="p-2 bg-white border rounded-xl text-slate-400 hover:text-emerald-600 shadow-sm transition-all hover:scale-110"><BarChart3 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {projects.length === 0 && !isLoadingProjects && (
                                    <tr><td colSpan={7} className="p-32 text-center text-slate-300 font-black uppercase tracking-[8px] bg-slate-50 italic text-xl opacity-30">Sem registos de obras na cloud</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {showProjectForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center sticky top-0 z-10 shadow-lg">
                        <h3 className="font-black text-xl flex items-center gap-3 tracking-tight uppercase">
                            {editingProject ? <Edit3 size={28} className="text-blue-400"/> : <PlusCircle size={28} className="text-indigo-400"/>} 
                            {editingProject ? 'EDITAR LOCAL DE TRABALHO' : 'REGISTAR NOVO LOCAL DE TRABALHO'}
                        </h3>
                        <button onClick={() => { setShowProjectForm(false); setEditingProject(null); }} className="hover:bg-red-600 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleSaveProject} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-sans">
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">(*) Seleccionar Cliente Beneficiário</label>
                            <select required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-600 font-black text-slate-700 transition" value={newProject.clientId || ''} onChange={e => setNewProject({...newProject, clientId: e.target.value})}>
                                <option value="">Seleccione um Cliente...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data de Abertura</label>
                            <input type="date" required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl font-black focus:border-indigo-600 outline-none" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Prevista Encerramento</label>
                            <input type="date" className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl font-black focus:border-indigo-600 outline-none" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})}/>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">(*) Titulo Oficial da Obra / Serviço</label>
                            <input required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-600 font-black text-slate-800 text-base" placeholder="Ex: Reforma Escritório Talatona" value={newProject.title || ''} onChange={e => setNewProject({...newProject, title: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">COD de Identificação (Opcional)</label>
                            <input className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none font-mono focus:border-indigo-600" placeholder="Ex: OBR-2025-001" value={newProject.code || ''} onChange={e => setNewProject({...newProject, code: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efectivos p/ Dia</label>
                                <input type="number" className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl text-center font-black focus:border-indigo-600 outline-none" value={newProject.personnelPerDay || ''} onChange={e => setNewProject({...newProject, personnelPerDay: Number(e.target.value)})}/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Efectivos</label>
                                <input type="number" className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl text-center font-black focus:border-indigo-600 outline-none" value={newProject.totalPersonnel || ''} onChange={e => setNewProject({...newProject, totalPersonnel: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">(*) Localização Física / Endereço</label>
                            <input required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-600 font-black focus:bg-white transition" placeholder="Endereço oficial da prestação de serviço" value={newProject.location || ''} onChange={e => setNewProject({...newProject, location: e.target.value})}/>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição Detalhada do Projecto</label>
                            <textarea className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl h-28 resize-none outline-none focus:border-indigo-600 font-medium focus:bg-white transition" placeholder="Notas sobre o serviço e âmbito do trabalho..." value={newProject.description || ''} onChange={e => setNewProject({...newProject, description: e.target.value})}></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contacto Directo no Local</label>
                            <input className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl font-mono focus:border-indigo-600 outline-none" placeholder="(+244) 9XX XXX XXX" value={newProject.contact || ''} onChange={e => setNewProject({...newProject, contact: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Observações Adicionais</label>
                            <input className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl focus:border-indigo-600 outline-none" placeholder="Notas de campo e alertas" value={newProject.observations || ''} onChange={e => setNewProject({...newProject, observations: e.target.value})}/>
                        </div>
                        <div className="col-span-2 flex justify-end gap-4 mt-8 pt-8 border-t-4 border-slate-100">
                            <button type="button" onClick={() => { setShowProjectForm(false); setEditingProject(null); }} className="px-10 py-4 border-4 border-slate-200 rounded-3xl font-black text-slate-400 uppercase tracking-widest text-[10px] hover:bg-slate-50">CANCELAR</button>
                            <button type="submit" disabled={isSaving} className="px-16 py-4 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl flex items-center gap-3 transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[10px]">
                                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} {editingProject ? 'ATUALIZAR ARQUIVO CLOUD' : 'GRAVAR NO ARQUIVO CLOUD'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Workspace;
