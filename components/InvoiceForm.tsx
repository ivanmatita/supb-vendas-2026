import React, { useState, useEffect, useMemo } from 'react';
import { Client, Invoice, InvoiceItem, InvoiceStatus, InvoiceType, Product, WorkLocation, PaymentMethod, CashRegister, DocumentSeries, Warehouse, Company } from '../types';
import { generateId, formatCurrency, formatDate, generateQrCodeUrl, numberToExtenso } from '../utils';
import { supabase } from '../services/supabaseClient';
import { Plus, Trash, Save, ArrowLeft, Lock, FileText, List, X, Calendar, CreditCard, ChevronDown, Ruler, Users, Briefcase, Percent, DollarSign, RefreshCw, Scale, ShieldCheck, Hash, Tag, UserPlus, Loader2, Package, AlertCircle } from 'lucide-react';

interface InvoiceFormProps {
  onSave: (invoice: Invoice, seriesId: string, action?: 'PRINT' | 'CERTIFY') => void;
  onCancel: () => void;
  onViewList: () => void;
  onAddWorkLocation: () => void; 
  onSaveClient: (client: Client) => void;
  onSaveWorkLocation: (wl: WorkLocation) => void;
  clients: Client[];
  products: Product[];
  workLocations: WorkLocation[];
  cashRegisters: CashRegister[];
  series: DocumentSeries[];
  warehouses?: Warehouse[];
  initialType?: InvoiceType;
  initialData?: Partial<Invoice>;
  currentUser?: string;
  currentUserId?: string;
  currentCompany?: Company;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  onSave, onCancel, onViewList, onSaveClient, onSaveWorkLocation, clients, products, workLocations, cashRegisters, series, warehouses = [],
  initialType, initialData, currentUser, currentUserId, currentCompany
}) => {
  const isRestricted = initialData?.isCertified || false;

  const [selectedSeriesId, setSelectedSeriesId] = useState(initialData?.seriesId || '');
  const [clientId, setClientId] = useState(initialData?.clientId || '');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialType || initialData?.type || InvoiceType.FT);
  const [workLocationId, setWorkLocationId] = useState(initialData?.workLocationId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(initialData?.paymentMethod || '');
  const [cashRegisterId, setCashRegisterId] = useState(initialData?.cashRegisterId || '');
  const [typology, setTypology] = useState('Geral');
  
  const [manualNumber, setManualNumber] = useState(initialData?.number || '');
  const [manualHash, setManualHash] = useState(initialData?.hash || '');
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialData?.date || today);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || today);
  const [accountingDate, setAccountingDate] = useState(initialData?.accountingDate || today);

  const [currency, setCurrency] = useState<string>(initialData?.currency || 'AOA');
  const [exchangeRate, setExchangeRate] = useState<number>(initialData?.exchangeRate || 1);

  const [retentionType, setRetentionType] = useState<'NONE' | 'CAT_50' | 'CAT_100'>(initialData?.retentionType || 'NONE');
  const [hasWithholding, setHasWithholding] = useState<boolean>(!!initialData?.withholdingAmount);

  const [showClientModal, setShowClientModal] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({
      vatNumber: '', name: '', address: '', city: '', postalCode: '', province: '', municipality: '', country: 'Angola', phone: '', email: '', webPage: '', clientType: 'não grupo nacional', initialBalance: 0
  });

  const allowedSeries = useMemo(() => series.filter(s => s.isActive), [series]);
  const selectedSeriesObj = useMemo(() => series.find(s => s.id === selectedSeriesId), [series, selectedSeriesId]);
  const isManualSeries = selectedSeriesObj?.type === 'MANUAL';
  const showPaymentFields = (invoiceType === InvoiceType.FR || invoiceType === InvoiceType.RG || invoiceType === InvoiceType.VD);

  const [items, setItems] = useState<InvoiceItem[]>(() => {
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
          length: i.length || 1,
          width: i.width || 1,
          height: i.height || 1,
          showMetrics: i.showMetrics || false,
          total: i.total !== undefined ? i.total : ((i.quantity || 1) * (i.length || 1) * (i.width || 1) * (i.height || 1) * (i.unitPrice || 0) * (1 - (i.discount || 0)/100)),
          type: i.type || 'PRODUCT',
          expiryDate: i.expiryDate || '',
          valueDate: i.valueDate || today,
          rubrica: i.rubrica || (i.type === 'SERVICE' ? '62.1' : '61.1')
      }));
  });

  const [globalDiscount, setGlobalDiscount] = useState(initialData?.globalDiscount || 0); 
  const [notes, setNotes] = useState(initialData?.notes || '');

  useEffect(() => {
    if (allowedSeries.length > 0 && !selectedSeriesId) {
        if (initialData?.seriesId && allowedSeries.find(s => s.id === initialData.seriesId)) {
            setSelectedSeriesId(initialData.seriesId);
        } else {
            setSelectedSeriesId(allowedSeries[0].id);
        }
    }
  }, [initialData, allowedSeries, selectedSeriesId]);

  useEffect(() => { if (initialType) setInvoiceType(initialType); }, [initialType]);

  useEffect(() => {
      if (currency === 'AOA') setExchangeRate(1);
      else if (currency === 'USD') setExchangeRate(850);
      else if (currency === 'EURO') setExchangeRate(920);
  }, [currency]);

  const calculateLineTotal = (qty: number, length: number = 1, width: number = 1, height: number = 1, price: number, discount: number) => {
      const actualLength = length > 0 ? length : 1;
      const actualWidth = width > 0 ? width : 1;
      const actualHeight = height > 0 ? height : 1;
      const base = qty * actualLength * actualWidth * actualHeight * price;
      const discAmount = base * (discount / 100);
      return base - discAmount;
  };

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = items.reduce((acc, item) => acc + (item.total * (item.taxRate / 100)), 0);
  
  useEffect(() => {
      if (!isRestricted) {
          const hasService = items.some(item => item.type === 'SERVICE');
          if (hasService && subtotal > 20000) setHasWithholding(true);
          else setHasWithholding(false);
      }
  }, [items, subtotal, isRestricted]);

  const withholdingAmount = hasWithholding ? subtotal * 0.065 : 0;
  
  const retentionAmount = useMemo(() => {
      if (retentionType === 'CAT_50') return taxAmount * 0.5;
      if (retentionType === 'CAT_100') return taxAmount;
      return 0;
  }, [retentionType, taxAmount]);

  const discountGlobalValue = subtotal * (globalDiscount / 100);
  const total = (subtotal + taxAmount) - discountGlobalValue - withholdingAmount - retentionAmount;
  const contraValue = total * exchangeRate;

  const handleAddItem = () => {
    if (isRestricted) return;
    setItems([...items, { id: generateId(), description: '', reference: '', quantity: 1, length: 1, width: 1, height: 1, unit: 'un', unitPrice: 0, discount: 0, taxRate: 14, total: 0, type: 'PRODUCT', expiryDate: '', valueDate: today, showMetrics: false, rubrica: '61.1' }]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    if (isRestricted) return;
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      const unitPrice = product.price; 
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        reference: product.barcode || product.id.substring(0,6).toUpperCase(), 
        unit: product.unit || 'un',
        unitPrice: unitPrice,
        type: 'PRODUCT',
        rubrica: '61.1',
        total: calculateLineTotal(newItems[index].quantity, newItems[index].length, newItems[index].width, newItems[index].height, unitPrice, newItems[index].discount)
      };
      setItems(newItems);
    }
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (isRestricted) return;
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    if (['quantity', 'unitPrice', 'discount', 'length', 'width', 'height'].includes(field as string)) {
        item.total = calculateLineTotal(item.quantity, item.length || 1, item.width || 1, item.height || 1, item.unitPrice, item.discount);
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (isRestricted) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveClientFromPOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.vatNumber) return alert('Contribuinte e Nome são obrigatórios');
    
    setIsCreatingClient(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome: newClient.name,
          nif: newClient.vatNumber,
          email: newClient.email,
          telefone: newClient.phone,
          endereco: newClient.address,
          localidade: newClient.city,
          codigo_postal: newClient.postalCode,
          provincia: newClient.province,
          municipio: newClient.municipality,
          pais: 'Angola',
          web_page: newClient.webPage,
          tipo_cliente: newClient.clientType,
          saldo_inicial: Number(newClient.initialBalance || 0),
          empresa_id: currentCompany?.id || '00000000-0000-0000-0000-000000000001'
        })
        .select();

      if (error) throw error;
      const saved = data[0];
      const mappedClient: Client = {
        id: saved.id,
        name: saved.nome,
        vatNumber: saved.nif,
        email: saved.email || '',
        phone: saved.telefone || '',
        address: saved.endereco || '',
        city: saved.localidade || '',
        country: 'Angola',
        province: saved.provincia || '',
        accountBalance: 0,
        initialBalance: Number(saved.saldo_inicial || 0),
        clientType: saved.tipo_cliente || 'não grupo nacional',
        transactions: []
      };
      onSaveClient(mappedClient);
      setClientId(saved.id);
      setShowClientModal(false);
      alert("Cliente registado e selecionado!");
    } catch (err: any) {
      alert("Erro ao registar cliente: " + err.message);
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleSave = (action?: 'PRINT' | 'CERTIFY') => {
      if (!clientId) return alert("Erro: Deve selecionar um Cliente.");
      if (!selectedSeriesId) return alert("Erro: Deve selecionar uma Série Fiscal.");
      if (items.length === 0) return alert("Erro: O documento deve conter pelo menos um item.");
      
      if (isManualSeries && action === 'CERTIFY') {
          if (!manualNumber) return alert("Erro: Número do Documento é obrigatório para séries de recuperação.");
          if (!manualHash) return alert("Erro: Código Hash é obrigatório para séries de recuperação.");
      }

      const newInvoice: Invoice = {
          id: initialData?.id || generateId(),
          type: invoiceType,
          seriesId: selectedSeriesId,
          number: isManualSeries ? manualNumber : (initialData?.number || '---'), 
          hash: isManualSeries ? manualHash : (initialData?.hash || ''),
          date,
          time: new Date().toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'}),
          dueDate,
          accountingDate,
          clientId,
          clientName: clients.find(c => c.id === clientId)?.name || 'Cliente Final',
          clientNif: clients.find(c => c.id === clientId)?.vatNumber,
          items,
          subtotal,
          globalDiscount,
          taxRate: 14, 
          taxAmount,
          withholdingAmount,
          retentionType,
          retentionAmount,
          total,
          currency,
          exchangeRate,
          contraValue,
          status: (invoiceType === InvoiceType.FR || invoiceType === InvoiceType.RG || invoiceType === InvoiceType.VD) ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
          notes,
          isCertified: isRestricted, 
          companyId: currentCompany?.id || '', 
          workLocationId,
          paymentMethod: paymentMethod || undefined,
          cashRegisterId,
          operatorName: currentUser,
          typology,
          source: 'MANUAL'
      };
      onSave(newInvoice, selectedSeriesId, action);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-500 pb-20 relative px-4 sm:px-6">
      {showClientModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2 uppercase tracking-tighter"><UserPlus size={20}/> Registar Cliente na Cloud</h3>
                      <button onClick={() => setShowClientModal(false)} className="hover:bg-red-600 p-1 rounded-full transition"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSaveClientFromPOS} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Contribuinte (NIF) *</label>
                          <input required className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600 font-mono font-bold" placeholder="999999999" value={newClient.vatNumber} onChange={e => setNewClient({...newClient, vatNumber: e.target.value})}/>
                      </div>
                      <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Nome Completo do Cliente *</label>
                          <input required className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600 font-bold" placeholder="Nome Comercial ou Próprio" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})}/>
                      </div>
                      <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Morada</label>
                          <input className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})}/>
                      </div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Localidade</label><input className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})}/></div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Código Postal</label><input className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" value={newClient.postalCode} onChange={e => setNewClient({...newClient, postalCode: e.target.value})}/></div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Província</label><input className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" value={newClient.province} onChange={e => setNewClient({...newClient, province: e.target.value})}/></div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Município</label><input className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" value={newClient.municipality} onChange={e => setNewClient({...newClient, municipality: e.target.value})}/></div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">País</label><input className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 outline-none" value="Angola" readOnly/></div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Telefone</label><input className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" placeholder="(+000) 000 000 000" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})}/></div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Email</label><input type="email" className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})}/></div>
                      <div><label className="text-[10px] font-black text-slate-500 uppercase block mb-1">WebPage</label><input className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600" value={newClient.webPage} onChange={e => setNewClient({...newClient, webPage: e.target.value})}/></div>
                      <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Saldo Inicial (Kz)</label>
                          <input type="number" className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600 font-bold" value={newClient.initialBalance} onChange={e => setNewClient({...newClient, initialBalance: Number(e.target.value)})}/>
                      </div>
                      <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Cliente</label>
                          <select className="w-full border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-blue-600 font-bold" value={newClient.clientType} onChange={e => setNewClient({...newClient, clientType: e.target.value})}>
                              <option value="nacional">nacional</option>
                              <option value="não grupo nacional">não grupo nacional</option>
                              <option value="estrangeiro">estrangeiro</option>
                              <option value="associados">associados</option>
                              <option value="outros">outros</option>
                          </select>
                      </div>
                      <div className="col-span-2 flex justify-end gap-3 mt-4">
                          <button type="button" onClick={() => setShowClientModal(false)} className="px-8 py-3 border-2 border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50">Cancelar</button>
                          <button type="submit" disabled={isCreatingClient} className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2">
                              {isCreatingClient ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Registar Agora
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onCancel} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                <ArrowLeft size={20} /> <span className="font-medium hidden sm:inline">Voltar</span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {invoiceType === InvoiceType.FR ? <Lock size={20} className="text-emerald-500"/> : <FileText size={20} className="text-blue-500"/>}
                {invoiceType === InvoiceType.FR ? 'Nova Fatura/Recibo' : 'Novo Documento'}
                <button onClick={() => setShowClientModal(true)} className="ml-2 p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition shadow-sm border border-blue-200" title="Criar Cliente">
                    <UserPlus size={16}/>
                </button>
            </h1>
        </div>
        <div className="flex gap-2">
            <button onClick={onViewList} className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border"><List size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-10 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                    <FileText size={14} className="text-blue-600"/>
                    <h3 className="font-bold text-slate-700 text-sm uppercase">Dados e Datas do Documento</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as InvoiceType)} disabled={isRestricted}>
                                {Object.values(InvoiceType).filter(t => t !== InvoiceType.RG).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Série Fiscal *</label>
                             <select className={`w-full p-2 border rounded-lg bg-slate-50 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none transition-all ${!selectedSeriesId ? 'border-red-300' : 'border-slate-200'}`} value={selectedSeriesId} onChange={(e) => setSelectedSeriesId(e.target.value)} disabled={isRestricted}>
                                <option value="">Selecione Série...</option>
                                {allowedSeries.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.type}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local de Trabalho</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold" value={workLocationId} onChange={e => setWorkLocationId(e.target.value)} disabled={isRestricted}>
                                <option value="">Sem Local Associado</option>
                                {workLocations.map(wl => <option key={wl.id} value={wl.id}>{wl.name}</option>)}
                            </select>
                         </div>
                    </div>

                    {isManualSeries && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 animate-in slide-in-from-top-2">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1"><Hash size={10}/> Número do Documento (Manual) *</label>
                                <input className={`w-full p-2 border-2 rounded-lg bg-orange-50 text-sm font-bold focus:border-orange-500 outline-none transition-all ${!manualNumber ? 'border-red-300' : 'border-orange-200'}`} placeholder="Ex: FT S/120" value={manualNumber} onChange={e => setManualNumber(e.target.value)}/>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-orange-600 uppercase tracking-wider flex items-center gap-1"><ShieldCheck size={10}/> Código Hash (AGT) *</label>
                                <input className={`w-full p-2 border-2 rounded-lg bg-orange-50 text-sm font-mono focus:border-orange-500 outline-none transition-all ${!manualHash ? 'border-red-300' : 'border-orange-200'}`} placeholder="Assinatura Digital" value={manualHash} onChange={e => setManualHash(e.target.value)}/>
                             </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={10}/> Data Emissão</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={10}/> Data Contabilística</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-blue-50" value={accountingDate} onChange={e => setAccountingDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={10}/> Data Vencimento</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-orange-50" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    {showPaymentFields && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2">
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
                                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Caixa de Recebimento</label>
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
                        <Users size={14} className="text-green-600"/>
                        <h3 className="font-bold text-slate-700 text-sm uppercase">Seleção de Cliente</h3>
                    </div>
                </div>
                <div className="p-5">
                    <select className={`w-full p-3 border rounded-xl text-base font-bold bg-white focus:ring-2 focus:ring-green-200 outline-none shadow-sm transition-all ${!clientId ? 'border-red-300' : 'border-slate-200'}`} value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={isRestricted}>
                        <option value="">-- SELECIONAR CLIENTE (GESTÃO DE CLIENTES) * --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} (NIF: {c.vatNumber})</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><List size={16}/> Itens do Documento</h3>
                    {!isRestricted && (
                        <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2"><Plus size={14} /> Adicionar Linha</button>
                    )}
                </div>
                
                <div className="flex-1 p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                            <tr>
                                <th className="p-3 w-10 text-center"></th>
                                <th className="p-3 w-20">Tipo</th>
                                <th className="p-3 w-32">Ref</th>
                                <th className="p-3">Artigo / Descrição</th>
                                <th className="p-3 w-32 text-center bg-blue-50 text-blue-800">Data Valor</th>
                                <th className="p-3 w-20 text-center">Qtd</th>
                                <th className="p-3 w-28 text-center">Unidade</th>
                                <th className="p-3 w-28 text-right">Preço Un.</th>
                                <th className="p-3 w-16 text-center">IVA %</th>
                                <th className="p-3 w-16 text-center">Desc%</th>
                                <th className="p-3 w-28 text-right">Total</th>
                                {!isRestricted && <th className="p-3 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-2 text-center"><button onClick={() => handleUpdateItem(index, 'showMetrics', !item.showMetrics)} className={`p-1.5 rounded-lg transition-all ${item.showMetrics ? 'bg-blue-100 text-blue-600 rotate-180' : 'text-slate-300 hover:text-blue-500'}`}><Ruler size={16}/></button></td>
                                        <td className="p-2"><select className="w-full bg-transparent text-[10px] font-bold text-slate-600 outline-none" value={item.type} onChange={(e) => handleUpdateItem(index, 'type', e.target.value as any)} disabled={isRestricted}><option value="PRODUCT">PROD</option><option value="SERVICE">SERV</option></select></td>
                                        <td className="p-2"><input className="w-full p-1 border border-slate-200 rounded text-[10px] font-mono focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Referência" value={item.reference || ''} onChange={e => handleUpdateItem(index, 'reference', e.target.value)} disabled={isRestricted}/></td>
                                        <td className="p-2">
                                            <div className="flex flex-col gap-1">
                                                {item.type === 'PRODUCT' && (
                                                    <select className="w-full p-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-bold text-blue-700 bg-blue-50" onChange={(e) => handleProductSelect(index, e.target.value)} value={item.productId || ''} disabled={isRestricted}>
                                                        <option value="">-- SELECIONAR ARTIGO (STOCK REAL) * --</option>
                                                        {products.map(p => (
                                                          <option key={p.id} value={p.id}>
                                                            {p.id.substring(0,8).toUpperCase()} | {p.name} | {p.stock <= 0 ? 'SEM STOCK' : `STOCK: ${p.stock} ${p.unit}`} | {p.stock < 0 ? 'NEGATIVO' : 'EM STOCK'}
                                                          </option>
                                                        ))}
                                                    </select>
                                                )}
                                                <input className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none text-xs font-bold" placeholder="Descrição do item *..." value={item.description} onChange={(e) => handleUpdateItem(index, 'description', e.target.value)} disabled={isRestricted} />
                                            </div>
                                        </td>
                                        <td className="p-2 bg-blue-50/30"><input type="date" className="w-full p-1 border border-blue-200 rounded text-[10px] font-bold text-center bg-white" value={item.valueDate || today} onChange={e => handleUpdateItem(index, 'valueDate', e.target.value)} disabled={isRestricted}/></td>
                                        <td className="p-2 text-center"><input type="number" className="w-full p-1.5 text-center border border-slate-200 rounded bg-white text-sm font-bold" value={item.quantity} onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))} disabled={isRestricted} /></td>
                                        <td className="p-2 text-center"><select className="w-full p-1.5 border border-slate-200 rounded bg-white text-[10px] font-bold" value={item.unit || 'un'} onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)} disabled={isRestricted}><option value="un">un</option><option value="kg">kg</option><option value="mês">mês</option><option value="dia">dia</option></select></td>
                                        <td className="p-2 text-right"><input type="number" className="w-full p-1.5 text-right border border-slate-200 rounded bg-white text-sm font-bold" value={item.unitPrice} onChange={(e) => handleUpdateItem(index, 'unitPrice', Number(e.target.value))} disabled={isRestricted} /></td>
                                        <td className="p-2 text-center"><select className="w-full p-1.5 border border-slate-200 rounded bg-white text-xs font-bold" value={item.taxRate} onChange={(e) => handleUpdateItem(index, 'taxRate', Number(e.target.value))} disabled={isRestricted}><option value={14}>14%</option><option value={7}>7%</option><option value={5}>5%</option><option value={0}>Isento</option></select></td>
                                        <td className="p-2 text-center"><input type="number" className="w-full p-1.5 text-center border border-slate-200 rounded bg-white text-sm" value={item.discount} onChange={(e) => handleUpdateItem(index, 'discount', Number(e.target.value))} disabled={isRestricted} /></td>
                                        <td className="p-2 text-right font-black text-slate-700 text-sm">{formatCurrency(item.total).replace('Kz','')}</td>
                                        {!isRestricted && <td className="p-2 text-center"><button onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-red-500 p-1"><Trash size={16} /></button></td>}
                                    </tr>
                                    {item.showMetrics && (
                                        <tr className="bg-blue-50/50 animate-in slide-in-from-top-2">
                                            <td className="p-2 border-r border-blue-100"></td>
                                            <td colSpan={10} className="p-3">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2"><span className="text-[10px] font-black text-blue-600 uppercase">Volume:</span><Ruler size={14} className="text-blue-400"/></div>
                                                    <div className="flex flex-wrap gap-4">
                                                        <div className="flex items-center gap-2"><label className="text-[10px] font-bold text-slate-400 uppercase">C (m)</label><input type="number" className="w-20 p-1 border border-blue-200 rounded bg-white text-xs font-bold" value={item.length || 1} onChange={e => handleUpdateItem(index, 'length', Number(e.target.value))} disabled={isRestricted} /></div>
                                                        <div className="flex items-center gap-2"><label className="text-[10px] font-bold text-slate-400 uppercase">L (m)</label><input type="number" className="w-20 p-1 border border-blue-200 rounded bg-white text-xs font-bold" value={item.width || 1} onChange={e => handleUpdateItem(index, 'width', Number(e.target.value))} disabled={isRestricted} /></div>
                                                        <div className="flex items-center gap-2"><label className="text-[10px] font-bold text-slate-400 uppercase">A (m)</label><input type="number" className="w-20 p-1 border border-blue-200 rounded bg-white text-xs font-bold" value={item.height || 1} onChange={e => handleUpdateItem(index, 'height', Number(e.target.value))} disabled={isRestricted} /></div>
                                                        <div className="flex items-center gap-2 ml-4"><span className="text-[10px] font-bold text-slate-400 uppercase">Total m³:</span><span className="text-xs font-black text-blue-700">{(Number(item.length || 1) * Number(item.width || 1) * Number(item.height || 1)).toFixed(2)}</span></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Observações Adicionais</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-lg h-20 text-sm resize-none focus:border-blue-500 outline-none" placeholder="Notas do documento..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isRestricted}></textarea>
            </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden sticky top-24">
                <div className="bg-slate-800 text-white px-4 py-4 flex items-center gap-2"><CreditCard size={18}/><h3 className="font-bold text-xs uppercase">Resumo Financeiro</h3></div>
                <div className="p-4 space-y-6">
                    <div className="space-y-4">
                         <div className="grid grid-cols-1 gap-4">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moeda</label>
                                <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm" value={currency} onChange={e => setCurrency(e.target.value)} disabled={isRestricted}>
                                    <option value="AOA">AOA (Kwanzas)</option><option value="USD">USD (Dólares)</option><option value="EURO">EURO (Euros)</option>
                                </select>
                             </div>
                             <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Câmbio</label><input type="number" className="w-full p-2 border border-slate-200 rounded-lg bg-white font-black text-sm" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} disabled={isRestricted} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contravalor ({currency})</label><div className="w-full p-2 bg-slate-100 rounded-lg font-black text-sm text-slate-600 truncate border border-slate-200 text-right">{formatCurrency(contraValue).replace('Kz', currency)}</div></div>
                             </div>
                         </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"><Tag size={12}/> Desconto Global (%)</label><input type="number" className="w-full p-2 border-2 border-blue-100 rounded-lg bg-white font-black text-sm text-blue-600 outline-none" value={globalDiscount} onChange={e => setGlobalDiscount(Number(e.target.value))} disabled={isRestricted} placeholder="0%"/></div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Scale size={12}/> Retenção na Fonte (6,5%)</label>
                            <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 p-2 rounded-lg border border-indigo-100"><input type="checkbox" checked={hasWithholding} onChange={e => setHasWithholding(e.target.checked)} className="w-4 h-4" disabled={true}/><span className="text-[9px] font-bold text-indigo-700 uppercase">Auto</span></label>
                        </div>
                        {/* NOVO CAMPO: CATIVAÇÃO DE IVA */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={12}/> Cativação de IVA</label>
                            <select 
                                className="w-full p-2 border-2 border-blue-100 rounded-lg bg-white font-bold text-xs focus:border-blue-500 outline-none"
                                value={retentionType}
                                onChange={e => setRetentionType(e.target.value as any)}
                                disabled={isRestricted}
                            >
                                <option value="NONE">Sem Cativação</option>
                                <option value="CAT_50">Cativação 50%</option>
                                <option value="CAT_100">Cativação 100%</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-100 text-[10px] uppercase font-bold">
                        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {globalDiscount > 0 && <div className="flex justify-between text-red-600"><span>Desc. Global</span><span>-{formatCurrency(discountGlobalValue)}</span></div>}
                        <div className="flex justify-between text-slate-600 pt-2"><span>Imposto (IVA)</span><span>{formatCurrency(taxAmount)}</span></div>
                        {hasWithholding && <div className="flex justify-between text-red-600"><span>Retenção 6,5%</span><span>-{formatCurrency(withholdingAmount)}</span></div>}
                        {retentionAmount > 0 && <div className="flex justify-between text-indigo-600"><span>Cativação IVA</span><span>-{formatCurrency(retentionAmount)}</span></div>}
                        <div className="pt-4 mt-4 border-t-2 border-slate-800 flex flex-col items-end gap-1">
                            <span className="font-bold text-[9px] text-slate-400 uppercase tracking-widest">Valor Final</span>
                            <span className="font-black text-xl text-blue-600 tracking-tighter leading-none">{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleSave()} className="py-3 px-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl flex items-center justify-center gap-2 transition-all border-2 border-blue-500 transform active:scale-95">
                    <Save size={18} /> Emitir Documento
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;