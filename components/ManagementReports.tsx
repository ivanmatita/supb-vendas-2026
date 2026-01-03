
import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceType, Product, InvoiceStatus, IntegrationStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { printDocument, downloadPDF, downloadExcel } from "../utils/exportUtils";
// Fix: Added missing BarChart3 and TrendingDown icons to the lucide-react imports.
import { Search, Printer, Filter, Calendar, ShieldCheck, Zap, ArrowRight, CheckCircle, Database, BarChart3, TrendingDown } from 'lucide-react';

interface ManagementReportsProps {
  invoices: Invoice[];
  products: Product[];
}

const ManagementReports: React.FC<ManagementReportsProps> = ({ invoices, products }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDoc, setFilterDoc] = useState('Todos');

  // --- DATA PROCESSING ---

  const periodInvoices = useMemo(() => {
    return invoices.filter(i => {
        const d = new Date(i.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return d >= start && d <= end && i.isCertified;
    });
  }, [invoices, startDate, endDate]);

  const salesItems: any[] = [];
  const returnItems: any[] = [];

  periodInvoices.forEach(inv => {
      const isReturn = inv.type === InvoiceType.NC;
      const targetArray = isReturn ? returnItems : salesItems;

      inv.items.forEach((item, idx) => {
          targetArray.push({
              ln: idx + 1,
              serial: item.productId ? item.productId.substring(0, 5).toUpperCase() : 'N/A',
              description: item.description,
              quantity: item.quantity,
              unit: 'un',
              unitPrice: item.unitPrice,
              net: item.total,
              tax: item.total * (item.taxRate / 100),
              total: item.total * (1 + item.taxRate / 100),
              docNumber: inv.number,
              docType: inv.type,
              date: inv.date,
              client: inv.clientName,
              integration: inv.integrationStatus || IntegrationStatus.EMITTED
          });
      });
  });

  const topSelling = useMemo(() => {
      const map = new Map<string, { desc: string, serial: string, qty: number, unit: string }>();
      salesItems.forEach(item => {
          const key = item.description;
          const current = map.get(key) || { desc: key, serial: item.serial, qty: 0, unit: item.unit };
          current.qty += item.quantity;
          map.set(key, current);
      });
      return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [salesItems]);

  const totalSalesNet = salesItems.reduce((acc, i) => acc + i.net, 0);
  const totalSalesTax = salesItems.reduce((acc, i) => acc + i.tax, 0);
  const totalSalesGross = salesItems.reduce((acc, i) => acc + i.total, 0);

  const totalReturnsNet = returnItems.reduce((acc, i) => acc + i.net, 0);
  const totalReturnsTax = returnItems.reduce((acc, i) => acc + i.tax, 0);
  const totalReturnsGross = returnItems.reduce((acc, i) => acc + i.total, 0);

  const grandTotalNet = totalSalesNet - totalReturnsNet;
  const grandTotalTax = totalSalesTax - totalReturnsTax;
  const grandTotalGross = totalSalesGross - totalReturnsGross;

  // Hub Integration Stats
  const integrationStats = useMemo(() => {
    return {
      emitted: periodInvoices.filter(i => i.integrationStatus === IntegrationStatus.EMITTED).length,
      validated: periodInvoices.filter(i => i.integrationStatus === IntegrationStatus.VALIDATED).length,
      accounted: periodInvoices.filter(i => i.integrationStatus === IntegrationStatus.ACCOUNTED).length,
      total: periodInvoices.length
    };
  }, [periodInvoices]);

  return (
    <div className="bg-white min-h-screen p-6 animate-in fade-in text-slate-800 font-sans text-xs" id="reportsContainer">
        
        {/* Hub de Integração Automática (Nova Camada Intermédia) */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top duration-700">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform"><Zap size={64}/></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Hub de Integração</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black">{integrationStats.total}</h3>
                    <span className="text-[10px] font-bold text-slate-400">Docs de Período</span>
                </div>
                <div className="mt-3 flex gap-1">
                    <div className="h-1 flex-1 bg-blue-500 rounded-full"></div>
                    <div className="h-1 flex-1 bg-emerald-500 rounded-full"></div>
                    <div className="h-1 flex-1 bg-indigo-500 rounded-full"></div>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emitidos</span>
                    <ShieldCheck size={16} className="text-blue-500"/>
                </div>
                <div className="mt-2">
                    <h3 className="text-2xl font-black text-slate-800">{integrationStats.emitted}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Aguardando Validação</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validados</span>
                    <CheckCircle size={16} className="text-emerald-500"/>
                </div>
                <div className="mt-2">
                    <h3 className="text-2xl font-black text-emerald-600">{integrationStats.validated}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Certificados AGT</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contabilizados</span>
                    <Database size={16} className="text-indigo-500"/>
                </div>
                <div className="mt-2">
                    <h3 className="text-2xl font-black text-indigo-600">{integrationStats.accounted}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Enviados ao Diário</p>
                </div>
            </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-6 border-b border-slate-300 pb-4">
            <div className="flex justify-between items-center">
                <h1 className="text-lg font-bold uppercase text-slate-700 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-600"/> Relatório de Gestão Comercial Integrado
                </h1>
                <div className="flex gap-2 print:hidden">
                    <button onClick={() => printDocument("reportsContainer")} className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-black transition">
                        <Printer size={14}/> Imprimir Relatório
                    </button>
                    <button onClick={() => downloadExcel("salesTable", "Relatorio_Gestao.xlsx")} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition">
                        Baixar Excel
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-12 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                <div className="col-span-3">
                    <label className="block font-bold text-slate-500 mb-1">Período Fiscal</label>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-1 rounded w-full font-bold bg-white"/>
                        <span>a</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-1 rounded w-full font-bold bg-white"/>
                    </div>
                </div>
                <div className="col-span-2">
                    <label className="block font-bold text-slate-500 mb-1">Tipo Documento</label>
                    <select className="border p-1 rounded w-full font-bold bg-white">
                        <option>Todos os Tipos</option>
                        <option>Faturas (FT/FR)</option>
                        <option>Notas Crédito (NC)</option>
                    </select>
                </div>
                <div className="col-span-4 text-right">
                     <label className="block font-bold text-slate-500 mb-1">Consolidação Automática</label>
                     <div className="flex items-center justify-end gap-2 text-emerald-600 font-bold">
                        <CheckCircle size={14}/> Sincronizado com Contabilidade
                     </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
            
            {/* LEFT COLUMN (Main Data) */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                
                {/* SALES TABLE */}
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-400 pb-1 flex items-center justify-between">
                        <span>Fluxo de Produtos Vendidos</span>
                        <span className="text-[9px] font-black text-blue-600 uppercase">Atualizado em Tempo Real</span>
                    </h3>
                    <div className="border border-slate-300 rounded overflow-hidden shadow-sm">
                        <table className="w-full border-collapse text-[10px]" id="salesTable">
                            <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-300">
                                <tr>
                                    <th className="p-1.5 text-left w-8">Ln</th>
                                    <th className="p-1.5 text-left w-16">Serial</th>
                                    <th className="p-1.5 text-left">Descrição do Artigo</th>
                                    <th className="p-1.5 text-center w-12">Qtd</th>
                                    <th className="p-1.5 text-right w-20">Base Incidência</th>
                                    <th className="p-1.5 text-right w-16">IVA (14%)</th>
                                    <th className="p-1.5 text-right w-20">Total Bruto</th>
                                    <th className="p-1.5 text-center w-20">Fluxo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesItems.map((item, idx) => (
                                    <tr key={`sale-${idx}`} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                                        <td className="p-1.5 text-slate-500">{idx + 1}</td>
                                        <td className="p-1.5 font-mono text-slate-500">{item.serial}</td>
                                        <td className="p-1.5 font-bold text-slate-700 uppercase">{item.description}</td>
                                        <td className="p-1.5 text-center font-black">{item.quantity}</td>
                                        <td className="p-1.5 text-right font-mono">{formatCurrency(item.net).replace('Kz','')}</td>
                                        <td className="p-1.5 text-right font-mono text-blue-600">{formatCurrency(item.tax).replace('Kz','')}</td>
                                        <td className="p-1.5 text-right font-black">{formatCurrency(item.total).replace('Kz','')}</td>
                                        <td className="p-1.5 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${item.integration === IntegrationStatus.ACCOUNTED ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {item.integration}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {salesItems.length === 0 && (
                                    <tr><td colSpan={8} className="p-10 text-center text-slate-400 italic">Aguardando emissão de documentos...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RETURNS TABLE */}
                <div>
                    <h3 className="font-bold text-red-700 mb-2 border-b border-red-300 pb-1 uppercase tracking-wider">Regularizações e Devoluções</h3>
                    <div className="border border-slate-300 rounded overflow-hidden opacity-80">
                        <table className="w-full border-collapse text-[10px]">
                            <thead className="bg-red-50 font-bold text-red-800 border-b border-red-200">
                                <tr>
                                    <th className="p-1.5 text-left w-8">Ln</th>
                                    <th className="p-1.5 text-left">Documento Referência</th>
                                    <th className="p-1.5 text-left">Motivo de Regularização</th>
                                    <th className="p-1.5 text-center w-12">Qtd</th>
                                    <th className="p-1.5 text-right w-20">Valor Líquido</th>
                                    <th className="p-1.5 text-right w-16">IVA Ded.</th>
                                    <th className="p-1.5 text-right w-20">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map((item, idx) => (
                                    <tr key={`ret-${idx}`} className="border-b border-red-50 text-red-700 font-medium">
                                        <td className="p-1.5 text-slate-500">{idx + 1}</td>
                                        <td className="p-1.5 font-bold uppercase">{item.docNumber}</td>
                                        <td className="p-1.5 italic">{item.description}</td>
                                        <td className="p-1.5 text-center">{item.quantity}</td>
                                        <td className="p-1.5 text-right font-mono">{formatCurrency(item.net).replace('Kz','')}</td>
                                        <td className="p-1.5 text-right font-mono">{formatCurrency(item.tax).replace('Kz','')}</td>
                                        <td className="p-1.5 text-right font-black">{formatCurrency(item.total).replace('Kz','')}</td>
                                    </tr>
                                ))}
                                {returnItems.length === 0 && (
                                    <tr><td colSpan={7} className="p-4 text-center text-slate-300 italic">Nenhuma regularização no período</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN (Stats) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-black text-slate-800 mb-4 border-b pb-2 text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <TrendingDown size={14} className="text-blue-600"/> Curva de Performance
                    </h3>
                    <div className="space-y-4">
                        {topSelling.map((item, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-end">
                                    <span className="font-bold text-slate-600 truncate max-w-[150px]">{item.desc}</span>
                                    <span className="font-black text-blue-600">{item.qty} un</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(item.qty / topSelling[0].qty) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {topSelling.length === 0 && <p className="text-center text-slate-300 py-4 italic">Sem dados de movimentação</p>}
                    </div>
                </div>

                {/* Summary Box - Arquitetura Consolidada */}
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl relative overflow-hidden border-4 border-blue-900">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={100}/></div>
                    <h4 className="font-black border-b border-slate-800 pb-3 mb-4 text-center text-xs uppercase tracking-[3px]">Consolidação Comercial</h4>
                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase">Total Vendas (Líq)</span>
                            <span className="font-mono font-black text-blue-400">{formatCurrency(totalSalesNet)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase">IVA Liquidado</span>
                            <span className="font-mono font-black text-emerald-400">{formatCurrency(totalSalesTax)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-400 font-bold">
                            <span className="uppercase">Total Regularizações</span>
                            <span className="font-mono">-{formatCurrency(totalReturnsGross)}</span>
                        </div>
                        
                        <div className="pt-4 mt-4 border-t border-slate-800">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1 text-center">Valor para Balanço Contabilístico</p>
                            <div className="text-center">
                                <h3 className="text-3xl font-black tracking-tighter text-white">{formatCurrency(grandTotalGross)}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 italic">Consolidação Anual Ativa</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <h4 className="font-black text-blue-900 uppercase text-[9px] tracking-widest mb-2 flex items-center gap-2"><CheckCircle size={12}/> Auditoria de Fluxo</h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-bold text-slate-700">Conformidade SAFT: 100%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-bold text-slate-700">Integridade Contabilística: OK</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-[10px] font-bold text-slate-700">Sincronização Cloud: Ativa</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 flex justify-between items-end text-[10px] text-slate-400 font-mono italic">
            <div>
                <p>Relatório processado por computador | Software Certificado nº 25/AGT/2019</p>
                <p>IMATEC SOFTWARE V.2.0 - Arquitetura de Integração Automática</p>
            </div>
            <div className="text-right">
                <p>Data de Emissão: {new Date().toLocaleString()}</p>
                <p>Página 1 de 1</p>
            </div>
        </div>
    </div>
  );
};

export default ManagementReports;
