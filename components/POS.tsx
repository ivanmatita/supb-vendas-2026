import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Product, Client, Invoice, InvoiceItem, InvoiceType, 
  InvoiceStatus, PaymentMethod, CashRegister, DocumentSeries, 
  POSConfig, Company, User, WorkLocation, Warehouse
} from '../types';
import { formatCurrency, generateId, formatDate, generateQrCodeUrl } from '../utils';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, User as UserIcon, 
  X, CreditCard, Monitor, CornerUpLeft, Printer, Image as ImageIcon, 
  AlertTriangle, ArrowRightLeft, Tag, MessageSquare, Utensils, 
  BedDouble, ShoppingBag, LayoutGrid, CheckCircle2, History,
  Maximize2, Minimize2, Split, DollarSign, Calculator,
  BriefcaseBusiness, UserPlus, ChevronRight
} from 'lucide-react';

interface POSProps {
  products: Product[];
  clients: Client[];
  invoices: Invoice[];
  series: DocumentSeries[];
  cashRegisters: CashRegister[];
  config: POSConfig;
  onSaveInvoice: (invoice: Invoice, seriesId: string, action?: 'PRINT' | 'CERTIFY') => void;
  onGoBack: () => void;
  currentUser: User;
  company: Company;
  workLocations?: WorkLocation[];
  warehouses?: Warehouse[];
}

type POSArea = 'RETAIL' | 'RESTAURANT' | 'HOTEL' | 'GENERAL';

