import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Users, TrendingUp, DollarSign, XCircle, LogOut, Menu, ChevronRight } from 'lucide-react';
import { cloud } from './services/firebase';

const FORMAT_BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  const [view, setView] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [login, setLogin] = useState({ u: '', p: '' });
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    const unsub = cloud.subscribeVendas(setVendas);
    return () => unsub();
  }, []);

  const handleLogin = () => {
    if (login.u === 'admin' && login.p === 'Realmadridfc123@') {
      setIsLoggedIn(true);
    } else {
      alert('Login incorreto');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#0b0f1a] p-12 rounded-[2.5rem] border border-gray-900 shadow-2xl text-center">
          <h1 className="text-5xl font-black text-white mb-4 italic tracking-tighter">VM SEGUROS</h1>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-10">CLOUD CRM ELITE</p>
          <div className="space-y-4 mb-8">
            <input className="w-full bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white outline-none" placeholder="Login" onChange={e => setLogin({...login, u: e.target.value})} />
            <input type="password" className="w-full bg-[#050505] border border-gray-800 p-5 rounded-2xl text-white outline-none" placeholder="Senha" onChange={e => setLogin({...login, p: e.target.value})} />
          </div>
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-2xl font-black uppercase tracking-widest transition-all">ENTRAR NO SISTEMA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans">
      <aside className="w-72 bg-[#0b0f1a] border-r border-gray-900 p-8 flex flex-col gap-4">
        <h2 className="text-2xl font-black mb-10 italic tracking-tighter">VM SEGUROS</h2>
        <button onClick={() => setView('dashboard')} className={`flex items-center gap-4 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}><LayoutDashboard size={18}/> Dashboard</button>
        <button onClick={() => setView('producao')} className={`flex items-center gap-4 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'producao' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}><TrendingUp size={18}/> Produção</button>
        <button onClick={() => setIsLoggedIn(false)} className="mt-auto flex items-center gap-4 p-4 text-red-500 text-[10px] font-black uppercase tracking-widest"><LogOut size={18}/> Sair</button>
      </aside>
      <main className="flex-1 p-12 overflow-y-auto">
        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-700">
            <h1 className="text-4xl font-black italic mb-12 tracking-tighter">VOCÊ SÓ VENCE AMANHÃ SE LUTAR HOJE</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#0b0f1a] p-10 rounded-[2rem] border border-gray-900 shadow-xl">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">VENDAS (MÊS)</p>
                <p className="text-7xl font-black tracking-tighter">{vendas.length}</p>
              </div>
              <div className="bg-[#0b0f1a] p-10 rounded-[2rem] border border-gray-900 shadow-xl border-l-4 border-l-emerald-500">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">PRÊMIO TOTAL</p>
                <p className="text-4xl font-black text-emerald-500 font-mono tracking-tighter">{FORMAT_BRL(vendas.reduce((acc, v:any) => acc + (v.valor || 0), 0))}</p>
              </div>
            </div>
          </div>
        )}
        {view === 'producao' && (
          <div className="animate-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-black italic mb-12 tracking-tighter">PRODUÇÃO DE VENDAS</h1>
            <div className="bg-[#0b0f1a] rounded-[2.5rem] border border-gray-900 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-[#050505] text-[10px] font-black uppercase text-gray-600 border-b border-gray-900">
                  <tr><th className="p-8">CLIENTE</th><th className="p-8">SEGURADORA</th><th className="p-8">VALOR</th><th className="p-8">STATUS</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {vendas.map((v: any) => (
                    <tr key={v.id} className="hover:bg-blue-600/5 transition-colors">
                      <td className="p-8 font-black uppercase text-sm">{v.cliente}</td>
                      <td className="p-8 text-gray-400 font-bold uppercase text-xs">{v.empresa}</td>
                      <td className="p-8 font-black text-emerald-500 font-mono">{FORMAT_BRL(v.valor)}</td>
                      <td className="p-8"><span className="px-4 py-2 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest">{v.status}</span></td>
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
