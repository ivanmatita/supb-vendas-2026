
import React, { useState, useMemo } from 'react';
import { 
  Invoice, Purchase, Client, Product, 
  CashRegister, WorkLocation, InvoiceType, PurchaseType, InvoiceStatus 
} from '../types';
import { formatCurrency, formatDate } from '../utils';
import { printDocument, downloadExcel } from "../utils/exportUtils";
import { 
  Search, Filter, Calendar, ListTree, Download, Printer, 
  ArrowUpRight, ArrowDownLeft, Database, User, Package, 
  Briefcase, DollarSign, Calculator, Tag, MapPin, Layers
} from 'lucide-react';

interface GeneralMovementsProps {
  invoices: Invoice[];
  purchases: Purchase[];
  clients: Client[];
  products: Product[];
  cashRegisters: CashRegister[];
  workLocations: WorkLocation[];
}

const GeneralMovements: React.FC<GeneralMovementsProps> = ({ 
  invoices, purchases, clients, products, cashRegisters, workLocations 
}) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');

  const combinedData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result: any[] = [];

    // Vendas
    invoices.forEach(inv => {
      const d = new Date(inv.date);
      if (d >= start && d <= end && inv.status !== InvoiceStatus.CANCELLED) {
        inv.items.forEach(item => {
          result.push({
            id: `INV-${inv.id}-${item.id}`,
            date: inv.date,
            docNo: inv.number,
            type: inv.type,
            entity: inv.clientName,
            description: item.description,
            quantity: item.quantity,
            net: item.total,
            iva: item.total * (item.taxRate / 100),
            gross: item.total * (1 + item.taxRate / 100),
            cashRegister: cashRegisters.find(c => c.id === inv.cashRegisterId)?.name || '---',
            workLocation: workLocations.find(w => w.id === inv.workLocationId)?.name || '---',
            category: 'VENDA'
          });
        });
      }
    });

    // Compras
    purchases.forEach(pur => {
      const d = new Date(pur.date);
      if (d >= start && d <= end && pur.status !== 'CANCELLED') {
        pur.items.forEach(item => {
          result.push({
            id: `PUR-${pur.id}-${item.id}`,
            date: pur.date,
            docNo: pur.documentNumber,
            type: pur.type,
            entity: pur.supplier,
            description: item.description,
            quantity: item.quantity,
            net: item.total,
            iva: item.taxAmount,
            gross: item.total, // Purchase items already have tax in total in mock
            cashRegister: cashRegisters.find(c => c.id === pur.cashRegisterId)?.name || '---',
            workLocation: workLocations.find(w => w.id === pur.workLocationId)?.name || '---',
            category: 'COMPRA'
          });
        });
      }
    });

    return result.filter(r => {
      const matchSearch = r.entity.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.docNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = docTypeFilter === 'ALL' || r.category === docTypeFilter;
      return matchSearch && matchType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, purchases, startDate, endDate, searchTerm, docTypeFilter, cashRegisters, workLocations]);

  const totals = useMemo(() => {
    return combinedData.reduce((acc, r) => {
      if (r.category === 'VENDA') {
        acc.sales += r.gross;
      } else {
        acc.purchases += r.gross;
      }
      acc.iva += r.iva;
      return acc;
    }, { sales: 0, purchases: 0, iva: 0 });
  }, [combinedData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-sans" id="generalMovementsContainer">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <ListTree className="text-blue-600" size={32}/> Consolidação de Movimentos Gerais
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Visão holística de todos os fluxos do ecossistema</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-black transition shadow-lg">
             <Printer size={16}/> Imprimir Tudo
           </button>
           <button onClick={() => downloadExcel("movementsTable", "Movimentos_Gerais.xlsx")} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-green-700 transition shadow-lg">
             <Download size={16}/> Excel
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-8 border-l-blue-600 flex justify-between items-center">
            <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Entradas (Vendas)</p><h3 className="text-2xl font-black text-blue-600">{formatCurrency(totals.sales)}</h3></div>
            <ArrowUpRight className="text-blue-100" size={48}/>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-8 border-l-red-500 flex justify-between items-center">
            <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Saídas (Compras)</p><h3 className="text-2xl font-black text-red-600">{formatCurrency(totals.purchases)}</h3></div>
            <ArrowDownLeft className="text-red-100" size={48}/>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-8 border-l-emerald-500 flex justify-between items-center">
            <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Margem Operacional</p><h3 className="text-2xl font-black text-emerald-600">{formatCurrency(totals.sales - totals.purchases)}</h3></div>
            <Calculator className="text-emerald-100" size={48}/>
          </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Desde</label>
             <input type="date" className="w-full p-2.5 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-500 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)}/>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Até</label>
             <input type="date" className="w-full p-2.5 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-500 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)}/>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Fluxo Principal</label>
             <select className="w-full p-2.5 border-2 border-slate-100 rounded-xl font-bold focus:border-blue-500 outline-none bg-white" value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
                <option value="ALL">Todos os Movimentos</option>
                <option value="VENDA">Entradas (Vendas)</option>
                <option value="COMPRA">Saídas (Compras)</option>
             </select>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
             <input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold transition-all" placeholder="Filtrar por qualquer campo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] border-collapse" id="movementsTable">
                  <thead className="bg-slate-900 text-white font-black uppercase tracking-widest border-b border-slate-800">
                      <tr>
                          <th className="p-4 border-r border-slate-800">Data</th>
                          <th className="p-4 border-r border-slate-800">Documento</th>
                          <th className="p-4 border-r border-slate-800">Fluxo</th>
                          <th className="p-4 border-r border-slate-800">Entidade (Cliente/Fornec.)</th>
                          <th className="p-4 border-r border-slate-800">Artigo / Descrição</th>
                          <th className="p-4 text-center border-r border-slate-800">Qtd</th>
                          <th className="p-4 border-r border-slate-800">Local de Trabalho</th>
                          <th className="p-4 border-r border-slate-800">Caixa</th>
                          <th className="p-4 text-right border-r border-slate-800">IVA</th>
                          <th className="p-4 text-right pr-6">Total Bruto</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                      {combinedData.map(m => (
                          <tr key={m.id} className="hover:bg-blue-50 transition-colors">
                              <td className="p-4 border-r font-mono text-slate-500">{formatDate(m.date)}</td>
                              <td className="p-4 border-r font-bold text-blue-700 uppercase">
                                  <div className="text-[8px] opacity-50">{m.type}</div>
                                  {m.docNo}
                              </td>
                              <td className="p-4 border-r text-center">
                                  <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase ${m.category === 'VENDA' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                                      {m.category}
                                  </span>
                              </td>
                              <td className="p-4 border-r font-black text-slate-800 uppercase truncate max-w-[150px]">{m.entity}</td>
                              <td className="p-4 border-r font-medium text-slate-600 truncate max-w-[200px]">{m.description}</td>
                              <td className="p-4 border-r text-center font-black">{m.quantity}</td>
                              <td className="p-4 border-r text-[9px] font-bold text-slate-500 uppercase">{m.workLocation}</td>
                              <td className="p-4 border-r text-[9px] font-bold text-blue-600 uppercase">{m.cashRegister}</td>
                              <td className="p-4 border-r text-right font-mono text-slate-400">{formatCurrency(m.iva).replace('Kz','')}</td>
                              <td className={`p-4 text-right pr-6 font-black ${m.category === 'VENDA' ? 'text-blue-900 bg-blue-50/20' : 'text-red-900 bg-red-50/20'}`}>
                                  {formatCurrency(m.gross)}
                              </td>
                          </tr>
                      ))}
                      {combinedData.length === 0 && (
                          <tr><td colSpan={10} className="p-32 text-center text-slate-300 font-black uppercase tracking-[8px] italic opacity-40">Sem movimentos registados para os filtros aplicados</td></tr>
                      )}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-black uppercase text-xs">
                      <tr>
                          <td colSpan={5} className="p-6 text-right tracking-[3px]">Totalização Geral de Ciclo</td>
                          <td colSpan={3}></td>
                          <td className="p-6 text-right font-mono border-l border-slate-800 text-emerald-400">{formatCurrency(totals.iva).replace('Kz','')}</td>
                          <td className="p-6 text-right pr-6 font-mono text-lg text-blue-400">{formatCurrency(totals.sales - totals.purchases)}</td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      </div>
    </div>
  );
};

export default GeneralMovements;
