
import React, { useState, useMemo } from 'react';
import { CashRegister, CashClosure as CashClosureType, Invoice, CashMovement } from '../types';
import { formatCurrency, generateId } from '../utils';
import { Wallet, CheckCircle, ArrowLeft, RefreshCw, Save, Clock, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface CashClosureProps {
  registers: CashRegister[];
  invoices: Invoice[];
  movements: CashMovement[];
  onSaveClosure: (closure: CashClosureType) => void;
  onGoBack: () => void;
  currentUser: string;
  currentUserId: string;
}

const CashClosure: React.FC<CashClosureProps> = ({ registers, invoices, movements, onSaveClosure, onGoBack, currentUser, currentUserId }) => {
  const [selectedRegisterId, setSelectedRegisterId] = useState(registers[0]?.id || '');
  const [closureType, setClosureType] = useState<'SHIFT' | 'DAILY'>('SHIFT');
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => {
      const reg = registers.find(r => r.id === selectedRegisterId);
      const today = new Date().toISOString().split('T')[0];
      
      const sales = invoices.filter(i => 
        i.cashRegisterId === selectedRegisterId && 
        i.date === today && 
        i.isCertified &&
        i.status !== 'Anulado'
      );
      
      const totalSales = sales.reduce((acc, i) => acc + (i.currency === 'AOA' ? i.total : i.contraValue || i.total), 0);
      const expected = (reg?.initialBalance || 0) + totalSales;

      return { initial: reg?.initialBalance || 0, totalSales, expected };
  }, [selectedRegisterId, invoices, registers]);

  const handleClose = async () => {
      if (!selectedRegisterId) return alert("Selecione um caixa para o fecho.");
      
      setIsSaving(true);
      const timestamp = new Date().toISOString();
      const closure: CashClosureType = {
          id: generateId(),
          date: timestamp,
          openedAt: timestamp,
          closedAt: timestamp,
          operatorId: currentUserId,
          operatorName: currentUser,
          cashRegisterId: selectedRegisterId,
          expectedCash: stats.expected,
          expectedMulticaixa: 0,
          expectedTransfer: 0,
          expectedCredit: 0,
          totalSales: stats.totalSales,
          actualCash: actualCash,
          difference: actualCash - stats.expected,
          initialBalance: stats.initial,
          finalBalance: actualCash,
          status: 'CLOSED',
          notes: `${closureType === 'DAILY' ? '[FECHO DIÁRIO] ' : '[FECHO TURNO] '} ${notes}`
      };

      try {
          const syncPayload = {
              caixa_id: selectedRegisterId,
              operador_nome: currentUser,
              operador_id: currentUserId,
              esperado_dinheiro: stats.expected,
              dinheiro_real: actualCash,
              diferenca: closure.difference,
              total_vendas: stats.totalSales,
              saldo_inicial: stats.initial,
              saldo_final: actualCash,
              notas: closure.notes,
              status: 'CLOSED',
              tipo_fecho: closureType, 
              empresa_id: '00000000-0000-0000-0000-000000000001'
          };

          const { error } = await supabase.from('fechos_caixa').insert(syncPayload);

          if (error) throw error;

          if (closureType === 'DAILY') {
              await supabase.from('caixas').update({ 
                status: 'CLOSED',
                balance: 0,
                saldo_abertura: 0 
              }).eq('id', selectedRegisterId);
          }

          onSaveClosure(closure);
          onGoBack();
      } catch (err: any) {
          console.error("Falha no fecho:", err.message);
          alert("Erro ao realizar fecho: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-[2.5rem] shadow-2xl animate-in fade-in border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onGoBack} className="p-3 hover:bg-slate-100 rounded-full transition text-slate-400 border border-transparent hover:border-slate-200"><ArrowLeft/></button>
            <div>
                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Encerramento de Caixa</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Conferência física e fiscal de valores</p>
            </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8 border-2 border-slate-100 shadow-inner">
            <button 
                onClick={() => setClosureType('SHIFT')} 
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-[2px] flex items-center justify-center gap-2 transition-all ${closureType === 'SHIFT' ? 'bg-white text-blue-600 shadow-lg border border-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Clock size={16}/> Fecho de Turno
            </button>
            <button 
                onClick={() => setClosureType('DAILY')} 
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-[2px] flex items-center justify-center gap-2 transition-all ${closureType === 'DAILY' ? 'bg-white text-indigo-600 shadow-lg border border-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Calendar size={16}/> Fecho Diário
            </button>
        </div>

        <div className="space-y-8">
            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Selecionar Terminal de Caixa</label>
                <select className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black text-slate-700 bg-slate-50 focus:border-blue-600 focus:bg-white outline-none transition-all" value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)}>
                    {registers.map(r => <option key={r.id} value={r.id}>{r.name} (Saldo Cloud: {formatCurrency(r.balance)})</option>)}
                </select>
            </div>
            
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border-b-4 border-blue-600">
                <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck size={100}/></div>
                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Saldo Inicial (Abertura)</span>
                        <span className="font-mono">{formatCurrency(stats.initial)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-4">
                        <span>Vendas POS no Período</span>
                        <span className="font-mono text-emerald-400 font-black">+{formatCurrency(stats.totalSales)}</span>
                    </div>
                    <div className="pt-2 flex justify-between items-center">
                        <span className="text-sm font-black uppercase tracking-[3px]">Total Esperado</span>
                        <span className="text-3xl font-black text-white font-mono tracking-tighter">{formatCurrency(stats.expected)}</span>
                    </div>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 text-center">Contagem Física (Dinheiro Real na Gaveta)</label>
                <input 
                    type="number" 
                    className="w-full p-6 border-4 border-blue-600 rounded-3xl text-5xl font-black text-center text-blue-700 focus:ring-8 focus:ring-blue-50 outline-none transition-all shadow-inner" 
                    value={actualCash || ''} 
                    onChange={e => setActualCash(Number(e.target.value))}
                    placeholder="0.00"
                    autoFocus
                />
                <div className={`mt-4 text-center font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 ${actualCash - stats.expected === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {actualCash - stats.expected === 0 ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
                    Diferença Apurada: {formatCurrency(actualCash - stats.expected)}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações do Fecho</label>
                <textarea className="w-full border-2 border-slate-100 p-4 rounded-2xl text-sm h-28 resize-none focus:border-blue-600 outline-none transition-all font-medium" placeholder="Justifique diferenças ou deixe notas para a contabilidade..." value={notes} onChange={e => setNotes(e.target.value)}/>
            </div>

            <button onClick={handleClose} disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-2xl transform active:scale-95 disabled:opacity-50 uppercase tracking-[4px]">
                {isSaving ? <RefreshCw className="animate-spin" size={24}/> : <CheckCircle size={24}/>} 
                {closureType === 'DAILY' ? 'CONCLUIR FECHO DIÁRIO' : 'CONCLUIR FECHO DE TURNO'}
            </button>
        </div>
    </div>
  );
};

export default CashClosure;
