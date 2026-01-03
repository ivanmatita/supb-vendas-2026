import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Purchase, PurchaseItem, Product, PurchaseType, WorkLocation, PaymentMethod, CashRegister, Warehouse, Company } from '../types';
import { generateId, formatCurrency, formatDate } from '../utils';
import { supabase } from '../services/supabaseClient';
import { Plus, Trash, Save, ArrowLeft, FileText, List, X, Calendar, CreditCard, Ruler, Users, Briefcase, Calculator, RefreshCw, Scale, Hash, ShieldCheck, Box, Store, Info, MapPin, Phone, Wallet, AlertCircle, Bookmark, Tag, UserPlus, Loader2 } from 'lucide-react';

interface PurchaseFormProps {
  onSave: (purchase: Purchase) => void;
  onCancel: () => void;
  onViewList: () => void;
  onSaveSupplier: (supplier: Supplier) => void;
  products: Product[];
  suppliers: Supplier[];
  workLocations: WorkLocation[];
  cashRegisters: CashRegister[];
  warehouses: Warehouse[];
  initialData?: Partial<Purchase>;
  currentUser?: string;
  currentUserId?: string;
  currentCompany?: Company;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ 
  onSave, onCancel, onViewList, onSaveSupplier, suppliers, products, workLocations, cashRegisters, warehouses = [],
  initialData, currentUser, currentUserId, currentCompany
}) => {
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(initialData?.type || PurchaseType.FT);
  const [workLocationId, setWorkLocationId] = useState(initialData?.workLocationId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(initialData?.paymentMethod || '');
  const [cashRegisterId, setCashRegisterId] = useState(initialData?.cashRegisterId || '');
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber || '');
  const [hashCode, setHashCode] = useState(initialData?.hash || '');
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialData?.date || today);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || today);

  const [currency, setCurrency] = useState<string>(initialData?.currency || 'AOA');
  const [exchangeRate, setExchangeRate] = useState<number>(initialData?.exchangeRate || 1);
  const [retentionType, setRetentionType] = useState<'NONE' | 'CAT_50' | 'CAT_100'>(initialData?.retentionType || 'NONE');

  const selectedSupplier = useMemo(() => suppliers.find(s => s.id === supplierId), [suppliers, supplierId]);
  const showPaymentFields = (purchaseType === PurchaseType.FR || purchaseType === PurchaseType.VD || purchaseType === PurchaseType.REC);

  const [items, setItems] = useState<PurchaseItem[]>(() => {
      const rawItems = initialData?.items || [];
      return rawItems.map((i: any) => ({
          id: i.id || generateId(),
          productId: i.productId,
          description: i.description || '',
          reference: i.reference || '',
          quantity: i.quantity || 1,
          unit: i.unit || 'un',
          unitPrice: i.unitPrice || 0,
          discount: i.discount || 0,
          taxRate: i.taxRate !== undefined ? i.taxRate : 14,
          taxAmount: i.taxAmount || 0,
          total: i.total !== undefined ? i.total : ((i.quantity || 1) * (i.unitPrice || 0) * (1 - (i.discount || 0)/100)),
          rubrica: i.rubrica || '71.1',
          warehouseId: i.warehouseId || initialData?.warehouseId || '',
          itemType: i.itemType || 'Produto',
          length: i.length || 1,
          width: i.width || 1,
          height: i.height || 1,
          showMetrics: i.showMetrics || false,
          withholdingRate: i.withholdingRate || 6.5,
          withholdingAmount: i.withholdingAmount || 0,
          expiryDate: i.expiryDate || ''
      }));
  });

  const [globalDiscount, setGlobalDiscount] = useState(initialData?.globalDiscount || 0); 
  const [notes, setNotes] = useState(initialData?.notes || '');

  useEffect(() => {
    if (!initialData) {
        setSupplierId('');
        setDocumentNumber('');
        setHashCode('');
        setItems([]);
        setNotes('');
        setGlobalDiscount(0);
    }
  }, [initialData]);

  const calculateLineTotals = (qty: number, price: number, discount: number, taxRate: number, length: number = 1, width: number = 1, height: number = 1) => {
      const actualLength = length > 0 ? length : 1;
      const actualWidth = width > 0 ? width : 1;
      const actualHeight = height > 0 ? height : 1;
      const base = qty * actualLength * actualWidth * actualHeight * price;
      const discAmount = base * (discount / 100);
      const subtotalItem = base - discAmount;
      const taxAmount = subtotalItem * (taxRate / 100);
      const total = subtotalItem + taxAmount;
      return { subtotalItem, taxAmount, total };
  };

  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (item.length || 1) * (item.width || 1) * (item.height || 1) * (1 - (item.discount || 0) / 100)), 0);
  const totalTaxAmount = items.reduce((acc, item) => acc + (item.taxAmount || 0), 0);
  const discountGlobalValue = subtotal * (globalDiscount / 100);
  const totalFinal = (subtotal + totalTaxAmount) - discountGlobalValue;

  const handleAddItem = () => {
    setItems([...items, { 
      id: generateId(), description: '', reference: '', quantity: 1, unit: 'un',
      unitPrice: 0, discount: 0, taxRate: 14, taxAmount: 0, total: 0, rubrica: '71.1',
      warehouseId: warehouseId || (warehouses.length > 0 ? warehouses[0].id : ''), 
      itemType: 'Produto', length: 1, width: 1, height: 1,
      showMetrics: false, withholdingRate: 6.5, withholdingAmount: 0, expiryDate: ''
    }]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      const unitPrice = product.costPrice || 0; 
      const taxRate = newItems[index].taxRate || 14;
      const calc = calculateLineTotals(newItems[index].quantity, unitPrice, newItems[index].discount || 0, taxRate, newItems[index].length, newItems[index].width, newItems[index].height);
      
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        reference: product.barcode || '',
        unit: product.unit || 'un',
        unitPrice: unitPrice,
        taxAmount: calc.taxAmount,
        total: calc.total,
        warehouseId: product.warehouseId || newItems[index].warehouseId || warehouseId || (warehouses.length > 0 ? warehouses[0].id : '')
      };
      setItems(newItems);
    }
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    
    if (['quantity', 'unitPrice', 'discount', 'taxRate', 'length', 'width', 'height'].includes(field as string)) {
        const calc = calculateLineTotals(item.quantity, item.unitPrice, item.discount || 0, item.taxRate || 0, item.length || 1, item.width || 1, item.height || 1);
        item.taxAmount = calc.taxAmount;
        item.total = calc.total;
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
      if (!supplierId || !documentNumber || items.length === 0) return alert("Preencha todos os campos obrigatórios (*)");
      if (showPaymentFields && (!paymentMethod || !cashRegisterId)) return alert("Preencha a forma de pagamento e o caixa de destino.");

      const newPurchase: Purchase = {
          id: initialData?.id || generateId(),
          type: purchaseType,
          supplierId,
          supplier: selectedSupplier?.name || 'Fornecedor',
          nif: selectedSupplier?.vatNumber || '',
          date,
          dueDate,
          documentNumber,
          hash: hashCode,
          items,
          subtotal,
          taxAmount: totalTaxAmount,
          total: totalFinal,
          currency,
          exchangeRate,
          status: (purchaseType === PurchaseType.FR || purchaseType === PurchaseType.REC || purchaseType === PurchaseType.VD) ? 'PAID' : 'PENDING',
          notes,
          workLocationId,
          warehouseId,
          paymentMethod: paymentMethod || undefined,
          cashRegisterId
      };
      onSave(newPurchase);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-500 pb-20 relative px-4 sm:px-6">
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onCancel} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                <ArrowLeft size={20} /> <span className="font-medium hidden sm:inline">Voltar</span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Box size={20} className="text-orange-500"/>
                {purchaseType === PurchaseType.FR ? 'Nova Fatura/Recibo de Compra' : 'Registar Compra'}
            </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-10 space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                    <FileText size={14} className="text-orange-600"/>
                    <h3 className="font-bold text-slate-700 text-sm uppercase">Dados e Datas da Compra</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold" value={purchaseType} onChange={(e) => setPurchaseType(e.target.value as PurchaseType)}>
                                {Object.values(PurchaseType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nº Documento *</label>
                             <input required className="w-full p-2 border rounded-lg bg-white text-sm font-bold text-blue-700 outline-none" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Ex: FT 2024/001" />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1"><ShieldCheck size={10}/> Código Hash (AGT)</label>
                             <input maxLength={4} className="w-full p-2 border border-orange-200 rounded-lg bg-orange-50 text-sm font-black text-orange-700 uppercase" value={hashCode} onChange={(e) => setHashCode(e.target.value)} placeholder="4 dígitos" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Centro de Custo (Obra)</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold" value={workLocationId} onChange={e => setWorkLocationId(e.target.value)}>
                                <option value="">Sem Local Associado</option>
                                {workLocations.map(wl => <option key={wl.id} value={wl.id}>{wl.name}</option>)}
                            </select>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={10}/> Data Emissão</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={10}/> Data Vencimento</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-orange-50" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    {showPaymentFields && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Forma Pagamento</label>
                                <select className="w-full p-2 border border-emerald-200 rounded-lg bg-emerald-50 text-sm font-bold outline-none" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                                    <option value="">Selecione...</option>
                                    <option value="CASH">Dinheiro (AOA)</option>
                                    <option value="MULTICAIXA">Multicaixa</option>
                                    <option value="TRANSFER">Transferência</option>
                                    <option value="OTHERS">Outros</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Caixa de Pagamento</label>
                                <select className="w-full p-2 border border-emerald-200 rounded-lg bg-emerald-50 text-sm font-bold outline-none" value={cashRegisterId} onChange={e => setCashRegisterId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-orange-600"/>
                        <h3 className="font-bold text-slate-700 text-sm uppercase">Seleção de Fornecedor (Cloud)</h3>
                    </div>
                </div>
                <div className="p-5">
                    <select className="w-full p-3 border rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none shadow-sm transition-all" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                        <option value="">-- SELECIONAR FORNECEDOR (Puxar da Nuvem) * --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (NIF: {s.vatNumber})</option>)}
                    </select>
                    {selectedSupplier && (
                        <div className="mt-3 bg-slate-50 p-4 rounded-xl border grid grid-cols-2 gap-2 text-[10px] uppercase font-bold text-slate-600">
                            <span>Endereço: {selectedSupplier.address}</span>
                            <span>Tipo: {selectedSupplier.supplierType}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><List size={16}/> Itens da Compra</h3>
                    <button onClick={handleAddItem} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-700 shadow-sm flex items-center gap-2"><Plus size={14} /> Adicionar Linha</button>
                </div>
                
                <div className="flex-1 p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                            <tr>
                                <th className="p-3 w-10 text-center"></th>
                                <th className="p-3 w-32">Serial Number</th>
                                <th className="p-3">Artigo / Descrição</th>
                                <th className="p-3 w-32">Rubrica PGC</th>
                                <th className="p-3 w-40 bg-orange-50">Armazém Destino</th>
                                <th className="p-3 w-20 text-center">Qtd</th>
                                <th className="p-3 w-28 text-center">Unidade</th>
                                <th className="p-3 w-24 text-right">Preço Un.</th>
                                <th className="p-3 w-16 text-center">IVA %</th>
                                <th className="p-3 w-24 text-right">Total</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="p-2 text-center"><Ruler size={16} className="text-slate-300"/></td>
                                    <td className="p-2"><input className="w-full p-1 border border-slate-200 rounded text-[10px] font-mono focus:ring-1 focus:ring-orange-500 outline-none" value={item.reference || ''} onChange={e => handleUpdateItem(index, 'reference', e.target.value)} placeholder="Ref/Serial"/></td>
                                    <td className="p-2">
                                        <div className="flex flex-col gap-1">
                                            <select className="w-full p-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none font-bold text-blue-700 bg-blue-50" onChange={(e) => handleProductSelect(index, e.target.value)} value={item.productId || ''}>
                                                <option value="">-- SELECIONAR ARTIGO (Stock Geral) --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <input className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-orange-500 outline-none text-xs font-bold" placeholder="Descrição manual..." value={item.description} onChange={(e) => handleUpdateItem(index, 'description', e.target.value)} />
                                        </div>
                                    </td>
                                    <td className="p-2"><input className="w-full p-1 border border-slate-200 rounded text-[10px] font-bold bg-white" value={item.rubrica} onChange={e => handleUpdateItem(index, 'rubrica', e.target.value)} /></td>
                                    <td className="p-2 bg-orange-50/20">
                                        <select className="w-full p-1 border border-orange-200 rounded text-[10px] font-bold bg-white" value={item.warehouseId} onChange={e => handleUpdateItem(index, 'warehouseId', e.target.value)}>
                                            <option value="">(Usar Geral)</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 text-center"><input type="number" className="w-full p-1.5 text-center border border-slate-200 rounded bg-white text-sm font-bold" value={item.quantity} onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))} /></td>
                                    <td className="p-2 text-center"><select className="w-full p-1.5 border border-slate-200 rounded bg-white text-[10px] font-bold" value={item.unit || 'un'} onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}><option value="un">un</option><option value="kg">kg</option><option value="mm">mm</option></select></td>
                                    <td className="p-2 text-right"><input type="number" className="w-full p-1.5 text-right border border-slate-200 rounded bg-white text-sm font-bold" value={item.unitPrice} onChange={(e) => handleUpdateItem(index, 'unitPrice', Number(e.target.value))} /></td>
                                    <td className="p-2 text-center"><select className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs font-bold" value={item.taxRate} onChange={(e) => handleUpdateItem(index, 'taxRate', Number(e.target.value))}><option value={14}>14%</option><option value={0}>Isento</option></select></td>
                                    <td className="p-2 text-right font-black text-slate-700 text-sm">{formatCurrency(item.total).replace('Kz','')}</td>
                                    <td className="p-2 text-center"><button onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-red-500 p-1"><Trash size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Observações da Compra</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-lg h-20 text-sm resize-none outline-none focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Notas adicionais..." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
            </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden sticky top-24">
                <div className="bg-slate-800 text-white px-4 py-4 flex items-center gap-2"><CreditCard size={18}/><h3 className="font-bold text-xs uppercase">Resumo Financeiro</h3></div>
                <div className="p-4 space-y-6">
                    <div className="space-y-4 pt-2 border-t border-slate-100 text-[10px] uppercase font-bold">
                        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {globalDiscount > 0 && <div className="flex justify-between text-red-600"><span>Desc. Global</span><span>-{formatCurrency(discountGlobalValue)}</span></div>}
                        <div className="flex justify-between text-slate-600 pt-2"><span>Imposto (IVA)</span><span>{formatCurrency(totalTaxAmount)}</span></div>
                        <div className="pt-4 mt-4 border-t-2 border-slate-800 flex flex-col items-end gap-1">
                            <span className="font-bold text-[9px] text-slate-400 uppercase tracking-widest">Total da Compra</span>
                            <span className="font-black text-xl text-orange-600 tracking-tighter leading-none">{formatCurrency(totalFinal)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button onClick={handleSave} className="py-3 px-4 bg-orange-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95">
                  <Save size={18} /> Registar Documento
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseForm;