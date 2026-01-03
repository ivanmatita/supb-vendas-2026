
import React, { useState } from 'react';
import { POSConfig, DocumentSeries, Client } from '../types';
import { Save, Monitor, ShieldCheck, Printer, CreditCard, Layout } from 'lucide-react';

interface POSSettingsProps {
  config: POSConfig;
  onSaveConfig: (cfg: POSConfig) => void;
  series: DocumentSeries[];
  clients: Client[];
}

const POSSettings: React.FC<POSSettingsProps> = ({ config, onSaveConfig, series, clients }) => {
  const [localConfig, setLocalConfig] = useState<POSConfig>(config);

  const handleSave = () => {
    onSaveConfig(localConfig);
    alert("Configurações do POS salvas com sucesso!");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in h-full pb-20">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Monitor className="text-blue-600"/> Configurações do POS</h1>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Parâmetros operacionais do Ponto de Venda</p>
            </div>
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition transform active:scale-95">
                <Save size={18}/> Salvar Definições
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Bloco: Emissão */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-blue-600"/> Parâmetros de Emissão</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Série Padrão de Venda</label>
                        <select 
                            className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 focus:border-blue-600 outline-none transition" 
                            value={localConfig.defaultSeriesId} 
                            onChange={e => setLocalConfig({...localConfig, defaultSeriesId: e.target.value})}
                        >
                            {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Cliente Padrão (Consumidor Final)</label>
                        <select 
                            className="w-full p-3 border-2 border-slate-100 rounded-xl font-bold bg-slate-50 focus:border-blue-600 outline-none transition" 
                            value={localConfig.defaultClientId} 
                            onChange={e => setLocalConfig({...localConfig, defaultClientId: e.target.value})}
                        >
                            <option value="">Consumidor Final (Diverso)</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Bloco: Interface e Hardware */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><Layout size={16} className="text-indigo-600"/> Interface e Hardware</h3>
                
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Printer className="text-slate-400" size={20}/>
                            <div>
                                <p className="font-bold text-sm text-slate-700">Impressão Automática</p>
                                <p className="text-[10px] text-slate-400">Imprimir recibo após certificar</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={localConfig.autoPrint} onChange={e => setLocalConfig({...localConfig, autoPrint: e.target.checked})}/>
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Monitor className="text-slate-400" size={20}/>
                            <div>
                                <p className="font-bold text-sm text-slate-700">Imagens de Produtos</p>
                                <p className="text-[10px] text-slate-400">Exibir fotos no catálogo</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={localConfig.showImages} onChange={e => setLocalConfig({...localConfig, showImages: e.target.checked})}/>
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Formato de Recibo</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setLocalConfig({...localConfig, printerType: '80mm'})} className={`p-3 border-2 rounded-xl font-bold text-xs uppercase transition ${localConfig.printerType === '80mm' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-100 hover:border-slate-300'}`}>Térmico P80</button>
                            <button onClick={() => setLocalConfig({...localConfig, printerType: 'A4'})} className={`p-3 border-2 rounded-xl font-bold text-xs uppercase transition ${localConfig.printerType === 'A4' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-slate-100 hover:border-slate-300'}`}>Laser A4</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default POSSettings;