const POS: React.FC<POSProps> = ({ 
  products, clients, invoices, series, cashRegisters, config, 
  onSaveInvoice, onGoBack, currentUser, company, workLocations = [], warehouses = []
}) => {
  // --- STATE ---
  const [selectedArea, setSelectedArea] = useState<POSArea | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(config.defaultSeriesId || '');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(config.defaultPaymentMethod);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedWorkLocationId, setSelectedWorkLocationId] = useState('');
  
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
      if (!selectedSeriesId && series.length > 0) {
          const posSeries = series.find(s => s.type === 'POS' || s.code.includes('POS')) || series[0];
          setSelectedSeriesId(posSeries.id);
      }
      if (!selectedClient && config.defaultClientId) {
          const defClient = clients.find(c => c.id === config.defaultClientId);
          if(defClient) setSelectedClient(defClient);
      }
      if (workLocations.length > 0) {
          setSelectedWorkLocationId(workLocations[0].id);
      }
  }, [series, clients, config, workLocations]);

  // --- LOGIC ---
  const categories = useMemo(() => {
      const cats = new Set(products.map(p => p.category || 'Geral'));
      return ['ALL', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.barcode && p.barcode.includes(searchTerm));
          const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
          return matchSearch && matchCat;
      });
  }, [products, searchTerm, selectedCategory]);

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const discountAmount = subtotal * (globalDiscount / 100);
  const cartTotal = subtotal - discountAmount;
  const changeAmount = Math.max(0, receivedAmount - cartTotal);

  const addToCart = (product: Product) => {
      const existing = cart.find(i => i.productId === product.id);
      if (existing) {
          updateQuantity(existing.id, existing.quantity + 1);
      } else {
          const newItem: InvoiceItem = {
              id: generateId(),
              productId: product.id,
              type: 'PRODUCT',
              description: product.name,
              quantity: 1,
              unitPrice: product.price,
              discount: 0,
              taxRate: 14,
              total: product.price,
              rubrica: '61.1'
          };
          setCart([...cart, newItem]);
      }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
      if (newQty <= 0) {
          setCart(cart.filter(item => item.id !== itemId));
          return;
      }
      setCart(cart.map(item => {
          if (item.id === itemId) {
              const total = newQty * item.unitPrice * (1 - item.discount / 100);
              return { ...item, quantity: newQty, total };
          }
          return item;
      }));
  };

  const handleFinalize = () => {
      if (cart.length === 0 || !selectedSeriesId) return;

      const totalItemsPrice = cart.reduce((acc, i) => acc + i.total, 0);
      const totalDisc = totalItemsPrice * (globalDiscount / 100);
      const finalTotal = totalItemsPrice - totalDisc;
      const finalTax = finalTotal - (finalTotal / 1.14);

      const newInvoice: Invoice = {
          id: generateId(),
          type: InvoiceType.FR,
          seriesId: selectedSeriesId,
          number: 'POS-Pending',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          dueDate: new Date().toISOString().split('T')[0],
          accountingDate: new Date().toISOString().split('T')[0],
          clientId: selectedClient?.id || 'CONSUMIDOR_FINAL',
          clientName: selectedClient?.name || 'Consumidor Final',
          clientNif: selectedClient?.vatNumber || '999999999',
          items: cart,
          subtotal: finalTotal / 1.14,
          globalDiscount: globalDiscount,
          taxRate: 14,
          taxAmount: finalTax,
          total: finalTotal,
          paidAmount: finalTotal,
          currency: 'AOA',
          exchangeRate: 1,
          status: InvoiceStatus.PAID,
          isCertified: true,
          companyId: company.id,
          workLocationId: selectedWorkLocationId || currentUser.workLocationId || '',
          paymentMethod: paymentMethod,
          cashRegisterId: cashRegisters.find(c => c.status === 'OPEN')?.id,
          operatorName: currentUser.name,
          notes: orderNotes,
          source: 'POS'
      };

      onSaveInvoice(newInvoice, selectedSeriesId, 'CERTIFY');
      setLastInvoice(newInvoice);
      setCart([]);
      setReceivedAmount(0);
      setGlobalDiscount(0);
      setOrderNotes('');
      setShowPaymentModal(false);
      setShowReceipt(true);
  };

  const handleTransfer = () => {
      if (cart.length === 0) return alert("Carrinho vazio!");
      setShowTransferModal(true);
  };

  const confirmTransfer = (targetTerminal: string) => {
      alert(`Venda transferida com sucesso para o terminal: ${targetTerminal}`);
      setCart([]);
      setOrderNotes('');
      setShowTransferModal(false);
  };

  // --- RENDERERS ---

  if (!selectedArea) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
              <div className="text-center mb-12">
                  <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
                      <Monitor size={40}/>
                  </div>
                  <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ponto de Venda Central</h1>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2">Selecione a área operacional para iniciar</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl w-full">
                  {[
                      { id: 'RETAIL', label: 'Venda de Balcão / Loja', icon: ShoppingBag, color: 'blue', desc: 'Faturação direta e ágil' },
                      { id: 'RESTAURANT', label: 'Restaurante / Bar', icon: Utensils, color: 'orange', desc: 'Gestão de mesas e comandas' },
                      { id: 'HOTEL', label: 'Hotelaria / Alojamento', icon: BedDouble, color: 'indigo', desc: 'Reservas e check-out' },
                      { id: 'GENERAL', label: 'Vendas Corporativas', icon: BriefcaseBusiness, color: 'slate', desc: 'Documentos personalizados' }
                  ].map((area) => (
                      <button 
                        key={area.id}
                        onClick={() => setSelectedArea(area.id as POSArea)}
                        className={`bg-white/5 hover:bg-white/10 border-2 border-white/5 hover:border-${area.color}-500 p-8 rounded-[2rem] flex flex-col items-center gap-6 transition-all duration-300 group hover:-translate-y-2`}
                      >
                          <div className={`p-6 rounded-2xl bg-${area.color}-500/10 text-${area.color}-500 group-hover:scale-110 transition-transform`}>
                              <area.icon size={48}/>
                          </div>
                          <div className="text-center">
                              <h3 className="text-white font-black text-lg uppercase tracking-tight mb-1">{area.label}</h3>
                              <p className="text-slate-500 text-xs font-medium">{area.desc}</p>
                          </div>
                      </button>
                  ))}
              </div>

              <button 
                onClick={onGoBack}
                className="mt-12 text-slate-500 font-bold uppercase text-xs hover:text-white transition flex items-center gap-2"
              >
                  <CornerUpLeft size={16}/> Sair do PDV
              </button>
          </div>
      );
  }

  const ReceiptView = () => {
    // Group taxes for summary
    const taxSummary: Record<string, { rate: number, base: number, amount: number }> = {};
    lastInvoice?.items.forEach(item => {
        const key = item.taxRate.toString();
        if (!taxSummary[key]) taxSummary[key] = { rate: item.taxRate, base: 0, amount: 0 };
        taxSummary[key].base += item.total / (1 + item.taxRate / 100);
        taxSummary[key].amount += item.total - (item.total / (1 + item.taxRate / 100));
    });

    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-[450px] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" size={24}/>
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter">Venda Concluída</h3>
                  </div>
                  <button onClick={() => setShowReceipt(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X/></button>
              </div>
              
              <div className="bg-white p-6 rounded-2xl w-full font-mono text-[10px] text-black shadow-inner border border-slate-200 overflow-y-auto max-h-[60vh] custom-scrollbar" id="receipt-thermal">
                  <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-4">
                      <h4 className="font-black text-sm uppercase tracking-tight">{company.name}</h4>
                      <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">{company.address}</p>
                      <p className="text-[9px] font-black mt-1">NIF: {company.nif}</p>
                      <p className="text-[9px] text-slate-400 mt-1">REGIME: {company.regime}</p>
                  </div>
                  
                  <div className="space-y-1 mb-4 border-b border-dashed border-slate-300 pb-4">
                      <div className="flex justify-between"><span>DOCUMENTO:</span> <span className="font-black">{lastInvoice?.type} {lastInvoice?.number}</span></div>
                      <div className="flex justify-between"><span>DATA:</span> <span className="font-bold">{formatDate(lastInvoice?.date || '')} {lastInvoice?.time}</span></div>
                      <div className="flex justify-between"><span>CLIENTE:</span> <span className="font-bold uppercase">{lastInvoice?.clientName}</span></div>
                      <div className="flex justify-between"><span>NIF CLIENTE:</span> <span className="font-bold">{lastInvoice?.clientNif}</span></div>
                      <div className="flex justify-between"><span>OPERADOR:</span> <span className="uppercase font-bold">{lastInvoice?.operatorName}</span></div>
                  </div>

                  <table className="w-full mb-4">
                      <thead>
                        <tr className="border-b border-black text-[9px] font-black">
                          <th className="text-left py-1">ARTIGO</th>
                          <th className="text-center py-1">QTD</th>
                          <th className="text-right py-1">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lastInvoice?.items.map((it, idx) => (
                          <tr key={idx} className="group h-8">
                              <td className="py-1 font-bold text-slate-800 uppercase">{it.description}</td>
                              <td className="text-center py-1 font-black">{it.quantity}</td>
                              <td className="text-right py-1 font-black">{formatCurrency(it.total).replace('Kz','')}</td>
                          </tr>
                        ))}
                      </tbody>
                  </table>

                  {/* Quadro Resumo IVA */}
                  <div className="mb-4 border-t border-black pt-2">
                      <div className="text-[8px] font-black uppercase mb-1">Quadro Resumo de Impostos</div>
                      <table className="w-full text-[8px]">
                          <thead>
                              <tr className="border-b border-slate-300 text-slate-400">
                                  <th className="text-left">TAXA</th>
                                  <th className="text-right">INCIDÊNCIA</th>
                                  <th className="text-right">VALOR IVA</th>
                              </tr>
                          </thead>
                          <tbody>
                              {Object.entries(taxSummary).map(([rate, vals]) => (
                                  <tr key={rate}>
                                      <td className="font-bold">IVA {rate}%</td>
                                      <td className="text-right font-mono">{formatCurrency(vals.base).replace('Kz','')}</td>
                                      <td className="text-right font-mono">{formatCurrency(vals.amount).replace('Kz','')}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <div className="space-y-1 border-t-2 border-black pt-3">
                      <div className="flex justify-between text-xs"><span>SUBTOTAL LIQUIDO</span> <span>{formatCurrency(lastInvoice?.subtotal || 0).replace('Kz','')}</span></div>
                      <div className="flex justify-between text-xs text-red-600"><span>DESCONTOS</span> <span>-{formatCurrency((lastInvoice?.subtotal || 0) * (globalDiscount / 100)).replace('Kz','')}</span></div>
                      <div className="flex justify-between text-xs"><span>TOTAL IMPOSTOS</span> <span>{formatCurrency(lastInvoice?.taxAmount || 0).replace('Kz','')}</span></div>
                      <div className="flex justify-between font-black text-xl border-t-2 border-black pt-2 mt-2">
                          <span className="uppercase tracking-widest">A PAGAR</span>
                          <span>{formatCurrency(lastInvoice?.total || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-500 mt-2">
                          <span>FORMA PAGAMENTO:</span>
                          <span>{paymentMethod}</span>
                      </div>
                  </div>

                  <div className="mt-8 text-center">
                      <div className="bg-white p-2 border-2 border-black inline-block shadow-sm">
                        <img src={generateQrCodeUrl(lastInvoice?.hash || 'POS-OFFLINE')} alt="QR" className="w-24 h-24 mx-auto"/>
                      </div>
                      <p className="font-black font-mono text-[11px] mt-2 tracking-[4px] uppercase">{lastInvoice?.hash || 'DRAFT'}</p>
                      <div className="h-px bg-slate-300 w-full my-4 border-dashed border-t"></div>
                      <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest leading-tight">
                        Processado por Programa Certificado nº 25/AGT/2019 <br/>
                        IMATECO SOFTWARE V.2.0 - ERP CORPORATIVO
                      </p>
                      <p className="text-[7px] text-slate-400 mt-2 font-bold uppercase italic">Os bens/serviços foram colocados à disposição na data e local deste documento.</p>
                  </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button onClick={() => window.print()} className="flex-1 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-xl">
                    <Printer size={18}/> Imprimir
                </button>
                <button onClick={() => setShowReceipt(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-xl">
                    Nova Venda
                </button>
              </div>
          </div>
          <style>{`@media print { body * { visibility: hidden; } #receipt-thermal, #receipt-thermal * { visibility: visible; } #receipt-thermal { position: absolute; left: 0; top: 0; width: 80mm; padding: 5mm; margin: 0; } @page { size: 80mm auto; margin: 0; } }`}</style>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans selection:bg-blue-100">
      {showReceipt && ReceiptView()}
      
      {/* LEFT CONTENT: Products & Catalog */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
          <div className="bg-white p-4 border-b flex flex-col gap-4 shadow-sm z-10">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedArea(null)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition shadow-inner">
                        <CornerUpLeft size={20}/>
                      </button>
                      <div className="relative group">
                          <Search className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20}/>
                          <input 
                            ref={searchInputRef}
                            className="w-[400px] pl-11 pr-4 py-3 bg-slate-100 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800"
                            placeholder="Pesquisar por nome, categoria ou código de barras..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="hidden xl:flex flex-col text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedArea}</span>
                          <span className="font-black text-slate-900 text-sm">{currentUser.name}</span>
                      </div>
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-lg border-2 border-slate-800">
                          {currentUser.name.charAt(0)}
                      </div>
                  </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {categories.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)} 
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                            selectedCategory === cat 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20 scale-105' 
                                : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {cat === 'ALL' ? 'Todos os Itens' : cat}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 content-start bg-slate-50/50">
              {filteredProducts.map(p => (
                  <div 
                    key={p.id} 
                    className="bg-white rounded-[2rem] shadow-sm border-2 border-transparent hover:border-blue-500 overflow-hidden cursor-pointer transition-all duration-300 group flex flex-col hover:shadow-2xl hover:-translate-y-1 active:scale-95" 
                    onClick={() => addToCart(p)}
                  >
                      <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-300 relative">
                          {p.imageUrl ? (
                              <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name}/>
                          ) : (
                              <ImageIcon size={48} className="opacity-20"/>
                          )}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg">
                                  <Plus size={16}/>
                              </div>
                          </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{p.category}</span>
                              <h3 className="font-bold text-slate-800 text-xs line-clamp-2 h-8 mt-1 group-hover:text-blue-700 transition-colors leading-tight">{p.name}</h3>
                          </div>
                          <div className="flex justify-between items-end mt-4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Stock: {p.stock}</span>
                              <p className="text-slate-900 font-black text-lg leading-none tracking-tighter">{formatCurrency(p.price)}</p>
                          </div>
                      </div>
                  </div>
              ))}
              {filteredProducts.length === 0 && (
                  <div className="col-span-full py-32 text-center">
                      <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-6 flex items-center justify-center text-slate-400">
                          <Search size={32}/>
                      </div>
                      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum produto encontrado</p>
                  </div>
              )}
          </div>
      </div>

      {/* RIGHT SIDEBAR: Cart & Checkout */}
      <div className="w-[450px] bg-white flex flex-col shadow-2xl relative border-l border-slate-200">
          <div className="p-6 bg-slate-900 text-white shrink-0">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                      <ShoppingCart className="text-blue-400" size={24}/>
                      <h2 className="font-black text-lg uppercase tracking-tighter">Carrinho de Venda</h2>
                  </div>
                  <div className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black text-blue-400 uppercase tracking-widest">{selectedArea}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Série Fiscal</label>
                      <select 
                        className="bg-slate-800 w-full p-2.5 rounded-xl text-xs font-bold outline-none border border-white/5 focus:border-blue-500 transition-colors"
                        value={selectedSeriesId}
                        onChange={e => setSelectedSeriesId(e.target.value)}
                      >
                          {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                      </select>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Local de Trabalho</label>
                      <select 
                        className="bg-slate-800 w-full p-2.5 rounded-xl text-xs font-bold outline-none border border-white/5 focus:border-blue-500 transition-colors"
                        value={selectedWorkLocationId}
                        onChange={e => setSelectedWorkLocationId(e.target.value)}
                      >
                          {workLocations.map(wl => <option key={wl.id} value={wl.id}>{wl.name}</option>)}
                      </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cliente Selecionado</label>
                      <div className="flex gap-2">
                        <select 
                            className="bg-slate-800 flex-1 p-2.5 rounded-xl text-xs font-bold outline-none border border-white/5 focus:border-blue-500 transition-colors"
                            value={selectedClient?.id || ''}
                            onChange={e => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                        >
                            <option value="">Consumidor Final (NIF: 999999999)</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button className="p-2.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl border border-white/5 transition">
                            <UserPlus size={20}/>
                        </button>
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 custom-scrollbar">
              {cart.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-blue-200 transition-all group animate-in slide-in-from-right-4">
                      <div className="flex-1 min-w-0 pr-4">
                          <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-tight truncate leading-tight">{item.description}</h4>
                          <span className="text-[10px] font-bold text-blue-600">{formatCurrency(item.unitPrice)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:bg-white hover:text-blue-600 rounded-lg transition-all text-slate-400"><Minus size={14}/></button>
                              <span className="w-10 text-center font-black text-sm text-slate-700">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 hover:bg-white hover:text-blue-600 rounded-lg transition-all text-slate-400"><Plus size={14}/></button>
                          </div>
                          <div className="w-24 text-right">
                            <span className="font-black text-slate-900 text-sm tracking-tighter">{formatCurrency(item.total)}</span>
                          </div>
                          <button onClick={() => updateQuantity(item.id, 0)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                             <Trash2 size={16}/>
                          </button>
                      </div>
                  </div>
              ))}
              {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 select-none">
                      <div className="p-8 rounded-full bg-slate-100 border-4 border-dashed border-slate-200">
                        <ShoppingCart size={64}/>
                      </div>
                      <p className="font-black uppercase text-xs tracking-[4px]">Ponto de Venda Vazio</p>
                  </div>
              )}
          </div>

          <div className="p-6 border-t bg-white space-y-4">
              <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                          <Tag size={16} className="text-blue-500"/> Desconto Global (%)
                      </div>
                      <input 
                        type="number" 
                        max={100} 
                        min={0}
                        className="w-16 bg-white border rounded-lg p-1 text-center font-black text-blue-600"
                        value={globalDiscount}
                        onChange={e => setGlobalDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                      />
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                          <MessageSquare size={16} className="text-indigo-500"/> Notas / Obs
                      </div>
                      <button onClick={() => { const n = prompt("Notas da Venda:", orderNotes); if(n !== null) setOrderNotes(n); }} className="text-[10px] font-black text-blue-600 hover:underline uppercase">Editar</button>
                  </div>
              </div>

              <div className="pt-2">
                  <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase mb-1">
                      <span>Subtotal Liquido</span>
                      <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {globalDiscount > 0 && (
                      <div className="flex justify-between items-center text-red-600 text-xs font-bold uppercase mb-1">
                          <span>Desconto ({globalDiscount}%)</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                  )}
                  <div className="flex justify-between items-end">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Total a Receber</span>
                      <div className="text-right">
                          <span className="text-[10px] text-blue-600 font-bold block mb-1">IVA 14% Incluído</span>
                          <span className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(cartTotal)}</span>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                  <button 
                    onClick={handleTransfer}
                    disabled={cart.length === 0}
                    className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl flex items-center justify-center transition disabled:opacity-50"
                    title="Transferir Venda"
                  >
                      <ArrowRightLeft size={24}/>
                  </button>
                  <button 
                    onClick={() => setShowPaymentModal(true)} 
                    disabled={cart.length === 0}
                    className="col-span-4 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-lg shadow-xl shadow-blue-500/20 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                      FINALIZAR PAGAMENTO <ChevronRight size={20}/>
                  </button>
              </div>
          </div>

          {/* TRANSFER MODAL */}
          {showTransferModal && (
              <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                      <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner">
                              <ArrowRightLeft size={32}/>
                          </div>
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Transferir Venda</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase mt-1">Selecione o terminal de destino</p>
                      </div>

                      <div className="space-y-2 mb-8">
                          {['Terminal Central 01', 'Quiosque Exterior', 'Balcão B', 'Take-Away Norte'].map(term => (
                              <button 
                                key={term}
                                onClick={() => confirmTransfer(term)}
                                className="w-full p-4 bg-slate-50 hover:bg-blue-50 text-slate-700 font-bold rounded-2xl text-left flex justify-between items-center transition group border border-transparent hover:border-blue-200"
                              >
                                  <span>{term}</span>
                                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500"/>
                              </button>
                          ))}
                      </div>

                      <button onClick={() => setShowTransferModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-[4px] hover:text-slate-600 transition">Cancelar Operação</button>
                  </div>
              </div>
          )}

          {/* PAYMENT MODAL */}
          {showPaymentModal && (
              <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                  <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                      <div className="bg-slate-900 text-white p-8 flex justify-between items-center border-b-4 border-emerald-500">
                          <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Checkout Final</h2>
                            <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1">Selecione o método de pagamento</p>
                          </div>
                          <button onClick={() => setShowPaymentModal(false)} className="bg-slate-800 hover:bg-red-600 p-2 rounded-full transition border border-white/10"><X/></button>
                      </div>
                      <div className="p-8 space-y-6">
                          <div className="grid grid-cols-2 gap-3">
                              {[
                                { id: 'CASH', label: 'Dinheiro', icon: '💵' },
                                { id: 'MULTICAIXA', label: 'Multicaixa', icon: '💳' },
                                { id: 'TRANSFER', label: 'Transferência', icon: '🏦' },
                                { id: 'OTHERS', label: 'Cartão Frota', icon: '⛽' }
                              ].map(m => (
                                <button 
                                    key={m.id}
                                    onClick={() => setPaymentMethod(m.id as PaymentMethod)} 
                                    className={`p-5 rounded-3xl border-2 font-black text-xs uppercase tracking-widest flex flex-col items-center gap-3 transition-all ${
                                        paymentMethod === m.id 
                                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/10' 
                                            : 'border-slate-100 hover:border-blue-200'
                                    }`}
                                >
                                    <span className="text-3xl">{m.icon}</span>
                                    {m.label}
                                </button>
                              ))}
                          </div>
                          
                          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4">
                              <div className="flex justify-between items-center">
                                  <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Total Geral</span>
                                  <span className="text-3xl font-black text-slate-900">{formatCurrency(cartTotal)}</span>
                              </div>
                              
                              {paymentMethod === 'CASH' && (
                                  <div className="space-y-4 pt-4 border-t border-slate-200">
                                      <div className="space-y-1">
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Entregue pelo Cliente</label>
                                          <input 
                                            type="number" 
                                            className="w-full text-3xl font-black p-4 bg-white border-2 border-blue-600 rounded-2xl text-right text-blue-700 focus:ring-4 focus:ring-blue-100 outline-none transition" 
                                            placeholder="0.00" 
                                            onChange={e => setReceivedAmount(Number(e.target.value))}
                                            autoFocus
                                          />
                                      </div>
                                      <div className="flex justify-between items-center bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/20">
                                          <span className="font-black uppercase text-xs tracking-widest">Troco a Entregar:</span>
                                          <span className="text-2xl font-black">{formatCurrency(changeAmount)}</span>
                                      </div>
                                  </div>
                              )}
                          </div>

                          <button 
                            onClick={handleFinalize} 
                            className="w-full bg-slate-900 hover:bg-black text-white font-black py-6 rounded-[2rem] text-xl shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-3 uppercase tracking-tighter"
                          >
                              <CheckCircle2 size={24} className="text-emerald-400"/> CONCLUIR E EMITIR FR
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default POS;