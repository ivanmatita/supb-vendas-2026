import React, { useState } from 'react';
import { CashClosure } from '../types';
import { formatCurrency, formatDate, generateQrCodeUrl } from '../utils';
import { printDocument, downloadPDF } from "../utils/exportUtils";
/* Fix: Added missing CheckCircle and Eye icons to lucide-react imports */
import { Printer, FileText, Calendar, User, Wallet, X, Download, ShieldCheck, Clock, TrendingUp, DollarSign, Calculator, CheckCircle, Eye } from 'lucide-react';

interface CashClosureHistoryProps {
  closures: CashClosure[];
}

const CashClosureHistory: React.FC<CashClosureHistoryProps> = ({ closures }) => {
  const [selectedClosure, setSelectedClosure] = useState<CashClosure | null>(null);

  const renderDetailModal = () => {
    if (!selectedClosure) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-800 animate-in zoom-in-95">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl"><Calculator size={24}/></div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter">Relatório de Fecho de Caixa</h2>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">ID: {selectedClosure.id} • {selectedClosure.status}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadPDF('closure-report-area', `Fecho_${selectedClosure.id}.pdf`)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white border border-white/10"><Download size={20}/></button>
                        <button onClick={() => printDocument('closure-report-area')} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white border border-white/10"><Printer size={20}/></button>
                        <button onClick={() => setSelectedClosure(null)} className="p-2 hover:bg-red-600 rounded-full transition border border-white/10 ml-2"><X size={20}/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-slate-50 custom-scrollbar" id="closure-report-area">
                    <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black text-slate-900 uppercase">IMATEC SOFTWARE</h1>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[3px]">Consolidação de Tesouraria</p>
                            </div>
                            <div className="text-right">
                                <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">Oficial</div>
                                <p className="text-xs font-bold text-slate-500">{formatDate(selectedClosure.date)}</p>
                                <p className="text-[10px] font-mono text-slate-400">{new Date(selectedClosure.date).toLocaleTimeString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Operador</p>
                                <div className="flex items-center gap-2"><User size={14} className="text-blue-500"/><span className="font-bold text-slate-800">{selectedClosure.operatorName}</span></div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Terminal</p>
                                <div className="flex items-center gap-2"><Wallet size={14} className="text-indigo-500"/><span className="font-bold text-slate-800">{selectedClosure.cashRegisterId}</span></div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Aberto em</p>
                                <div className="flex items-center gap-2"><Clock size={14} className="text-slate-400"/><span className="font-medium text-slate-600">{new Date(selectedClosure.openedAt).toLocaleString()}</span></div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Fechado em</p>
                                <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/><span className="font-medium text-slate-600">{new Date(selectedClosure.closedAt).toLocaleString()}</span></div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><DollarSign size={16} className="text-blue-600"/> Resumo de Valores</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Saldo Inicial</span>
                                        <span className="font-mono font-bold text-slate-600">{formatCurrency(selectedClosure.initialBalance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Vendas no Turno</span>
                                        <span className="font-mono font-bold text-emerald-600">+{formatCurrency(selectedClosure.totalSales)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                        <span className="text-xs font-black text-slate-800 uppercase">Total Esperado</span>
                                        <span className="text-xl font-black text-slate-900">{formatCurrency(selectedClosure.expectedCash)}</span>
                                    </div>
                                </div>
                                <div className="p-6 bg-blue-900 rounded-2xl shadow-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-blue-300 uppercase">Contagem Real</span>
                                        <span className="font-mono font-black text-white text-lg">{formatCurrency(selectedClosure.actualCash)}</span>
                                    </div>
                                    <div className={`flex justify-between items-center pt-4 border-t border-white/10 ${selectedClosure.difference < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                                        <span className="text-xs font-black uppercase">Diferença</span>
                                        <span className="text-xl font-black">{formatCurrency(selectedClosure.difference)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 space-y-4">
                            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><Clock size={16} className="text-blue-600"/> Observações do Operador</h3>
                            <div className="p-6 bg-slate-50 rounded-2xl italic text-slate-600 leading-relaxed border-2 border-slate-100">
                                {selectedClosure.notes || 'Nenhuma observação registada para este fecho.'}
                            </div>
                        </div>

                        <div className="mt-20 pt-8 border-t-4 border-slate-900 flex justify-between items-end">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-1 border-2 border-slate-900 bg-white shadow-sm">
                                        {/* Fix: generateQrCodeUrl is now correctly imported from ../utils */}
                                        <img src={generateQrCodeUrl(`FECHO-${selectedClosure.id}`)} className="w-16 h-16"/>
                                    </div>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        <p>Software Certificado AGT n. 25/2019</p>
                                        <p>Integridade de Dados Cloud Ativa</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center w-64">
                                <div className="border-t-2 border-slate-800 pt-2 font-black text-[10px] uppercase">Assinatura do Responsável</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in h-full">
        {renderDetailModal()}
        
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-indigo-600"/> Histórico de Fechos</h1>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Registos de encerramento de turno</p>
            </div>
            <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-black transition"><Printer size={16}/> Imprimir Lista</button>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-500 border-b border-slate-100">
                    <tr>
                        <th className="p-5">Data/Hora Fecho</th>
                        <th className="p-5">Caixa / Operador</th>
                        <th className="p-5 text-right">Vendas POS</th>
                        <th className="p-5 text-right">Esperado</th>
                        <th className="p-5 text-right">Contagem Real</th>
                        <th className="p-5 text-right">Diferença</th>
                        <th className="p-5 text-center">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {closures.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5">
                                <div className="font-black text-slate-800 flex items-center gap-2"><Calendar size={14} className="text-slate-400"/> {formatDate(c.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(c.date).toLocaleTimeString()}</div>
                            </td>
                            <td className="p-5">
                                <div className="font-bold text-blue-700 flex items-center gap-2"><Wallet size={14}/> ID: {c.cashRegisterId.substring(0,6).toUpperCase()}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase"><User size={12}/> {c.operatorName}</div>
                            </td>
                            <td className="p-5 text-right font-black text-slate-600">{formatCurrency(c.totalSales)}</td>
                            <td className="p-5 text-right font-mono text-slate-500">{formatCurrency(c.expectedCash)}</td>
                            <td className="p-5 text-right font-black text-slate-900 bg-slate-50/50">{formatCurrency(c.actualCash)}</td>
                            <td className={`p-5 text-right font-black ${c.difference < 0 ? 'text-red-600' : c.difference > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                {formatCurrency(c.difference)}
                            </td>
                            <td className="p-5 text-center">
                                <button 
                                    onClick={() => setSelectedClosure(c)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition shadow-sm border border-transparent hover:border-indigo-100" 
                                    title="Ver Detalhes / Imprimir"
                                >
                                    {/* Fix: Eye is now correctly imported from lucide-react */}
                                    <Eye size={18}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {closures.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-20 text-center text-slate-300 font-black uppercase tracking-[5px] bg-slate-50 italic">Nenhum fecho registado</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default CashClosureHistory;