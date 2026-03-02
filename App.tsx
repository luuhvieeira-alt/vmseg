import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Users, TrendingUp, DollarSign, XCircle, Facebook, LogOut, Menu } from 'lucide-react';
import { cloud } from './services/firebase';

const VENDA_STATUS_MAP = ['Fazer Vistoria', 'Falta Pagamento', 'Emitida', 'Recusada'];

export default function App() {
  const [view, setView] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [vendas, setVendas] = useState([]);
  const [leadsFacebook, setLeadsFacebook] = useState([]);

  useEffect(() => {
    const unsubVendas = cloud.subscribeVendas(setVendas);
    const unsubFb = cloud.subscribeFacebookLeads(setLeadsFacebook);
    return () => { unsubVendas(); unsubFb(); };
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#0b0f1a] p-10 rounded-[2.5rem] border border-gray-900 shadow-2xl text-center">
          <h1 className="text-4xl font-black text-white mb-8 italic">VM SEGUROS</h1>
          <button 
            onClick={() => { setIsLoggedIn(true); setUser({nome: 'ADMIN', setor: 'ADMIN'}); }}
            className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest"
          >
            ENTRAR NO SISTEMA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <aside className="w-64 bg-[#0b0f1a] border-r border-gray-900 p-6 flex flex-col gap-2">
        <h2 className="text-xl font-black mb-10 italic">VM SEGUROS</h2>
        <button onClick={() => setView('dashboard')} className={`flex items-center gap-3 p-4 rounded-xl text-xs font-black uppercase ${view === 'dashboard' ? 'bg-blue-600' : ''}`}><LayoutDashboard size={16}/> Dashboard</button>
        <button onClick={() => setView('facebook')} className={`flex items-center gap-3 p-4 rounded-xl text-xs font-black uppercase ${view === 'facebook' ? 'bg-blue-600' : ''}`}><Facebook size={16}/> Facebook Ads</button>
        <button onClick={() => setIsLoggedIn(false)} className="mt-auto flex items-center gap-3 p-4 text-red-500 text-xs font-black uppercase"><LogOut size={16}/> Sair</button>
      </aside>
      <main className="flex-1 p-10">
        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <h1 className="text-4xl font-black italic mb-10">DASHBOARD</h1>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#0b0f1a] p-8 rounded-3xl border border-gray-900">
                <p className="text-xs font-black text-gray-500 uppercase mb-2">Vendas Hoje</p>
                <p className="text-5xl font-black">{vendas.length}</p>
              </div>
            </div>
          </div>
        )}
        {view === 'facebook' && (
          <div className="animate-in fade-in duration-500">
            <h1 className="text-4xl font-black italic mb-10 text-blue-500">FACEBOOK ADS</h1>
            <div className="bg-[#0b0f1a] rounded-3xl border border-gray-900 p-8">
              <p className="text-xs font-black text-gray-500 uppercase mb-4">Leads Recebidos: {leadsFacebook.length}</p>
              <table className="w-full text-left">
                <thead className="text-[10px] text-gray-600 uppercase font-black border-b border-gray-800">
                  <tr><th className="py-4">Nome</th><th className="py-4">Telefone</th><th className="py-4">Data</th></tr>
                </thead>
                <tbody>
                  {leadsFacebook.map((l: any) => (
                    <tr key={l.id} className="border-b border-gray-900/50">
                      <td className="py-4 text-sm font-bold">{l.nome}</td>
                      <td className="py-4 text-sm text-blue-400">{l.telefone}</td>
                      <td className="py-4 text-xs text-gray-500">{new Date(l.dataGerada).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
