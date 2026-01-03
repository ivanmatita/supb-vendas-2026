
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Warehouse, StockMovement, PriceTable, InvoiceType, Supplier, Purchase, CashRegister, Client, WorkLocation, DocumentSeries, Invoice } from '../types';
import { formatCurrency, formatDate, generateId } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  Package, Plus, Trash2, Box, X, MapPin, BarChart3, Database, RefreshCw, Save, 
  CreditCard, User, Phone, List, ShoppingBag, Calculator, CheckCircle, 
  Monitor, ArrowRightLeft, Edit2, AlertTriangle, Search, AlignJustify, Percent,
  Loader2, PlusCircle, Calendar, ImageIcon, Upload, ShoppingCart
} from 'lucide-react';
import PurchaseForm from './PurchaseForm';

interface StockManagerProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  warehouses: Warehouse[];
  setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  priceTables: PriceTable[];
  setPriceTables: React.Dispatch<React.SetStateAction<PriceTable[]>>;
  movements: StockMovement[];
  onStockMovement: (movement: StockMovement) => void;
  onCreateDocument: (type: InvoiceType, items: any[], notes: string) => void;
  onOpenReportOverlay: () => void;
  cashRegisters?: CashRegister[];
  clients?: Client[];
  workLocations?: WorkLocation[];
  series?: DocumentSeries[];
  invoices?: Invoice[];
  purchases?: Purchase[];
  suppliers?: Supplier[];
  onSavePurchase?: (purchase: Purchase) => void;
}

