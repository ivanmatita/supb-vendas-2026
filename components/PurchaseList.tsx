import React, { useState, useMemo } from 'react';
import { Purchase, PurchaseType, Supplier } from '../types';
import { formatCurrency, formatDate, exportToExcel, generateId, generateWhatsAppLink } from '../utils';
/* Fix: Added missing ShoppingBag and DollarSign icons to lucide-react imports */
import { Search, PlusCircle, Download, Trash2, Printer, X, Upload, FileCheck, MoreHorizontal, Save, Filter, UserPlus, Calendar, Database, Eye, ShieldCheck, AlertTriangle, FileSpreadsheet, Lock, ArrowRightLeft, ListTree, Mail, MessageSquare, Edit3, Copy, User, ShoppingBag, DollarSign } from 'lucide-react';

interface PurchaseListProps {
  purchases: Purchase[];
  onDelete: (id: string) => void;
  onUpdate?: (purchase: Purchase) => void;
  onCreateNew: () => void;
  onUpload: (id: string, file: File) => void; 
  onSaveSupplier: (supplier: Supplier) => void;
}

const PurchaseList: React.FC<PurchaseListProps> = ({ purchases, onDelete, onUpdate, onCreateNew, onUpload, onSaveSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isDetailedView, setIsDetailedView] = useState(false);
  
  // Actions
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedActionPurchase, setSelectedActionPurchase] = useState<Purchase | null>(null);
  
  // Filtering
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchesSearch = 
        p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nif.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
      
      let matchesDate = true;
      if (dateStart) matchesDate = matchesDate && new Date(p.date) >= new Date(dateStart);
      if (dateEnd) matchesDate = matchesDate && new Date(p.date) <= new Date(dateEnd);

      return matchesSearch && matchesStatus && matchesDate && matchesType;
    });
  }, [purchases, searchTerm, statusFilter, typeFilter, dateStart, dateEnd]);

  // Detailed rows for "Movimento de Compras"
  const detailedMovements = useMemo(() => {
      const rows: any[] = [];
      filteredPurchases.forEach(p => {
          p.items.forEach(item => {
              rows.push({
                  id: `${p.id}-${item.id}`,
                  date: p.date,
                  docNo: p.documentNumber,
                  workLocation: p.workLocationId || 'Sede',
                  warehouse: item.warehouseId || p.warehouseId || 'N/A',
                  rubrica: item.rubrica || '71.1',
                  supplier: p.supplier,
                  serial: item.reference || '---',
                  article: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  taxRate: item.taxRate,
                  taxAmount: item.taxAmount,
                  total: item.total,
                  source: p
              });
          });
      });
      return rows;
  }, [filteredPurchases]);

  // Calculations
  const totals = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => ({
      net: acc.net + p.subtotal,
      tax: acc.tax + p.taxAmount,
      gross: acc.gross + p.total
    }), { net: 0, tax: 0, gross: 0 });
  }, [filteredPurchases]);

  const openActions = (purchase: Purchase) => {
      setSelectedActionPurchase(purchase);
      setActionModalOpen(true);
  };

  const closeActions = () => {
      setActionModalOpen(false);
      setSelectedActionPurchase(null);
  };

  const handleDelete = () => {
      if (selectedActionPurchase) {
          if (window.confirm("Tem a certeza que deseja eliminar este registo de compra?")) {
              onDelete(selectedActionPurchase.id);
              closeActions();
          }
      }
  };

  const handleEdit = () => {
      if (selectedActionPurchase && onUpdate) {
          onUpdate(selectedActionPurchase);
          closeActions();
      }
  };

  const handleWhatsApp = () => {
      if (selectedActionPurchase) {
          const msg = `Olá, gostaria de falar sobre a compra ${selectedActionPurchase.documentNumber} no valor de ${formatCurrency(selectedActionPurchase.total)}.`;
          const url = generateWhatsAppLink('244900000000', msg);
          window.open(url, '_blank');
      }
  };

  const handleEmail = () => {
      if (selectedActionPurchase) {
          const subject = `Documento de Compra ${selectedActionPurchase.documentNumber}`;
          const body = `Segue detalhes do documento ${selectedActionPurchase.documentNumber} no valor de ${formatCurrency(selectedActionPurchase.total)}.`;
          window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Documentos de Compra
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Database size={10}/> Cloud Sync
            </span>
          </h1>
          <p className="text-xs text-slate-500">Gestão de aquisições e faturas de fornecedores</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setIsDetailedView(!isDetailedView)} className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition font-bold ${isDetailedView ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 border'}`}>
                 <ListTree size={16} /> {isDetailedView ? 'Visualizar Lista' : 'Movimento de Compras'}
             </button>
             <button onClick={onCreateNew} className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition font-medium">
                 <PlusCircle size={16} /> Registar Compra
             </button>
             <button onClick={() => exportToExcel(filteredPurchases, 'Lista_Compras')} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition font-medium">
                 <Download size={16} /> Excel
             </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 flex flex-wrap items-end gap-3 text-sm">
         <div className="flex-1 min-w-[200px]">
             <label className="block text-xs font-bold text-slate-500 mb-1">Pesquisa Geral</label>
             <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Fornecedor, NIF, Doc..." 
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
         </div>
         <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
             <select className="py-1.5 px-2 border border-slate-300 rounded w-32 outline-none" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                 <option value="ALL">Todos</option>
                 {Object.values(PurchaseType).map(t => <option key={t} value={t}>{t}</option>)}
             </select>
         </div>
         <button className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 flex items-center gap-1 font-bold" onClick={() => {setSearchTerm(''); setDateStart(''); setDateEnd(''); setStatusFilter('ALL'); setTypeFilter('ALL');}}>
             <Filter size={14}/> Limpar
         </button>
      </div>

      {/* Data Grid */}
      <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {!isDetailedView ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-800 text-white font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-3 border-r border-slate-700">Data</th>
                    <th className="p-3 border-r border-slate-700">Doc Nº</th>
                    <th className="p-3 border-r border-slate-700">Fornecedor</th>
                    <th className="p-3 w-24 border-r border-slate-700">NIF</th>
                    <th className="p-3 text-right border-r border-slate-700">Imposto</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 w-10 text-center">OPC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {filteredPurchases.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">{formatDate(p.date)}</td>
                            <td className="p-3 font-bold text-blue-700">{p.documentNumber}</td>
                            <td className="p-3 font-bold uppercase">{p.supplier}</td>
                            <td className="p-3 font-mono">{p.nif}</td>
                            <td className="p-3 text-right font-mono text-red-500">{formatCurrency(p.taxAmount).replace('Kz','')}</td>
                            <td className="p-3 text-right font-black">{formatCurrency(p.total)}</td>
                            <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${p.status === 'PAID' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                                    {p.status}
                                </span>
                            </td>
                            <td className="p-3 text-center">
                                <button onClick={() => openActions(p)} className="p-1 text-slate-400 hover:text-blue-600"><MoreHorizontal size={18}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
              </table>
          ) : (
              <table className="w-full text-left text-[10px] border-collapse" id="purchaseTable">
                <thead className="bg-slate-800 text-white font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 border-r border-slate-700">Data</th>
                    <th className="px-4 py-3 border-r border-slate-700">Doc Nº</th>
                    <th className="px-4 py-3 border-r border-slate-700">Centro de Custos</th>
                    <th className="px-4 py-3 border-r border-slate-700">Armazém</th>
                    <th className="px-4 py-3 border-r border-slate-700">Rubrica PGC</th>
                    <th className="px-4 py-3 border-r border-slate-700">Fornecedor</th>
                    <th className="px-4 py-3 border-r border-slate-700">Serial Number</th>
                    <th className="px-4 py-3 border-r border-slate-700">Artigo</th>
                    <th className="px-4 py-3 text-center border-r border-slate-700">Qtd</th>
                    <th className="px-4 py-3 text-right border-r border-slate-700">V. Unitário</th>
                    <th className="px-4 py-3 text-center border-r border-slate-700">IVA %</th>
                    <th className="px-4 py-3 text-right border-r border-slate-700">Imposto</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {detailedMovements.length > 0 ? (
                    detailedMovements.map((row) => (
                        <tr key={row.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-2 font-mono text-slate-400">{formatDate(row.date)}</td>
                          <td className="px-4 py-2 font-mono text-blue-600 font-bold">{row.docNo}</td>
                          <td className="px-4 py-2 font-bold text-slate-500 uppercase">{row.workLocation}</td>
                          <td className="px-4 py-2 font-bold text-slate-500 uppercase">{row.warehouse}</td>
                          <td className="px-4 py-2 font-bold text-indigo-600">{row.rubrica}</td>
                          <td className="px-4 py-2 font-black uppercase truncate max-w-[150px]">{row.supplier}</td>
                          <td className="px-4 py-2 font-mono text-slate-400">{row.serial}</td>
                          <td className="px-4 py-2 font-bold italic truncate max-w-[200px]">{row.article}</td>
                          <td className="px-4 py-2 text-center font-black">{row.quantity}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.unitPrice).replace('Kz','')}</td>
                          <td className="px-4 py-2 text-center font-bold">{row.taxRate}%</td>
                          <td className="px-4 py-2 text-right font-mono text-red-500">{formatCurrency(row.taxAmount).replace('Kz','')}</td>
                          <td className="px-4 py-2 text-right font-black text-slate-900 bg-slate-50/50">{formatCurrency(row.total)}</td>
                        </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="px-6 py-20 text-center text-slate-300 font-black uppercase tracking-[5px] bg-slate-50 italic">
                        Nenhum registo de movimento encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          )}
        </div>
      </div>
      
       {/* Actions Modal */}
       {actionModalOpen && selectedActionPurchase && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg uppercase tracking-widest flex items-center gap-2">
                            <ShoppingBag size={20} className="text-blue-400"/>
                            {selectedActionPurchase.type} {selectedActionPurchase.documentNumber}
                        </h3>
                        <p className="text-[10px] text-slate-400 truncate">{selectedActionPurchase.supplier} • {formatCurrency(selectedActionPurchase.total)}</p>
                      </div>
                      <button onClick={closeActions} className="hover:bg-slate-800 p-1 rounded-full transition"><X size={24}/></button>
                  </div>
                  <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                              <div className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b pb-1">Gestão de Compra</div>
                              <button onClick={handleEdit} className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-slate-700">
                                <Edit3 size={18} className="text-blue-500"/> Editar Documento
                              </button>
                              <button onClick={handleEdit} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-slate-700">
                                <User size={18} className="text-slate-400"/> Ver Conta Corrente
                              </button>
                              <button className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-slate-700">
                                <Copy size={18} className="text-slate-400"/> Clonar Documento
                              </button>
                          </div>

                          <div className="space-y-2">
                              <div className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b pb-1">Financeiro & Saída</div>
                              <button className="w-full text-left p-3 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-emerald-700" disabled={selectedActionPurchase.type !== PurchaseType.FT}>
                                <DollarSign size={18} className="text-emerald-500"/> Emitir Recibo (Pagamento)
                              </button>
                              <button className="w-full text-left p-3 hover:bg-purple-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-purple-700">
                                <ArrowRightLeft size={18} className="text-purple-500"/> Emitir Nota de Crédito
                              </button>
                              <button className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-slate-700" onClick={() => window.print()}>
                                <Printer size={18} className="text-slate-400"/> Imprimir em A4
                              </button>
                          </div>

                          <div className="space-y-2">
                              <div className="text-[10px] font-black text-slate-400 uppercase mb-2 border-b pb-1">Comunicação & Perigo</div>
                              <button onClick={handleEmail} className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-slate-700">
                                <Mail size={18} className="text-blue-400"/> Enviar por Email
                              </button>
                              <button onClick={handleWhatsApp} className="w-full text-left p-3 hover:bg-green-50 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 text-emerald-700">
                                <MessageSquare size={18} className="text-green-500"/> Enviar por WhatsApp
                              </button>
                              <button onClick={handleDelete} className="w-full text-left p-3 hover:bg-red-50 text-red-600 rounded-xl transition-colors text-xs font-black uppercase flex items-center gap-3 mt-4 border-t pt-4">
                                <Trash2 size={18} className="text-red-500"/> Eliminar Registo
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PurchaseList;