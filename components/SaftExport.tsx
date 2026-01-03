import React, { useState, useMemo } from 'react';
import { Invoice, Purchase, InvoiceType, PurchaseType, Client, Supplier } from '../types';
// Add missing icons: RefreshCw, AlertTriangle
import { FileJson, Download, Calendar, CheckCircle, AlertCircle, PieChart, FileText, List, Users, ShoppingBag, Landmark, Eye, Check, X, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';

interface SaftExportProps {
  invoices: Invoice[];
  purchases: Purchase[];
  clients?: Client[];
  suppliers?: Supplier[];
}

const SaftExport: React.FC<SaftExportProps> = ({ invoices, purchases, clients = [], suppliers = [] }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [saftType, setSaftType] = useState<'SALES' | 'PURCHASE' | 'TOTAL'>('SALES');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'HEADER' | 'CUSTOMERS' | 'SUPPLIERS' | 'DOCUMENTS' | 'TAXES'>('HEADER');
  const [isDataValidated, setIsDataValidated] = useState(false);

  // --- REGRAS AGT: VALIDAÇÃO DE PERÍODO MENSAL COMPLETO ---
  const validationError = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getDate() !== 1) return "O período deve iniciar no dia 01 do mês.";
    const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    if (end.getDate() !== lastDayOfMonth) return `O período deve terminar no último dia do mês (Dia ${lastDayOfMonth}).`;
    if (start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear()) return "O SAF-T deve ser gerado para apenas um mês de cada vez.";
    
    return null;
  }, [startDate, endDate]);

  // Filter Logic using accountingDate/date
  const filteredInvoices = useMemo(() => invoices.filter(i => {
      const d = new Date(i.accountingDate || i.date);
      return d >= new Date(startDate) && d <= new Date(endDate) && i.isCertified;
  }), [invoices, startDate, endDate]);

  const filteredPurchases = useMemo(() => purchases.filter(p => {
      const d = new Date(p.date);
      return d >= new Date(startDate) && d <= new Date(endDate) && p.status !== 'CANCELLED';
  }), [purchases, startDate, endDate]);

  const relevantClients = useMemo(() => {
      const clientIdsInSales = new Set(filteredInvoices.map(i => i.clientId));
      return clients.filter(c => clientIdsInSales.has(c.id));
  }, [clients, filteredInvoices]);

  const relevantSuppliers = useMemo(() => {
      const supplierIdsInPurchases = new Set(filteredPurchases.map(p => p.supplierId));
      return suppliers.filter(s => supplierIdsInPurchases.has(s.id));
  }, [suppliers, filteredPurchases]);

  const totalSales = filteredInvoices.reduce((acc, i) => acc + (i.currency === 'AOA' ? i.total : i.contraValue || i.total), 0);
  const totalPurchases = filteredPurchases.reduce((acc, p) => acc + p.total, 0);

  const handleDownload = () => {
      if (validationError) return;
      setIsGenerating(true);
      
      // Simulação de geração de XML dinâmico seguindo o layout AGT
      setTimeout(() => {
          const xmlContent = `<?xml version="1.0" encoding="Windows-1252"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO:1.01_01">
    <Header>
        <AuditFileVersion>1.01_01</AuditFileVersion>
        <CompanyID>5000780316</CompanyID>
        <TaxRegistrationNumber>5000780316</TaxRegistrationNumber>
        <TaxAccountingBasis>F</TaxAccountingBasis>
        <CompanyName>C &amp; V - COMERCIO GERAL E PRESTAÇAO DE SERVIÇOS, LDA</CompanyName>
        <BusinessName>IMATEC SOFTWARE</BusinessName>
        <CompanyAddress>
            <AddressDetail>Luanda, Angola</AddressDetail>
            <City>Luanda</City>
            <Country>AO</Country>
        </CompanyAddress>
        <FiscalYear>${new Date(startDate).getFullYear()}</FiscalYear>
        <StartDate>${startDate}</StartDate>
        <EndDate>${endDate}</EndDate>
        <CurrencyCode>AOA</CurrencyCode>
        <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
        <TaxEntity>Global</TaxEntity>
        <ProductCompanyID>IMATEC_SOFT_LDR_25_AGT</ProductCompanyID>
        <SoftwareCertificateNumber>25/AGT/2019</SoftwareCertificateNumber>
    </Header>
    <MasterFiles>
        <Customer>
            ${relevantClients.map(c => `
            <CustomerID>${c.id}</CustomerID>
            <AccountID>31.1.2.1</AccountID>
            <CustomerTaxID>${c.vatNumber}</CustomerTaxID>
            <CompanyName>${c.name}</CompanyName>
            `).join('')}
        </Customer>
    </MasterFiles>
    <SourceDocuments>
        <SalesInvoices>
            <NumberOfEntries>${filteredInvoices.length}</NumberOfEntries>
            <TotalDebit>0.00</TotalDebit>
            <TotalCredit>${totalSales.toFixed(2)}</TotalCredit>
            ${filteredInvoices.map(i => `
            <Invoice>
                <InvoiceNo>${i.number}</InvoiceNo>
                <InvoiceStatus>N</InvoiceStatus>
                <Hash>${i.hash}</Hash>
                <Period>${new Date(i.date).getMonth() + 1}</Period>
                <InvoiceDate>${i.date}</InvoiceDate>
                <InvoiceType>${i.type}</InvoiceType>
                <CustomerID>${i.clientId}</CustomerID>
            </Invoice>
            `).join('')}
        </SalesInvoices>
    </SourceDocuments>
</AuditFile>`;

          const blob = new Blob([xmlContent], { type: 'text/xml' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `SAF-T_AO_${saftType}_${startDate}_${endDate}.xml`;
          a.click();
          window.URL.revokeObjectURL(url);
          setIsGenerating(false);
          alert("Ficheiro SAF-T gerado e baixado com sucesso!");
      }, 2000);
  };

  const renderPreview = () => (
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900 text-white p-4 flex gap-2 overflow-x-auto border-b border-slate-800">
              <button onClick={() => setActivePreviewTab('HEADER')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition ${activePreviewTab === 'HEADER' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>01. Cabeçalho / Auditoria</button>
              <button onClick={() => setActivePreviewTab('CUSTOMERS')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition ${activePreviewTab === 'CUSTOMERS' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>02. MasterFiles: Clientes</button>
              <button onClick={() => setActivePreviewTab('SUPPLIERS')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition ${activePreviewTab === 'SUPPLIERS' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>03. MasterFiles: Fornecedores</button>
              <button onClick={() => setActivePreviewTab('DOCUMENTS')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition ${activePreviewTab === 'DOCUMENTS' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>04. Source: Documentos</button>
              <button onClick={() => setActivePreviewTab('TAXES')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition ${activePreviewTab === 'TAXES' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>05. TaxTable: Impostos</button>
          </div>

          <div className="p-8 min-h-[400px]">
              {activePreviewTab === 'HEADER' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Identificação do Software</h4>
                          <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-600 uppercase">Número do Certificado: <span className="text-blue-600">25/AGT/2019</span></p>
                              <p className="text-xs font-bold text-slate-600 uppercase">Produtor de Software: <span className="text-blue-600">IMATEC SOFTWARE, LDA</span></p>
                              <p className="text-xs font-bold text-slate-600 uppercase">Versão do Validador: <span className="text-blue-600">1.01_01</span></p>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Identificação do Periodo</h4>
                          <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800">{new Date(startDate).getFullYear()}</p>
                              <p className="text-xs font-bold text-slate-600 uppercase">Data Início: <span className="text-slate-800">{startDate}</span></p>
                              <p className="text-xs font-bold text-slate-600 uppercase">Data Fim: <span className="text-slate-800">{endDate}</span></p>
                          </div>
                      </div>
                  </div>
              )}

              {activePreviewTab === 'CUSTOMERS' && (
                  <div className="animate-in fade-in">
                      <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 font-black uppercase text-[9px] text-slate-500 border-b">
                              <tr><th className="p-2">ID</th><th className="p-2">NIF</th><th className="p-2">Nome Comercial</th><th className="p-2">Cidade</th><th className="p-2">País</th></tr>
                          </thead>
                          <tbody className="divide-y">
                              {relevantClients.map(c => (
                                  <tr key={c.id} className="hover:bg-blue-50/50">
                                      <td className="p-2 font-mono text-slate-400">{c.id.substring(0,6)}</td>
                                      <td className="p-2 font-bold">{c.vatNumber}</td>
                                      <td className="p-2 font-black uppercase">{c.name}</td>
                                      <td className="p-2">{c.city}</td>
                                      <td className="p-2">AO</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {activePreviewTab === 'DOCUMENTS' && (
                  <div className="animate-in fade-in space-y-8">
                      <div>
                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle size={14}/> Vendas e Outros Documentos (${filteredInvoices.length} registos)</h4>
                          <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-50 font-black uppercase text-[9px] text-slate-500 border-b">
                                  <tr><th className="p-2">Número</th><th className="p-2">Data</th><th className="p-2">Cliente</th><th className="p-2 text-right">Total Bruto</th><th className="p-2 text-center">Estado</th></tr>
                              </thead>
                              <tbody className="divide-y">
                                  {filteredInvoices.map(i => (
                                      <tr key={i.id} className="hover:bg-blue-50/50">
                                          <td className="p-2 font-black text-blue-800">{i.number}</td>
                                          <td className="p-2 font-mono">{i.date}</td>
                                          <td className="p-2 truncate max-w-[200px] uppercase font-bold">{i.clientName}</td>
                                          <td className="p-2 text-right font-black">{formatCurrency(i.total).replace('Kz','')}</td>
                                          <td className="p-2 text-center text-[10px] font-black">N</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activePreviewTab === 'TAXES' && (
                  <div className="animate-in fade-in">
                      <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 font-black uppercase text-[9px] text-slate-500 border-b">
                              <tr><th className="p-2">Código</th><th className="p-2">Tipo</th><th className="p-2">Descrição da Taxa</th><th className="p-2 text-right">Percentagem</th></tr>
                          </thead>
                          <tbody className="divide-y">
                              <tr><td className="p-2 font-bold">IVA</td><td className="p-2">IVA</td><td className="p-2">Taxa Normal 14%</td><td className="p-2 text-right font-black">14.00%</td></tr>
                              <tr><td className="p-2 font-bold">ISE</td><td className="p-2">IVA</td><td className="p-2">Isento (Artigo 12.º CIVA)</td><td className="p-2 text-right font-black">0.00%</td></tr>
                          </tbody>
                      </table>
                  </div>
              )}
          </div>

          <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
              <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest">
                  <ShieldCheck size={18}/> Estrutura Validada pela AGT (Simulação)
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setIsDataValidated(false)} className="px-6 py-2 border-2 border-slate-300 rounded-xl font-black text-[10px] uppercase text-slate-400">Recalcular</button>
                  <button onClick={handleDownload} disabled={isGenerating} className="px-12 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-blue-700 transition flex items-center gap-2">
                      {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <Download size={16}/>} Baixar Ficheiro SAF-T
                  </button>
              </div>
          </div>
      </div>
  );

  return (
    <div className="p-6 space-y-8 animate-in fade-in pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <FileJson className="text-blue-600" size={32}/> Geração de SAF-T Angola
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Exportação Digital Oficial conforme Decreto 31/19</p>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-xl border-2 border-slate-200">
            <span className="text-[10px] font-black text-slate-400 block uppercase mb-1">Status de Software</span>
            <span className="text-xs font-black text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle size={14}/> Licenciado e Certificado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Configuração da Exportação */}
          <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm space-y-6">
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2">
                      <Landmark className="text-blue-600" size={16}/> Parâmetros de Exportação
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Ficheiro SAF-T</label>
                          <div className="grid grid-cols-1 gap-2">
                              <button onClick={() => setSaftType('SALES')} className={`p-4 rounded-xl border-2 font-black text-[10px] uppercase text-left transition flex items-center justify-between ${saftType === 'SALES' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                                  <span>Faturação de Vendas</span>
                                  {saftType === 'SALES' && <Check size={16}/>}
                              </button>
                              <button onClick={() => setSaftType('PURCHASE')} className={`p-4 rounded-xl border-2 font-black text-[10px] uppercase text-left transition flex items-center justify-between ${saftType === 'PURCHASE' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                                  <span>Aquisição de Compras</span>
                                  {saftType === 'PURCHASE' && <Check size={16}/>}
                              </button>
                              <button onClick={() => setSaftType('TOTAL')} className={`p-4 rounded-xl border-2 font-black text-[10px] uppercase text-left transition flex items-center justify-between ${saftType === 'TOTAL' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                                  <span>Contabilidade Integrada</span>
                                  {saftType === 'TOTAL' && <Check size={16}/>}
                              </button>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Data Início</label>
                              <input type="date" className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Data Fim</label>
                              <input type="date" className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
                          </div>
                      </div>

                      {validationError && (
                          <div className="bg-red-50 text-red-700 p-4 rounded-2xl border-2 border-red-100 flex items-start gap-3">
                              <AlertTriangle size={20} className="shrink-0"/>
                              <p className="text-[10px] font-black uppercase leading-relaxed">{validationError}</p>
                          </div>
                      )}

                      <button 
                        onClick={() => setIsDataValidated(true)}
                        disabled={!!validationError}
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          <Eye size={18}/> Validar e Ver Dados
                      </button>
                  </div>
              </div>

              <div className="bg-blue-600 rounded-3xl p-8 text-white space-y-4 shadow-xl">
                  <h4 className="font-black uppercase text-sm flex items-center gap-2"><ShieldCheck size={20}/> Conformidade Fiscal</h4>
                  <p className="text-xs text-blue-100 leading-relaxed font-medium">
                      O sistema IMATEC garante que os documentos certificados não podem ser alterados após a emissão, mantendo a integridade da assinatura RSA obrigatória para a submissão correta no portal da AGT.
                  </p>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                      <p className="text-[9px] font-black text-blue-200 uppercase mb-2">Resumo do Período</p>
                      <div className="flex justify-between items-end">
                          <span className="text-3xl font-black">{filteredInvoices.length}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Docs de Venda</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Área de Visualização/Preview */}
          <div className="lg:col-span-8">
              {isDataValidated ? renderPreview() : (
                  <div className="h-full bg-slate-100 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-300 p-20 text-center gap-6">
                      <FileJson size={80} className="opacity-20"/>
                      <div>
                          <h3 className="font-black text-xl uppercase text-slate-400">Aguardando Validação</h3>
                          <p className="text-sm font-bold max-w-sm mt-2">Selecione o tipo de SAF-T e o período mensal completo para iniciar a pré-visualização dos dados de auditoria.</p>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default SaftExport;