const StockManager: React.FC<StockManagerProps> = ({ 
  products, setProducts, warehouses, setWarehouses, 
  movements: localMovements, onStockMovement, onCreateDocument, onOpenReportOverlay,
  clients = [], warehouses: propWarehouses = [], invoices = [], purchases = [],
  suppliers = [], onSavePurchase, cashRegisters = [], workLocations = []
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STOCK_GERAL' | 'WAREHOUSES'>('DASHBOARD');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [cloudMovements, setCloudMovements] = useState<StockMovement[]>([]);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showPurchaseFormInCloud, setShowPurchaseFormInCloud] = useState(false);

  const [newWarehouse, setNewWarehouse] = useState<Partial<Warehouse>>({
      name: '', location: '', description: '', managerName: '', contact: '', observations: ''
  });

  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadProductId, setActiveUploadProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchCloudData();
    fetchMovementsCloud();
  }, []);

  async function fetchMovementsCloud() {
    setIsLoadingMovements(true);
    try {
        const { data } = await supabase.from('movimentos_stock').select('*').order('data', { ascending: false });
        if (data) {
            setCloudMovements(data.map(m => ({
                id: m.id,
                date: m.data,
                type: m.tipo as 'ENTRY' | 'EXIT',
                productId: m.produto_id,
                productName: m.produto_nome,
                quantity: Number(m.quantidade),
                warehouseId: m.armazem_id,
                documentRef: m.documento_ref,
                notes: m.notas,
                expiryDate: m.expiry_date,
                itemType: m.item_type
            })));
        }
    } catch (err) { console.error(err); } finally { setIsLoadingMovements(false); }
  }

  async function fetchCloudData() {
      try {
          const { data: arms } = await supabase.from('armazens').select('*');
          if (arms) setWarehouses(arms.map(a => ({ 
            id: a.id, name: a.nome, location: a.localizacao, description: a.descricao, 
            managerName: a.responsavel, contact: a.contacto, observations: a.observacoes 
          })));
          
          const { data: prods } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
          if (prods) {
              setProducts(prods.map(p => ({ 
                id: p.id, name: p.nome, costPrice: p.preco || 0, price: (p.preco || 0) * 1.3, 
                stock: Number(p.stock || 0), warehouseId: '', unit: 'un', category: 'Geral', minStock: 0, priceTableId: 'pt1', barcode: p.barcode,
                imageUrl: p.image_url
              })));
          }
      } catch (err) { console.error(err); }
  }

  const allMovements = useMemo(() => {
    const salesMovements: StockMovement[] = invoices.filter(inv => inv.isCertified && inv.status !== 'Anulado').flatMap(inv => 
        inv.items.filter(it => it.type === 'PRODUCT' && it.productId).map(it => ({
            id: `sale-${inv.id}-${it.id}`,
            date: inv.date,
            type: inv.type === InvoiceType.NC ? 'ENTRY' : 'EXIT',
            productId: it.productId!,
            productName: it.description,
            quantity: it.quantity,
            warehouseId: inv.targetWarehouseId || '',
            documentRef: inv.number,
            notes: `Venda via ${inv.type}`,
            expiryDate: it.expiryDate
        }))
    );

    const purchaseMovements: StockMovement[] = purchases.filter(p => p.status !== 'CANCELLED').flatMap(pur => 
        pur.items.filter(it => it.productId || it.description).map(it => ({
            id: `pur-${pur.id}-${it.id}`,
            date: pur.date,
            type: 'ENTRY',
            productId: it.productId || '',
            productName: it.description,
            quantity: it.quantity,
            warehouseId: it.warehouseId || pur.warehouseId || '',
            documentRef: pur.documentNumber,
            notes: `Compra via ${pur.type}`,
            expiryDate: it.expiryDate,
            itemType: it.itemType
        }))
    );

    return [...cloudMovements, ...localMovements, ...salesMovements, ...purchaseMovements]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cloudMovements, localMovements, invoices, purchases]);

  const stockStats = useMemo(() => {
    const stats: Record<string, { in: number, out: number, balance: number, name: string, artNo: string, barcode?: string, closestExpiry?: string, itemType?: string, imageUrl?: string }> = {};
    
    products.forEach(p => {
        stats[p.id] = { in: 0, out: 0, balance: 0, name: p.name, artNo: p.id.substring(0,8).toUpperCase(), barcode: p.barcode, closestExpiry: '', itemType: 'Produto', imageUrl: p.imageUrl };
    });

    allMovements.forEach(m => {
        const id = m.productId || m.productName; 
        if (!stats[id]) {
            stats[id] = { in: 0, out: 0, balance: 0, name: m.productName, artNo: 'Manual', barcode: '---', closestExpiry: '', itemType: m.itemType, imageUrl: '' };
        }

        if (m.type === 'ENTRY') {
            stats[id].in += m.quantity;
            if (m.expiryDate && (!stats[id].closestExpiry || new Date(m.expiryDate) < new Date(stats[id].closestExpiry))) {
                stats[id].closestExpiry = m.expiryDate;
            }
        } else {
            stats[id].out += m.quantity;
        }
    });

    Object.keys(stats).forEach(id => { stats[id].balance = stats[id].in - stats[id].out; });
    return stats;
  }, [products, allMovements]);

  const handleUploadClick = (productId: string) => {
    setActiveUploadProductId(productId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadProductId) {
        setIsSaving(true);
        try {
            const url = URL.createObjectURL(file);
            const { error } = await supabase
                .from('produtos')
                .update({ image_url: url })
                .eq('id', activeUploadProductId);
            
            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === activeUploadProductId ? { ...p, imageUrl: url } : p));
            alert("Imagem carregada com sucesso!");
        } catch (err: any) {
            alert("Erro ao carregar imagem: " + err.message);
        } finally {
            setIsSaving(false);
            setActiveUploadProductId(null);
        }
    }
  };

  const handleSaveWarehouse = async () => {
      if (!newWarehouse.name) return alert("Nome do armazém é obrigatório");
      setIsSaving(true);
      try {
          const { error } = await supabase.from('armazens').insert({
              nome: newWarehouse.name,
              localizacao: newWarehouse.location,
              descricao: newWarehouse.description,
              responsavel: newWarehouse.managerName,
              contacto: newWarehouse.contact,
              observacoes: newWarehouse.observations
          });
          if (error) throw error;
          setShowWarehouseModal(false);
          setNewWarehouse({ name: '', location: '', description: '', managerName: '', contact: '', observations: '' });
          fetchCloudData();
          alert("Armazém registado com sucesso!");
      } catch (err: any) { alert("Erro: " + err.message); } finally { setIsSaving(false); }
  };

  const handleEmitirEntrada = async () => {
    if (!warehouseId || items.length === 0) return alert("Preencha o Armazém e adicione itens.");
    setIsSaving(true);
    try {
      for (const item of items) {
        await supabase.from('movimentos_stock').insert({
            tipo: 'ENTRY',
            produto_id: item.productId,
            produto_nome: item.name,
            quantidade: item.quantity,
            armazem_id: warehouseId,
            documento_ref: `ENT-MANUAL-${new Date().getTime()}`,
            notas: item.notes || "Entrada manual de stock",
            expiry_date: item.expiry_date || null,
            item_type: item.itemType || 'Produto',
            empresa_id: '00000000-0000-0000-0000-000000000001'
        });
      }
      alert("Entrada registada na Cloud!");
      setShowProductModal(false);
      setItems([]);
      fetchMovementsCloud();
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleAddItemToEntry = (prodId: string) => {
      const prod = products.find(p => p.id === prodId);
      if (prod) {
          setItems([...items, { productId: prod.id, name: prod.name, quantity: 1, notes: '', expiryDate: '', itemType: 'Produto' }]);
      }
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600">
            <p className="text-[10px] font-black text-slate-400 uppercase">Artigos em Catálogo</p>
            <h3 className="text-2xl font-black text-slate-800">{products.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-600">
            <p className="text-[10px] font-black text-slate-400 uppercase">Produtos Vendidos</p>
            <h3 className="text-2xl font-black text-emerald-600">{allMovements.filter(m => m.type === 'EXIT').reduce((a,b)=>a+b.quantity, 0)} un</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-600">
            <p className="text-[10px] font-black text-slate-400 uppercase">Stock Negativo / Alerta</p>
            <h3 className="text-2xl font-black text-red-600">{(Object.values(stockStats) as any).filter((s:any) => s.balance < 0).length} artigos</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-600">
            <p className="text-[10px] font-black text-slate-400 uppercase">Esgotados</p>
            <h3 className="text-2xl font-black text-orange-600">{(Object.values(stockStats) as any).filter((s:any) => s.balance === 0).length} artigos</h3>
        </div>
    </div>
  );

  const renderStockGeral = () => {
      const statsList = Object.keys(stockStats).map(id => ({ id, ...stockStats[id] }));
      return (
          <div className="bg-white border border-slate-300 rounded shadow-lg overflow-hidden animate-in zoom-in-95">
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase flex items-center gap-2"><Monitor size={18} className="text-blue-400"/> Painel de Monitorização: Stock Geral Consolidado</h3>
                  <div className="flex gap-4">
                     <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase"><AlertTriangle size={12}/> Stock Negativo</span>
                     <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold uppercase"><ShoppingCart size={12}/> Saídas (Vendas)</span>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-black uppercase border-b-2 border-slate-300">
                          <tr>
                              <th className="p-3 w-16">Foto</th>
                              <th className="p-3">Artº Nº</th>
                              <th className="p-3">Descrição do Produto</th>
                              <th className="p-3">Tipologia</th>
                              <th className="p-3 text-center">Próx. Validade</th>
                              <th className="p-3 text-right">Entradas</th>
                              <th className="p-3 text-right">Saídas</th>
                              <th className="p-3 text-right bg-slate-200">Stock Atual</th>
                              <th className="p-3 text-center">Estado</th>
                              <th className="p-3 text-center">Opções</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {statsList.map((item) => (
                              <tr key={item.id} className={`hover:bg-blue-50/50 transition-colors ${item.balance < 0 ? 'bg-red-50' : ''}`}>
                                  <td className="p-3 text-center">
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                                          {item.imageUrl ? (
                                              <img src={item.imageUrl} className="w-full h-full object-cover" alt="Produto"/>
                                          ) : (
                                              <ImageIcon size={16} className="text-slate-300"/>
                                          )}
                                          <button onClick={() => handleUploadClick(item.id)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                              <Upload size={12}/>
                                          </button>
                                      </div>
                                  </td>
                                  <td className="p-3 font-bold text-slate-500">{item.artNo}</td>
                                  <td className="p-3 font-black text-slate-800 uppercase">{item.name}</td>
                                  <td className="p-3 uppercase font-bold text-slate-500">{item.itemType || 'Produto'}</td>
                                  <td className="p-3 text-center font-bold text-blue-600">
                                      {item.closestExpiry ? formatDate(item.closestExpiry) : '---'}
                                  </td>
                                  <td className="p-3 text-right text-emerald-600 font-black">+{item.in}</td>
                                  <td className="p-3 text-right text-red-600 font-black">-{item.out}</td>
                                  <td className={`p-3 text-right font-black ${item.balance < 0 ? 'text-red-700 bg-red-100' : 'bg-slate-50'}`}>{item.balance}</td>
                                  <td className="p-3 text-center">
                                      {item.balance < 0 ? (
                                          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Negativo</span>
                                      ) : item.balance === 0 ? (
                                          <span className="bg-orange-400 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Esgotado</span>
                                      ) : (
                                          <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Em Stock</span>
                                      )}
                                  </td>
                                  <td className="p-3">
                                      <div className="flex justify-center gap-1">
                                          <button className="p-1.5 bg-white border rounded text-slate-400 hover:text-blue-600 shadow-sm"><ArrowRightLeft size={14}/></button>
                                          <button className="p-1.5 bg-white border rounded text-slate-400 hover:text-orange-600 shadow-sm"><Edit2 size={14}/></button>
                                          <button className="p-1.5 bg-white border rounded text-slate-400 hover:text-red-600 shadow-sm"><Trash2 size={14}/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange}/>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20 h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
                 <h1 className="text-xl font-bold text-slate-800">Gestão de Artigos & Stock</h1>
                 <p className="text-xs text-slate-500 flex items-center gap-1"><Database size={12}/> Sincronizado com Supabase Cloud</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
                <button onClick={() => { setWarehouseId(''); setItems([]); setShowProductModal(true); }} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-black shadow-md">
                    <PlusCircle size={16}/> Lançar Ajuste Manual
                </button>
                <button onClick={() => setShowPurchaseFormInCloud(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-orange-700 shadow-md">
                    <ShoppingBag size={16}/> Registar Compra
                </button>
                <div className="h-6 w-px bg-slate-300 mx-2"></div>
                <button onClick={() => { setActiveTab('DASHBOARD'); setShowPurchaseFormInCloud(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${activeTab === 'DASHBOARD' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Painel</button>
                <button onClick={() => { setActiveTab('STOCK_GERAL'); setShowPurchaseFormInCloud(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold border transition flex items-center gap-2 ${activeTab === 'STOCK_GERAL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                    <Monitor size={14}/> Stock Geral
                </button>
                <button onClick={() => { setActiveTab('WAREHOUSES'); setShowPurchaseFormInCloud(false); }} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${activeTab === 'WAREHOUSES' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Armazéns</button>
                <button onClick={onOpenReportOverlay} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all active:scale-95"><BarChart3 size={16}/> Relatórios</button>
            </div>
        </div>

        {showPurchaseFormInCloud ? (
            <div className="animate-in slide-in-from-right">
                <PurchaseForm 
                  onSave={(p) => { onSavePurchase?.(p); setShowPurchaseFormInCloud(false); fetchMovementsCloud(); }} 
                  onCancel={() => setShowPurchaseFormInCloud(false)} 
                  onViewList={() => setShowPurchaseFormInCloud(false)}
                  products={products}
                  suppliers={suppliers}
                  workLocations={workLocations}
                  cashRegisters={cashRegisters}
                  warehouses={propWarehouses}
                  onSaveSupplier={() => {}}
                />
            </div>
        ) : (
            <>
                {activeTab === 'DASHBOARD' && renderDashboard()}
                {activeTab === 'STOCK_GERAL' && renderStockGeral()}
                {activeTab === 'WAREHOUSES' && (
                    <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 flex justify-between items-center bg-slate-100 border-b border-slate-200">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Gestão de Armazéns Cloud</h2>
                            <button onClick={() => setShowWarehouseModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-green-700 shadow-md">
                                <Plus size={16}/> Novo Armazém
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] text-left">
                                <thead className="bg-slate-700 text-white font-bold uppercase">
                                    <tr>
                                        <th className="p-3">Nome</th>
                                        <th className="p-3">Localização</th>
                                        <th className="p-3">Responsável</th>
                                        <th className="p-3">Contacto</th>
                                        <th className="p-3">Descrição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {propWarehouses.map(w => (
                                        <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-bold text-slate-800 uppercase">{w.name}</td>
                                            <td className="p-3 text-slate-600">{w.location}</td>
                                            <td className="p-3 text-slate-600">{w.managerName || '---'}</td>
                                            <td className="p-3 text-slate-600 font-mono">{w.contact || '---'}</td>
                                            <td className="p-3 text-slate-500 italic">{w.description || '---'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        )}

        {/* MODAL: ENTRADA DE STOCK */}
        {showProductModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl animate-in zoom-in-95 overflow-hidden">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                        <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
                            <PlusCircle className="text-blue-400"/> Lançar Entrada de Stock Manual
                        </h3>
                        <button onClick={() => setShowProductModal(false)} className="hover:bg-red-600 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Armazém de Destino *</label>
                                <select 
                                    className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold focus:border-blue-600 outline-none"
                                    value={warehouseId}
                                    onChange={e => setWarehouseId(e.target.value)}
                                >
                                    <option value="">Seleccione o Armazém...</option>
                                    {propWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Seleccionar Produto</label>
                                <select 
                                    className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold focus:border-blue-600 outline-none"
                                    onChange={e => e.target.value && handleAddItemToEntry(e.target.value)}
                                    value=""
                                >
                                    <option value="">Adicionar item à lista...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px]">
                                    <tr>
                                        <th className="p-3">Produto</th>
                                        <th className="p-3 text-center bg-blue-50">Tipologia</th>
                                        <th className="p-3 text-center w-24">Qtd</th>
                                        <th className="p-3 w-40">Obs</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-bold text-slate-700">{item.name}</td>
                                            <td className="p-3 bg-blue-50/20">
                                                <select 
                                                    className="w-full p-1 border rounded text-center font-bold text-[10px]" 
                                                    value={item.itemType} 
                                                    onChange={e => {
                                                        const newItems = [...items];
                                                        newItems[idx].itemType = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                >
                                                    <option value="Produto">Produto</option>
                                                    <option value="Mercadoria">Mercadoria</option>
                                                    <option value="Outros">Outros</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    type="number" 
                                                    className="w-full p-1 border rounded text-center font-bold" 
                                                    value={item.quantity} 
                                                    onChange={e => {
                                                        const newItems = [...items];
                                                        newItems[idx].quantity = Number(e.target.value);
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    className="w-full p-1 border rounded text-[10px]" 
                                                    placeholder="Notas..." 
                                                    value={item.notes}
                                                    onChange={e => {
                                                        const newItems = [...items];
                                                        newItems[idx].notes = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-slate-300 italic">Nenhum item adicionado à lista.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900 flex justify-end gap-3">
                        <button onClick={() => setShowProductModal(false)} className="px-8 py-3 border-2 border-slate-700 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-800">Cancelar</button>
                        <button onClick={handleEmitirEntrada} disabled={isSaving || !warehouseId || items.length === 0} className="px-12 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-blue-500 transition disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>} Confirmar Entrada
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: NOVO ARMAZÉM */}
        {showWarehouseModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 overflow-hidden">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                        <h3 className="font-bold text-xl flex items-gap-3 tracking-tighter uppercase">
                            <Box className="text-green-400"/> Novo Armazém Cloud
                        </h3>
                        <button onClick={() => setShowWarehouseModal(false)} className="hover:bg-slate-800 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] font-black uppercase">
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Nome do Armazém <span className="text-red-500">*</span></label>
                            <input className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 outline-none transition font-black text-slate-800 uppercase" value={newWarehouse.name} onChange={e => setNewWarehouse({...newWarehouse, name: e.target.value})} placeholder="Ex: Armazém Central Viana" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Descrição do Armazém</label>
                            <input className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 outline-none transition text-slate-700 font-bold" value={newWarehouse.description} onChange={e => setNewWarehouse({...newWarehouse, description: e.target.value})} placeholder="Finalidade do Armazém (Ex: Stock Principal)" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Localização</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input className="w-full pl-10 p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-bold" value={newWarehouse.location} onChange={e => setNewWarehouse({...newWarehouse, location: e.target.value})} placeholder="Endereço Físico" />
                            </div>
                        </div>
                        <div>
                            <label className="text-slate-500 mb-1 block">Responsável</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input className="w-full pl-10 p-3 border-2 border-slate-100 bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-bold" value={newWarehouse.managerName} onChange={e => setNewWarehouse({...newWarehouse, managerName: e.target.value})} placeholder="Gestor do Armazém" />
                            </div>
                        </div>
                        <div>
                            <label className="text-slate-500 mb-1 block">Contacto</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input className="w-full pl-10 p-3 border-2 border-slate-100 bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-mono font-bold" value={newWarehouse.contact} onChange={e => setNewWarehouse({...newWarehouse, contact: e.target.value})} placeholder="(+244) 9XX XXX XXX" />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Observações</label>
                            <textarea className="w-full p-3 border-2 border-slate-100 bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-medium h-24 resize-none" value={newWarehouse.observations} onChange={e => setNewWarehouse({...newWarehouse, observations: e.target.value})} placeholder="Notas adicionais..."></textarea>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t-2 border-slate-100">
                        <button onClick={() => setShowWarehouseModal(false)} className="px-8 py-3 border-4 border-slate-200 rounded-2xl text-slate-400 hover:bg-white transition uppercase font-black text-[10px]">Cancelar</button>
                        <button onClick={handleSaveWarehouse} disabled={isSaving} className="px-12 py-3 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Gravar Armazém
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default StockManager;
