
import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceType, InvoiceStatus, Purchase, IntegrationStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { printDocument, downloadExcel } from "../utils/exportUtils";
// Fix: Ensure ArrowRight is explicitly included in imports.
import { Calendar, Printer, Search, X, ShoppingCart, TrendingUp, Download, ShieldCheck, Zap, Database, CheckCircle, ArrowRight } from 'lucide-react';

interface TaxCalculationMapProps {
  invoices: Invoice[];
  purchases?: Purchase[];
}

const TaxCalculationMap: React.FC<TaxCalculationMapProps> = ({ invoices, purchases = [] }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'SALES' | 'PURCHASES' | 'CONSOLIDATED'>('SALES');

  // Data processing for Tax Map
  const processedData = useMemo(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // SALES LOGIC
      if (viewMode === 'SALES') {
          const filtered = invoices.filter(i => {
              const d = new Date(i.date);
              const isInRange = d >= start && d <= end;
              const isCertified = i.isCertified;
              return isInRange && isCertified;
          });

          const rows = filtered.map(inv => {
              let credito = 0;
              let debito = 0;
              let iva = 0;
              let total = 0;

              const isReturn = inv.type === InvoiceType.NC || inv.status === InvoiceStatus.CANCELLED;
              const amount = inv.currency === 'AOA' ? inv.total : inv.contraValue || inv.total;
              const tax = inv.currency === 'AOA' ? inv.taxAmount : (inv.taxAmount * inv.exchangeRate);
              const base = amount - tax;

              if (isReturn) {
                  debito = base;
                  iva = -tax; 
                  total = -amount;
              } else {
                  credito = base;
                  iva = tax;
                  total = amount;
              }

              return {
                  id: inv.id,
                  date: inv.date,
                  docNumber: inv.number,
                  state: inv.status,
                  entity: inv.clientName,
                  nif: inv.clientNif || '999999999',
                  baseAmount: isReturn ? debito : credito,
                  ivaAmount: iva,
                  totalAmount: total,
                  credito,
                  debito,
                  iva,
                  total,
                  integration: inv.integrationStatus || IntegrationStatus.EMITTED
              };
          });

          const totals = rows.reduce((acc, row) => ({
              credito: acc.credito + row.credito,
              debito: acc.debito + row.debito,
              iva: acc.iva + row.iva,
              total: acc.total + row.total
          }), { credito: 0, debito: 0, iva: 0, total: 0 });

          return { rows, totals };
      } 
      
      // PURCHASES LOGIC
      else if (viewMode === 'PURCHASES') {
          const filtered = purchases.filter(p => {
              const d = new Date(p.date);
              const isInRange = d >= start && d <= end;
              return isInRange && p.status !== 'CANCELLED';
          });

          const rows = filtered.map(pur => {
              const total = pur.total;
              const tax = pur.taxAmount;
              const base = pur.subtotal;

              return {
                  id: pur.id,
                  date: pur.date,
                  docNumber: pur.documentNumber,
                  state: pur.status,
                  entity: pur.supplier,
                  nif: pur.nif,
                  baseAmount: base,
                  ivaAmount: tax,
                  totalAmount: total,
                  credito: 0,
                  debito: base,
                  iva: tax,
                  total: total,
                  integration: pur.integrationStatus || IntegrationStatus.EMITTED
              };
          });

          const totals = rows.reduce((acc, row) => ({
              credito: acc.credito + row.credito,
              debito: acc.debito + row.debito,
              iva: acc.iva + row.iva,
              total: acc.total + row.total
          }), { credito: 0, debito: 0, iva: 0, total: 0 });

          return { rows, totals };
      }

      // CONSOLIDATED LOGIC
      else {
        return { rows: [], totals: { credito: 0, debito: 0, iva: 0, total: 0 } };
      }

  }, [invoices, purchases, startDate, endDate, viewMode]);

  return (
    <div className="bg-white min-h-screen p-6 animate-in fade-in pb-20" id="taxCalcContainer">
        
        {/* Toggle / Header Area */}
        <div className="flex justify-between items-center mb-6 print:hidden">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <ShieldCheck size={28} className="text-blue-600"/>
                Cálculo de Impostos Integrado
                <span className="text-[10px] font-black text-white bg-blue-900 px-3 py-1 rounded-full ml-4 uppercase tracking-[2px]">
                    {viewMode === 'SALES' ? 'Vendas' : 'Compras'}
                </span>
            </h1>
            <div className="flex gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                        onClick={() => setViewMode('SALES')} 
                        className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'SALES' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Fluxo Vendas
                    </button>
                    <button 
                        onClick={() => setViewMode('PURCHASES')} 
                        className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'PURCHASES' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Fluxo Compras
                    </button>
                </div>
            </div>
        </div>

        {/* Paper Container matching image structure */}
        <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 p-6 shadow-sm mb-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={80}/></div>
             <div className="text-center mb-8">
                 <h1 className="text-xl font-black uppercase text-slate-900 tracking-tighter">IMATEC SOFTWARE - ARQUITETURA DE INTEGRAÇÃO</h1>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                     Consolidação Automática: {viewMode === 'SALES' ? 'IVA Liquidado' : 'IVA Dedutível'}
                 </p>
             </div>
             
             {/* Summary Bar */}
             <div className="flex flex-wrap items-center justify-between gap-6">
                 <div className="space-y-1">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Periodo de Apuramento</span>
                     <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200">
                         <Calendar size={14} className="text-blue-500"/>
                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-black text-xs text-slate-800 outline-none" />
                         <ArrowRight size={14} className="text-slate-300"/>
                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-black text-xs text-slate-800 outline-none" />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    {viewMode === 'SALES' ? (
                        <>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Créditos (Venda)</span>
                                <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(processedData.totals.credito)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-1">Total Débitos (NC)</span>
                                <span className="text-xl font-black text-red-600 font-mono">-{formatCurrency(processedData.totals.debito)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Base Incidência Total</span>
                            <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(processedData.totals.debito)}</span>
                        </div>
                    )}
                    <div className="text-right border-l-2 border-slate-200 pl-8">
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Apuramento IVA</span>
                        <span className={`text-2xl font-black font-mono ${viewMode === 'SALES' ? 'text-blue-700' : 'text-orange-700'}`}>
                            {formatCurrency(processedData.totals.iva)}
                        </span>
                    </div>
                 </div>
             </div>
        </div>

        {/* Dashboard Integration Status */}
        <div className="mb-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[2px]">
                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><CheckCircle size={10}/> Sistema Sincronizado</div>
                <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><Database size={10}/> Cloud SQL Integrada</div>
                <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"><ShieldCheck size={10}/> Certificado AGT</div>
            </div>
            <button onClick={() => window.print()} className="text-[10px] font-black text-slate-400 hover:text-slate-800 uppercase flex items-center gap-2"><Printer size={12}/> Gerar PDF para Arquivo</button>
        </div>

        {/* Table */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full text-[10px] text-left border-collapse" id="taxTable">
                <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] border-b border-slate-800">
                        <th className="py-4 pl-4 border-r border-slate-800">Identificador</th>
                        <th className="py-4 border-r border-slate-800">Data Registo</th>
                        <th className="py-4 border-r border-slate-800">Documento Nº</th>
                        <th className="py-4 border-r border-slate-800">NIF</th>
                        <th className="py-4 border-r border-slate-800">{viewMode === 'SALES' ? 'Entidade Cliente' : 'Entidade Fornecedor'}</th>
                        {viewMode === 'SALES' ? (
                            <>
                                <th className="py-4 text-right border-r border-slate-800">Crédito</th>
                                <th className="py-4 text-right border-r border-slate-800">Débito</th>
                            </>
                        ) : (
                            <th className="py-4 text-right border-r border-slate-800">Incidência</th>
                        )}
                        <th className="py-4 text-right border-r border-slate-800">IVA Aplicado</th>
                        <th className="py-4 text-right pr-4">Total Bruto</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {processedData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50 transition-colors group">
                            <td className="py-3 pl-4 font-mono text-slate-400 border-r">{row.id.substring(0,8).toUpperCase()}</td>
                            <td className="py-3 border-r font-medium">{formatDate(row.date)}</td>
                            <td className="py-3 border-r font-black text-blue-800">{row.docNumber}</td>
                            <td className="py-3 border-r font-mono text-slate-500">{row.nif}</td>
                            <td className="py-3 border-r font-bold text-slate-700 truncate max-w-[180px] uppercase">{row.entity}</td>
                            
                            {viewMode === 'SALES' ? (
                                <>
                                    <td className="py-3 text-right font-mono border-r bg-slate-50/30">{row.credito > 0 ? formatCurrency(row.credito).replace('Kz','') : '0,00'}</td>
                                    <td className="py-3 text-right font-mono border-r text-red-600 bg-red-50/10">{row.debito > 0 ? formatCurrency(row.debito).replace('Kz','') : '0,00'}</td>
                                </>
                            ) : (
                                <td className="py-3 text-right font-mono border-r font-bold text-slate-700">{formatCurrency(row.debito).replace('Kz','')}</td>
                            )}

                            <td className={`py-3 text-right font-black border-r ${viewMode === 'SALES' ? 'text-blue-700 bg-blue-50/20' : 'text-orange-700 bg-orange-50/20'}`}>
                                {formatCurrency(row.iva).replace('Kz','')}
                            </td>
                            <td className="py-3 text-right pr-4 font-black text-slate-900 bg-slate-100/50">{formatCurrency(row.total).replace('Kz','')}</td>
                        </tr>
                    ))}
                    {processedData.rows.length === 0 && (
                        <tr><td colSpan={viewMode === 'SALES' ? 9 : 8} className="py-24 text-center text-slate-300 font-black uppercase tracking-[5px] italic bg-slate-50">Sem movimentos integrados para este período</td></tr>
                    )}
                </tbody>
                <tfoot className="border-t-4 border-slate-900 font-black text-xs bg-slate-900 text-white">
                    <tr>
                        <td colSpan={5} className="py-6 text-center uppercase tracking-[3px]">Totalização Final de Ciclo</td>
                        {viewMode === 'SALES' ? (
                            <>
                                <td className="py-6 text-right font-mono">{formatCurrency(processedData.totals.credito).replace('Kz','')}</td>
                                <td className="py-6 text-right font-mono text-red-400">{formatCurrency(processedData.totals.debito).replace('Kz','')}</td>
                            </>
                        ) : (
                             <td className="py-6 text-right font-mono">{formatCurrency(processedData.totals.debito).replace('Kz','')}</td>
                        )}
                        <td className={`py-6 text-right font-black ${viewMode === 'SALES' ? 'text-blue-400' : 'text-orange-400'}`}>
                            {formatCurrency(processedData.totals.iva).replace('Kz','')}
                        </td>
                        <td className="py-6 text-right pr-4 text-sm text-emerald-400">{formatCurrency(processedData.totals.total)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div className="mt-8 flex justify-between items-center print:hidden">
            <div className="flex gap-4">
                 <div className="bg-white border-2 border-slate-200 px-6 py-4 rounded-[2rem] shadow-sm flex items-center gap-4">
                    <Database size={24} className="text-slate-400"/>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado da Contabilidade</p>
                        <p className="text-sm font-black text-emerald-600 uppercase">Totalmente Sincronizado</p>
                    </div>
                 </div>
                 <div className="bg-white border-2 border-slate-200 px-6 py-4 rounded-[2rem] shadow-sm flex items-center gap-4">
                    <ShieldCheck size={24} className="text-blue-600"/>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conformidade AGT</p>
                        <p className="text-sm font-black text-blue-700 uppercase">V2.0 Certified</p>
                    </div>
                 </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => downloadExcel("taxTable", `Tax_Map_${viewMode}.xlsx`)} className="bg-white border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
                    <Download size={16}/> Exportar para Auditoria
                </button>
                <button onClick={() => printDocument("taxCalcContainer")} className="bg-blue-600 text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-500/20 flex items-center gap-2">
                    <Printer size={16}/> Imprimir Mapa Fiscal
                </button>
            </div>
        </div>
    </div>
  );
};

export default TaxCalculationMap;
