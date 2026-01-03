
import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Purchase, Company, WorkLocation, PurchaseType } from '../types';
import { generateId, formatCurrency, formatDate } from '../utils';
import { supabase } from '../services/supabaseClient';
import { printDocument, downloadPDF, downloadExcel } from "../utils/exportUtils";
import { 
  Plus, Search, MapPin, Phone, Mail, ArrowLeft, Save, X, Printer, Download, Filter, 
  UserPlus, History, Calendar, Database, RefreshCw, Loader2, Globe, Building2, 
  Landmark, ShieldCheck, Edit2, AlertTriangle, FileSpreadsheet, DollarSign, ChevronRight
} from 'lucide-react';

interface SupplierListProps {
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void;
  purchases?: Purchase[];
  workLocations?: WorkLocation[];
}

const SupplierList: React.FC<SupplierListProps> = ({ suppliers, onSaveSupplier, purchases = [], workLocations = [] }) => {
  const [view, setView] = useState<'LIST' | 'FORM' | 'CONTA_CORRENTE'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dbSuppliers, setDbSuppliers] = useState<Supplier[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros Conta Corrente
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDocType, setFilterDocType] = useState('ALL');

  useEffect(() => {
    carregarFornecedoresSupabase();
  }, []);

  async function carregarFornecedoresSupabase() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        setErrorMsg(`Erro ao buscar cloud: ${error.message}`);
      } else if (data) {
        const mapped: Supplier[] = data.map(s => ({
          id: s.id,
          name: s.nome,
          vatNumber: s.contribuinte,
          email: s.email || '',
          phone: s.telefone || '',
          address: s.morada || '',
          city: s.localidade || '',
          province: s.provincia || '',
          postalCode: s.codigo_postal || '',
          municipality: s.municipio || '',
          country: s.pais || 'Angola',
          webPage: s.web_page || '',
          inssNumber: s.num_inss || '',
          bankInitials: s.siglas_banco || '',
          iban: s.iban || '',
          swift: s.swift || '',
          supplierType: s.tipo_cliente || '',
          accountBalance: 0,
          transactions: []
        }));
        setDbSuppliers(mapped);
      }
    } catch (err: any) {
      setErrorMsg(`Erro inesperado: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const allDisplaySuppliers = useMemo(() => {
    const combined = [...dbSuppliers, ...suppliers];
    const uniqueMap = new Map();
    combined.forEach(s => {
        if (!uniqueMap.has(s.id)) uniqueMap.set(s.id, s);
    });
    const unique = Array.from(uniqueMap.values());
    const sTerm = searchTerm.toLowerCase();
    
    return unique.filter(s => {
      const name = (s.name || '').toLowerCase();
      const nif = (s.vatNumber || '');
      return name.includes(sTerm) || nif.includes(sTerm);
    });
  }, [dbSuppliers, suppliers, searchTerm]);

  const supplierMovements = useMemo(() => {
      if (!selectedSupplier) return [];
      
      const movements = purchases.filter(pur => {
          if (pur.supplierId !== selectedSupplier.id) return false;
          
          const d = new Date(pur.date);
          if (filterStartDate && d < new Date(filterStartDate)) return false;
          if (filterEndDate && d > new Date(filterEndDate)) return false;
          if (filterDocType !== 'ALL' && pur.type !== filterDocType) return false;

          return true;
      }).map(pur => {
          const amount = pur.total;
          // Nas compras: Factura-Recibo e Factura são Débitos de Fornecedor (Aumento de dívida do ponto de vista do passivo, mas aqui mostramos fluxos)
          // No ERP, Compra = Crédito p/ Fornecedor (Aumenta o que devemos). Pagamento = Débito p/ Fornecedor.
          const isCredit = [PurchaseType.FT, PurchaseType.FR, PurchaseType.VD].includes(pur.type);
          
          return {
              id: pur.id,
              date: pur.date,
              docNo: pur.documentNumber,
              type: pur.type,
              description: pur.type === PurchaseType.FT ? 'Factura Recebida' : 
                          pur.type === PurchaseType.FR ? 'Factura Recibo Recebida' :
                          pur.type === PurchaseType.NC ? 'Nota de Crédito Fornecedor' : 
                          pur.type === PurchaseType.REC ? 'Recibo de Pagamento Efetuado' : pur.type,
              debit: !isCredit ? amount : 0,
              credit: isCredit ? amount : 0,
              project: workLocations.find(w => w.id === pur.workLocationId)?.name || 'Obra Generica'
          };
      }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBalance = selectedSupplier.accountBalance || 0;
      return movements.map(m => {
          runningBalance = runningBalance + m.credit - m.debit;
          return { ...m, balance: runningBalance };
      });
  }, [selectedSupplier, purchases, filterStartDate, filterEndDate, filterDocType, workLocations]);

  const totalPeriodCredit = supplierMovements.reduce((a,b) => a+b.credit, 0);
  const totalPeriodDebit = supplierMovements.reduce((a,b) => a+b.debit, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.vatNumber) return alert('Nome e Contribuinte são obrigatórios');

    setIsLoading(true);
    const payload = {
      contribuinte: formData.vatNumber,
      nome: formData.name,
      morada: formData.address,
      localidade: formData.city,
      codigo_postal: formData.postalCode,
      provincia: formData.province,
      municipio: formData.municipality,
      pais: 'Angola',
      telefone: formData.phone,
      email: formData.email,
      web_page: formData.webPage,
      num_inss: formData.inssNumber,
      siglas_banco: formData.bankInitials,
      iban: formData.iban,
      swift: formData.swift,
      tipo_cliente: formData.supplierType,
      empresa_id: '00000000-0000-0000-0000-000000000001'
    };

    try {
      const { error } = await supabase
        .from('fornecedores')
        .upsert(formData.id ? { ...payload, id: formData.id } : payload);

      if (error) throw error;
      await carregarFornecedoresSupabase();
      setView('LIST');
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContaCorrente = () => {
    if (!selectedSupplier) return null;
    return (
        <div className="p-6 bg-white min-h-screen animate-in fade-in flex flex-col" id="supExtractArea">
            <div className="flex justify-between items-start mb-8 print:hidden">
                <button onClick={() => setView('LIST')} className="flex items-center gap-2 text-slate-500 hover:text-purple-600 font-bold px-3 py-1.5 rounded-lg transition-colors border">
                    <ArrowLeft size={16}/> Voltar
                </button>
                <div className="flex gap-2">
                    <button onClick={() => downloadExcel("supTable", `CC_FORN_${selectedSupplier.name}`)} className="p-2 bg-slate-100 hover:bg-green-100 rounded-full text-slate-600 transition-colors border shadow-sm">
                        <span className="text-[10px] font-black mr-1">XLSX</span>
                        <FileSpreadsheet size={16}/>
                    </button>
                    <button className="p-2 bg-slate-100 hover:bg-blue-100 rounded-full text-slate-600 transition-colors border shadow-sm">
                        <span className="text-[10px] font-black mr-1">JAN</span>
                        <Calendar size={16}/>
                    </button>
                    <button className="p-2 bg-slate-100 hover:bg-red-100 rounded-full text-slate-600 transition-colors border shadow-sm">
                        <span className="text-[10px] font-black mr-1">$</span>
                        <DollarSign size={16}/>
                    </button>
                    <button onClick={() => printDocument("supExtractArea")} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors border shadow-sm">
                        <Printer size={16}/>
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-start mb-10 text-[10px] font-sans">
                <div className="space-y-1">
                    <div className="text-slate-400">Data de Emissão</div>
                    <div className="font-bold">{new Date().toLocaleString('pt-AO')}</div>
                    <div className="font-bold uppercase mt-2">ADMINISTRADOR DO SISTEMA</div>
                    <div className="mt-4">
                        <h2 className="text-lg font-black text-slate-800 uppercase">Extrato Fornecedor</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest">CC-1 {selectedSupplier.name} {formatDate(new Date().toISOString()).replace(/ /g, '')}</p>
                    </div>
                </div>

                <div className="text-right space-y-1">
                    <div className="text-slate-400">Nº Contribuinte</div>
                    <div className="font-black text-sm">{selectedSupplier.vatNumber}</div>
                    <div className="text-slate-500 mt-2">Descrição do extrato Conta Corrente</div>
                    <div className="text-slate-500 font-bold">Período: Início a {formatDate(new Date().toISOString())}</div>
                    <div className="mt-4 text-[9px] text-slate-400 uppercase">Cod. 1</div>
                </div>

                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 w-full max-w-[350px] relative">
                    <div className="absolute top-0 right-0 h-4 w-48 bg-gradient-to-l from-slate-300 to-transparent opacity-20"></div>
                    <h3 className="font-black text-sm text-slate-800 uppercase border-b border-slate-300 pb-1 mb-2">{selectedSupplier.name}</h3>
                    <div className="space-y-0.5 text-slate-600 font-bold uppercase">
                        <p>{selectedSupplier.address || 'LUANDA'}</p>
                        <p>{selectedSupplier.city || 'LUANDA'}</p>
                        <p>{selectedSupplier.postalCode || '0000-000'}</p>
                        <p>{selectedSupplier.province || 'LUANDA'}</p>
                        <p>{selectedSupplier.country || 'AO'}</p>
                    </div>
                </div>
            </div>

            {/* Filtros de Operação */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-wrap gap-4 items-end print:hidden">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Filtrar por Documento</label>
                    <select className="w-full border p-2 rounded bg-white font-bold text-xs" value={filterDocType} onChange={e => setFilterDocType(e.target.value)}>
                        <option value="ALL">Todos os Documentos</option>
                        {Object.values(PurchaseType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Início</label>
                    <input type="date" className="border p-2 rounded bg-white text-xs font-bold" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}/>
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Fim</label>
                    <input type="date" className="border p-2 rounded bg-white text-xs font-bold" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}/>
                </div>
            </div>

            <div className="border-t border-slate-300 pt-1 flex justify-between items-end mb-4 font-bold text-[10px] text-slate-600">
                <div className="flex gap-16">
                    <span className="uppercase tracking-widest">Conta Corrente de Fornecedor</span>
                    <span className="text-slate-900">AOA</span>
                </div>
                <div className="flex gap-16">
                    <span>[ AOA ]</span>
                    <span className="uppercase flex gap-4">Saldo Acumulado Geral <span className="text-slate-900 font-black text-sm">{formatCurrency(selectedSupplier.accountBalance).replace('Kz','')}</span></span>
                </div>
            </div>

            <div className="flex-1 overflow-auto border-t border-slate-300">
                <table className="w-full text-left text-[9px] border-collapse" id="supTable">
                    <thead className="text-slate-500 font-bold uppercase border-b-2 border-slate-900">
                        <tr>
                            <th className="py-2 pr-4">Data Valor<br/>Data Documento</th>
                            <th className="py-2 pr-4">File Interno<br/>File Cliente</th>
                            <th className="py-2 pr-4">URN<br/>EndService</th>
                            <th className="py-2 pr-4">Doc Nº<br/>OriginatingOn</th>
                            <th className="py-2 pr-4">Descricao<br/>Doc. Suporte</th>
                            <th className="py-2 text-right w-32">Débito</th>
                            <th className="py-2 text-right w-32">Credito</th>
                            <th className="py-2 text-right w-32">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                        <tr className="bg-white font-bold text-slate-700">
                            <td colSpan={5} className="py-3 text-right pr-4 uppercase tracking-widest text-[8px] font-black">Acumulados do Periodo ────</td>
                            <td className="py-3 text-right">{formatCurrency(totalPeriodDebit).replace('Kz','')}</td>
                            <td className="py-3 text-right">{formatCurrency(totalPeriodCredit).replace('Kz','')}</td>
                            <td className="py-3 text-right">0,00</td>
                        </tr>

                        {supplierMovements.map((m, idx) => (
                            <tr key={idx} className="hover:bg-purple-50/30 transition-colors group">
                                <td className="py-2 font-black text-slate-800 border-l-8 border-slate-300 pl-2 group-hover:border-purple-500">
                                    {formatDate(m.date).replace(/ /g, '-')}<br/>
                                    {formatDate(m.date).replace(/ /g, '-')}
                                </td>
                                <td className="py-2 font-bold text-slate-700">
                                    {m.project}<br/>
                                    ---
                                </td>
                                <td className="py-2 text-slate-400">
                                    ---<br/>
                                    ---
                                </td>
                                <td className="py-2 font-black text-purple-900">
                                    {m.docNo}<br/>
                                    ---
                                </td>
                                <td className="py-2 font-black text-slate-700 uppercase">
                                    {m.description}<br/>
                                    ---
                                </td>
                                <td className="py-2 text-right text-emerald-600 font-black">{m.debit > 0 ? formatCurrency(m.debit).replace('Kz','') : '0,00'}</td>
                                <td className="py-2 text-right text-red-600 font-black">{m.credit > 0 ? formatCurrency(m.credit).replace('Kz','') : '0,00'}</td>
                                <td className="py-2 text-right font-black text-slate-900 bg-slate-50/50">{formatCurrency(m.balance).replace('Kz','')}</td>
                            </tr>
                        ))}

                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                            <td colSpan={5} className="py-2 px-2 uppercase text-[8px] font-black">Saldo Inicial</td>
                            <td className="py-2"></td>
                            <td className="py-2"></td>
                            <td className="py-2 text-right font-black">{formatCurrency(selectedSupplier.accountBalance || 0).replace('Kz','')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 text-[8px] text-slate-400 font-mono flex justify-between items-center">
                <span>Processado por computador | Licença ERP IMATEC V.2.0</span>
                <span className="font-bold">Página 1 de 1</span>
            </div>
        </div>
    );
  };

  const renderForm = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
             <div className="bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
                <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20}/> Cadastro Completo de Fornecedor</h3>
                <button onClick={() => setView('LIST')} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
             </div>
             <form onSubmit={handleSubmit}>
                 <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="col-span-3 border-b pb-2 mb-2">
                           <h4 className="font-bold text-blue-700 flex items-center gap-2"><Building2 size={16}/> Identificação e Contacto</h4>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Contribuinte (NIF) *</label>
                          <input required className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" value={formData.vatNumber || ''} onChange={e => setFormData({...formData, vatNumber: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Nome do Fornecedor *</label>
                          <input required className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-bold" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                          <input type="email" className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">WebPage</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" placeholder="www.site.com" value={formData.webPage || ''} onChange={e => setFormData({...formData, webPage: e.target.value})} />
                      </div>

                      <div className="col-span-3 border-b pb-2 mt-4">
                           <h4 className="font-bold text-blue-700 flex items-center gap-2"><MapPin size={16}/> Localização</h4>
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Morada</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Localidade</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Município</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.municipality || ''} onChange={e => setFormData({...formData, municipality: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Província</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.province || ''} onChange={e => setFormData({...formData, province: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Código Postal</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.postalCode || ''} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">País</label>
                          <input readOnly className="w-full border-b-2 border-slate-200 bg-slate-100 p-2 outline-none text-slate-500" value="Angola" />
                      </div>

                      <div className="col-span-3 border-b pb-2 mt-4">
                           <h4 className="font-bold text-blue-700 flex items-center gap-2"><Landmark size={16}/> Dados Financeiros e Fiscais</h4>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Nº de INSS</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" value={formData.inssNumber || ''} onChange={e => setFormData({...formData, inssNumber: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Siglas do Banco</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" placeholder="Ex: BAI, BFA" value={formData.bankInitials || ''} onChange={e => setFormData({...formData, bankInitials: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">IBAN</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" placeholder="AO06..." value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Cod SWIFT</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" value={formData.swift || ''} onChange={e => setFormData({...formData, swift: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Cliente/Fornecedor</label>
                          <select className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.supplierType} onChange={e => setFormData({...formData, supplierType: e.target.value})}>
                              <option value="Fornecedor Não Grupo Nacionais">Fornecedor Não Grupo Nacionais</option>
                              <option value="nao grupo estrangeiros">nao grupo estrangeiros</option>
                              <option value="Associados">Associados</option>
                          </select>
                      </div>
                 </div>
                 <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                      <button type="button" onClick={() => setView('LIST')} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white">Cancelar</button>
                      <button type="submit" disabled={isLoading} className="px-10 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:opacity-50">
                          {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                          Salvar na Cloud
                      </button>
                 </div>
             </form>
        </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300 h-full">
        {view === 'LIST' && (
            <>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">Gestão de Fornecedores {isLoading && <RefreshCw size={16} className="animate-spin text-blue-500"/>}</h1>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Database size={12}/> Base de Dados Cloud</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={carregarFornecedoresSupabase} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border text-sm font-bold flex items-center gap-2"><RefreshCw size={16}/> Sincronizar</button>
                        <button onClick={() => { setFormData({ country: 'Angola', supplierType: 'Fornecedor Não Grupo Nacionais' }); setView('FORM'); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-bold shadow-lg"><UserPlus size={16}/> Novo Fornecedor Cloud</button>
                    </div>
                </div>
                {errorMsg && <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 flex items-center gap-2 text-sm"><AlertTriangle size={16}/> {errorMsg}</div>}
                <div className="bg-white p-3 border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm"><Search className="text-slate-400" size={18}/><input className="flex-1 outline-none text-sm" placeholder="Pesquisar por nome ou NIF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex-1">
                    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-700 text-white uppercase font-bold"><tr><th className="p-3 w-10">#</th><th className="p-3">Nome do Fornecedor</th><th className="p-3">NIF</th><th className="p-3">Tipo</th><th className="p-3 text-right">Saldo Devedor</th><th className="p-3 text-center">Ação</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">{allDisplaySuppliers.map((sup, idx) => {
                        const currentBal = (sup.accountBalance || 0) + purchases.filter(p => p.supplierId === sup.id && p.status !== 'CANCELLED').reduce((acc, p) => {
                            const isCredit = [PurchaseType.FT, PurchaseType.FR, PurchaseType.VD].includes(p.type);
                            return acc + (isCredit ? p.total : -p.total);
                        }, 0);
                        return (
                        <tr key={sup.id} className="hover:bg-blue-50 transition-colors"><td className="p-3 text-slate-400">#{idx + 1}</td><td className="p-3 font-bold">{sup.name}</td><td className="p-3 font-mono">{sup.vatNumber}</td><td className="p-3 text-[10px] uppercase font-bold text-slate-500">{sup.supplierType}</td><td className={`p-3 text-right font-black ${currentBal > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(currentBal)}</td><td className="p-3 text-center"><button onClick={() => { setSelectedSupplier(sup); setView('CONTA_CORRENTE'); }} className="text-purple-600 font-bold hover:underline bg-purple-50 px-2 py-1 rounded">Ver Conta Corrente</button></td></tr>
                    )})}</tbody></table></div>
                </div>
            </>
        )}
        {view === 'FORM' && renderForm()}
        {view === 'CONTA_CORRENTE' && renderContaCorrente()}
    </div>
  );
};

export default SupplierList;
