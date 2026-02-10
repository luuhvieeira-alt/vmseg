import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, User, Venda, Indicacao, Meta, Empresa, Cancelamento } from './types';
import { cloud } from './services/firebase';
import { FORMAT_BRL, INDICACAO_STATUS_MAP, VENDA_STATUS_MAP } from './constants';
import Layout from './components/Layout';

// --- COMPONENTES DE APOIO ---

const ModalWrapper: React.FC<{ 
  title: string; 
  onClose: () => void; 
  onSave: () => void; 
  children: React.ReactNode;
  hideSave?: boolean;
  isYellow?: boolean;
}> = ({ title, onClose, onSave, children, hideSave, isYellow }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="bg-[#111827] w-full max-w-xl rounded-[2rem] border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0b0f1a]/30">
        <h3 className={`text-sm font-black uppercase tracking-widest ${isYellow ? 'text-yellow-500' : 'text-white'}`}>{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition"><i className="fas fa-times text-lg"></i></button>
      </div>
      <div className="p-8 overflow-y-auto scrollbar-thin max-h-[75vh] bg-[#111827]">
        {children}
      </div>
      <div className="p-6 border-t border-gray-800 flex gap-4 bg-[#0b0f1a]/30">
        <button onClick={onClose} className="flex-1 bg-[#1e293b] hover:bg-gray-700 text-white p-4 rounded-xl font-black uppercase text-[10px] transition-all tracking-widest">Cancelar</button>
        {!hideSave && (
          <button onClick={onSave} className={`flex-1 p-4 rounded-xl font-black uppercase text-[10px] shadow-lg transition-all tracking-widest ${isYellow ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-[#2563eb] text-white hover:bg-blue-500'}`}>Salvar</button>
        )}
      </div>
    </div>
  </div>
);

// --- VIEW DASHBOARD ---
const DashboardView: React.FC<{ vendas: Venda[], indicacoes: Indicacao[], metas: Meta[], user: AuthUser | null }> = ({ vendas, indicacoes, metas, user }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const uNome = (user?.nome || '').trim().toUpperCase();
    const baseVendas = (user?.isAdmin || user?.setor === 'RH') ? vendas : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
    
    const hojeVendas = baseVendas.filter(v => v.dataCriacao >= startOfDay.getTime());
    const mesVendasTotal = baseVendas.filter(v => v.dataCriacao >= startOfMonth);
    const mesVendasPagas = mesVendasTotal.filter(v => v.status === 'Pagamento Efetuado');
    
    const vHojeCount = hojeVendas.length;
    const pHojeTotal = hojeVendas.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const vMesTotal = mesVendasTotal.length;
    const pMesPagoTotal = mesVendasPagas.reduce((acc, v) => acc + Number(v.valor || 0), 0);

    const cMeta = metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS') || { meta_qtd: 270, meta_premio: 250000, meta_salario: 50000 };
    const uMeta = metas.find(m => (m.vendedor || '').toUpperCase() === uNome) || { meta_qtd: 1, meta_premio: 1, meta_salario: 1 };

    const prodMesPerformance = mesVendasTotal.filter(v => ['Mandar Boletos', 'Falta Pagamento', 'Pagamento Efetuado'].includes(v.status));
    const prodCount = prodMesPerformance.length;
    const prodPremio = prodMesPerformance.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const prodComissao = prodMesPerformance.reduce((acc, v) => acc + Number((user?.isAdmin || user?.setor === 'RH') ? (v.comissao_cheia || 0) : (v.comissao_vendedor || 0)), 0);

    return { 
      vHojeCount, pHojeTotal, vMesTotal, pMesPagoTotal, 
      prodCount, prodPremio, prodComissao,
      cMeta, uMeta,
      funilVendas: VENDA_STATUS_MAP.map(s => ({ status: s, count: mesVendasTotal.filter(v => v.status === s).length, pct: Math.round((mesVendasTotal.filter(v => v.status === s).length / (mesVendasTotal.length || 1)) * 100) })),
      funilLeads: INDICACAO_STATUS_MAP.map(s => ({ status: s, count: indicacoes.filter(i => i.status === s).length, pct: Math.round((indicacoes.filter(i => i.status === s).length / (indicacoes.length || 1)) * 100) }))
    };
  }, [vendas, indicacoes, metas, user]);

  const metaRef = (user?.isAdmin || user?.setor === 'RH') ? stats.cMeta : stats.uMeta;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
      <h2 className="text-3xl font-black uppercase text-white tracking-tighter text-center mb-8">VOCÊ SÓ VENCE AMANHÃ SE NÃO DESISTIR HOJE!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border border-gray-800 shadow-xl relative overflow-hidden">
          <p className="text-gray-500 text-[9px] font-black uppercase mb-3 tracking-widest">VENDAS (HOJE)</p>
          <h3 className="text-6xl font-black text-white">{stats.vHojeCount}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase tracking-tight">LANÇAMENTOS DO DIA</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border border-gray-800 shadow-xl relative overflow-hidden border-l-4 border-l-green-500">
          <p className="text-gray-500 text-[9px] font-black uppercase mb-3 tracking-widest">PRÊMIO LÍQUIDO (HOJE)</p>
          <h3 className="text-4xl font-black text-green-500 font-mono tracking-tighter">{FORMAT_BRL(stats.pHojeTotal)}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase tracking-tight">TOTAL PRODUZIDO HOJE</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border border-gray-800 shadow-xl relative overflow-hidden">
          <p className="text-gray-500 text-[9px] font-black uppercase mb-3 tracking-widest">VENDAS (NO MÊS)</p>
          <h3 className="text-6xl font-black text-white">{stats.vMesTotal}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase tracking-tight">TOTAL ACUMULADO MÊS</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border border-gray-800 shadow-xl relative overflow-hidden border-l-4 border-l-white">
          <p className="text-gray-500 text-[9px] font-black uppercase mb-3 tracking-widest">PRÊMIO LÍQUIDO (NO MÊS)</p>
          <h3 className="text-4xl font-black text-white font-mono tracking-tighter">{FORMAT_BRL(stats.pMesPagoTotal)}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase tracking-tight">APENAS PAGAMENTOS CONFIRMADOS</p>
        </div>
      </div>

      <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl relative overflow-hidden">
        <h3 className="text-sm font-black uppercase text-white mb-10 flex items-center gap-3 tracking-widest">
          <i className="fas fa-chart-line text-purple-500"></i> PERFORMANCE CONSOLIDADA (VM SEGUROS)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="space-y-4">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">VENDAS TOTAIS EMPRESA</p>
            <h4 className="text-2xl font-black text-white">{stats.prodCount} <span className="text-gray-700">/ {metaRef.meta_qtd}</span></h4>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-purple-500 h-full" style={{ width: `${Math.min((stats.prodCount / (metaRef.meta_qtd || 1)) * 100, 100)}%` }}></div></div>
              <span className="text-[10px] font-black text-purple-500">{Math.round((stats.prodCount / (metaRef.meta_qtd || 1)) * 100)}%</span>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">PRÊMIO BRUTO ACUMULADO</p>
            <h4 className="text-2xl font-black text-white font-mono">{FORMAT_BRL(stats.prodPremio)}</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full" style={{ width: `${Math.min((stats.prodPremio / (metaRef.meta_premio || 1)) * 100, 100)}%` }}></div></div>
              <span className="text-[10px] font-black text-green-500">{Math.round((stats.prodPremio / (metaRef.meta_premio || 1)) * 100)}%</span>
            </div>
            <p className="text-[7px] font-black text-gray-700 uppercase">META: {FORMAT_BRL(metaRef.meta_premio)}</p>
          </div>
          <div className="space-y-4">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">COMISSÃO BRUTA EMPRESA</p>
            <h4 className="text-2xl font-black text-white font-mono">{FORMAT_BRL(stats.prodComissao)}</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-yellow-500 h-full" style={{ width: `${Math.min((stats.prodComissao / (metaRef.meta_salario || 1)) * 100, 100)}%` }}></div></div>
              <span className="text-[10px] font-black text-yellow-500">{Math.round((stats.prodComissao / (metaRef.meta_salario || 1)) * 100)}%</span>
            </div>
            <p className="text-[7px] font-black text-gray-700 uppercase">META: {FORMAT_BRL(metaRef.meta_salario)}</p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none hidden lg:block">
             <i className="fas fa-building text-8xl"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 shadow-xl">
          <h3 className="text-[10px] font-black uppercase text-white mb-10 flex items-center gap-2 tracking-widest"><i className="fas fa-filter text-blue-500"></i> FUNIL DE PRODUÇÃO</h3>
          <div className="space-y-8">{stats.funilVendas.map(f => (<div key={f.status} className="space-y-2"><div className="flex justify-between items-end"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{f.status}</span><span className="text-[10px] font-black text-white">{f.count} <span className="text-gray-600 ml-1">({f.pct}%)</span></span></div><div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${f.pct}%` }}></div></div></div>))}</div>
        </div>
        <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 shadow-xl">
          <h3 className="text-[10px] font-black uppercase text-white mb-10 flex items-center gap-2 tracking-widest"><i className="fas fa-bolt text-yellow-500"></i> STATUS DOS LEADS</h3>
          <div className="space-y-8">{stats.funilLeads.map(f => (<div key={f.status} className="space-y-2"><div className="flex justify-between items-end"><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{f.status}</span><span className="text-[10px] font-black text-white">{f.count} <span className="text-gray-600 ml-1">({f.pct}%)</span></span></div><div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-yellow-500 h-full transition-all duration-700" style={{ width: `${f.pct}%` }}></div></div></div>))}</div>
        </div>
      </div>
    </div>
  );
};

// --- VIEW FINANCEIRO ---
const FinanceiroView: React.FC<{ 
  vendas: Venda[], 
  user: AuthUser | null, 
  title?: string, 
  filterSuhai?: boolean 
}> = ({ vendas, user, title, filterSuhai }) => {
  const uNome = (user?.nome || '').trim().toUpperCase();
  const filtered = useMemo(() => {
    let list = (user?.isAdmin || user?.setor === 'RH') ? vendas : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
    if (filterSuhai) list = list.filter(v => v.suhai);
    return list.filter(v => v.status === 'Pagamento Efetuado');
  }, [vendas, user, filterSuhai]);

  const totalComissao = filtered.reduce((acc, v) => acc + Number((user?.isAdmin || user?.setor === 'RH') ? v.comissao_cheia : v.comissao_vendedor), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black uppercase text-green-500 tracking-tighter">{title || 'FINANCEIRO'}</h2>
      </div>
      <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0b0f1a]/50 text-[9px] font-black uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="px-8 py-6">DATA</th>
                <th className="px-8 py-6">CLIENTE</th>
                <th className="px-8 py-6">SEGURADORA</th>
                <th className="px-8 py-6">VENDEDOR</th>
                <th className="px-8 py-6 text-right">COMISSÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-5 text-gray-500 font-mono text-[10px]">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-5 text-white font-black text-[10px] uppercase">{v.cliente}</td>
                  <td className="px-8 py-5 text-gray-500 font-bold text-[9px] uppercase">{v.empresa}</td>
                  <td className="px-8 py-5 text-blue-400 font-black text-[10px] uppercase">{v.vendedor}</td>
                  <td className="px-8 py-5 text-right text-green-500 font-black font-mono text-[10px]">
                    {FORMAT_BRL((user?.isAdmin || user?.setor === 'RH') ? (v.comissao_cheia || 0) : (v.comissao_vendedor || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-center pt-6">
        <div className="bg-[#111827] p-8 rounded-[2rem] border border-green-500/20 text-center">
          <p className="text-gray-500 text-[9px] font-black uppercase mb-2 tracking-widest">TOTAL ACUMULADO</p>
          <h3 className="text-5xl font-black text-green-500 font-mono tracking-tighter">{FORMAT_BRL(totalComissao)}</h3>
        </div>
      </div>
    </div>
  );
};

// --- VIEW CANCELAMENTOS ---
const CancelamentosView: React.FC<{ 
  cancelamentos: Cancelamento[], 
  user: AuthUser | null, 
  onAdd: () => void 
}> = ({ cancelamentos, user, onAdd }) => {
  const uNome = (user?.nome || '').trim().toUpperCase();
  const filtered = (user?.isAdmin || user?.setor === 'RH') ? cancelamentos : cancelamentos.filter(c => (c.vendedor || '').trim().toUpperCase() === uNome);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black uppercase text-red-500 tracking-tighter">CANCELAMENTOS</h2>
        <button onClick={onAdd} className="bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] shadow-xl">LANÇAR ESTORNO</button>
      </div>
      <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0b0f1a]/50 text-[9px] font-black uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="px-8 py-6">DATA</th>
                <th className="px-8 py-6">CLIENTE</th>
                <th className="px-8 py-6">SEGURADORA</th>
                <th className="px-8 py-6">VENDEDOR</th>
                <th className="px-8 py-6 text-right">VALOR ESTORNO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-5 text-gray-500 font-mono text-[10px]">{new Date(c.dataCriacao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-5 text-white font-black text-[10px] uppercase">{c.cliente}</td>
                  <td className="px-8 py-5 text-gray-500 font-bold text-[9px] uppercase">{c.empresa}</td>
                  <td className="px-8 py-5 text-blue-400 font-black text-[10px] uppercase">{c.vendedor}</td>
                  <td className="px-8 py-5 text-right text-red-500 font-black font-mono text-[10px]">{FORMAT_BRL(c.valor_comissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedSellerRh, setSelectedSellerRh] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('TODOS');
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cancelamentos, setCancelamentos] = useState<Cancelamento[]>([]);
  const [modalType, setModalType] = useState<'venda' | 'indicacao' | 'usuario' | 'empresa' | 'meta' | 'cancelamento' | 'ver_info_lead' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    const unsubVendas = cloud.subscribeVendas(setVendas);
    const unsubUsers = cloud.subscribeUsuarios(setUsuarios);
    const unsubMetas = cloud.subscribeMetas(setMetas);
    const unsubIndicacoes = cloud.subscribeIndicacoes(setIndicacoes);
    const unsubEmpresas = cloud.subscribeEmpresas(setEmpresas);
    const unsubCancelamentos = cloud.subscribeCancelamentos(setCancelamentos);
    return () => { unsubVendas(); unsubUsers(); unsubMetas(); unsubIndicacoes(); unsubEmpresas(); unsubCancelamentos(); };
  }, []);

  const uNome = (user?.nome || '').trim().toUpperCase();

  const handleLogin = () => {
    const uI = loginForm.username.trim().toLowerCase();
    const pI = loginForm.password.trim();
    if (uI === 'admin' && pI === 'Realmadridfc123@') {
      setUser({ nome: 'ADMIN MASTER', setor: 'ADMIN', isAdmin: true, login: 'admin', comissao: 100 });
      setIsAuthenticated(true);
    } else {
      const found = usuarios.find(u => (u.login || '').toLowerCase() === uI && u.senha === pI);
      if (found) { setUser({ ...found, isAdmin: found.setor === 'ADMIN' }); setIsAuthenticated(true); } else { alert('Credenciais inválidas'); }
    }
  };

  const moveVenda = async (v: Venda, dir: 'left' | 'right') => {
    const idx = VENDA_STATUS_MAP.indexOf(v.status);
    const nextIdx = dir === 'left' ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < VENDA_STATUS_MAP.length) await cloud.salvarVenda({ ...v, status: VENDA_STATUS_MAP[nextIdx] });
  };

  const moveIndicacao = async (i: Indicacao, dir: 'left' | 'right') => {
    const idx = INDICACAO_STATUS_MAP.indexOf(i.status);
    const nextIdx = dir === 'left' ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < INDICACAO_STATUS_MAP.length) await cloud.updateStatus('indicacoes', i.id!, INDICACAO_STATUS_MAP[nextIdx]);
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-10"><h1 className="text-3xl font-black text-white tracking-tighter">VM SEGUROS</h1><p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2">Cloud CRM Elite</p></div>
      <div className="bg-[#111827] w-full max-w-[320px] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-6">
        <div className="space-y-4">
          <div className="space-y-1"><label className="text-[9px] font-black text-gray-600 uppercase ml-2">Acesso</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none" placeholder="Login" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-[9px] font-black text-gray-600 uppercase ml-2">Senha</label><input type="password" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none" placeholder="Senha" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} /></div>
        </div>
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase text-[10px]">Entrar</button>
      </div>
    </div>
  );

  const filteredVendas = vendas.filter(v => (user?.isAdmin || user?.setor === 'RH') ? (salesmanFilter === 'TODOS' || (v.vendedor || '').toUpperCase() === salesmanFilter.toUpperCase()) : (v.vendedor || '').toUpperCase() === uNome);
  const filteredIndicacoes = indicacoes.filter(i => (user?.isAdmin || user?.setor === 'RH') ? (salesmanFilter === 'TODOS' || (i.vendedor || '').toUpperCase() === salesmanFilter.toUpperCase()) : (i.vendedor || '').toUpperCase() === uNome);

  return (
    <Layout user={user!} onLogout={() => { setIsAuthenticated(false); setUser(null); }} activeSection={activeSection} setActiveSection={(s) => { setActiveSection(s); setSelectedSellerRh(null); }}>
      {activeSection === 'dashboard' && <DashboardView vendas={vendas} indicacoes={indicacoes} metas={metas} user={user} />}
      
      {activeSection === 'kanban-indicacoes' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-yellow-500 tracking-tighter">LEADS</h2><button onClick={() => setActiveSection('cadastrar-indicacao')} className="bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg">NOVO LEAD</button></div>
           <div className="grid grid-cols-2 gap-4 mb-6"><input className="bg-[#111827] border border-gray-800 p-4 rounded-xl text-xs text-white uppercase outline-none" placeholder="BUSCAR LEADS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><select className="bg-[#111827] border border-gray-800 p-4 rounded-xl text-xs text-white uppercase outline-none" value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}><option value="TODOS">TODOS VENDEDORES</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
           <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-320px)]">{INDICACAO_STATUS_MAP.map(status => (
                <div key={status} className="kanban-column flex flex-col w-[350px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/50 p-4"><h3 className="text-[10px] font-black uppercase text-gray-500 text-center mb-6 py-4 border-b border-gray-800/30 tracking-widest">{status}</h3>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">{filteredIndicacoes.filter(i => i.status === status).map(i => (
                      <div key={i.id} className="bg-[#111827] rounded-[2rem] p-8 border border-yellow-900/20 shadow-xl relative group transition-all"><div className="absolute top-8 right-8 flex gap-4"><button onClick={() => { setEditingItem({ ...i, leadIdToDelete: i.id, status: 'Fazer Vistoria', dataCriacao: Date.now() }); setModalType('venda'); }} className="text-green-500 hover:scale-110 transition"><i className="fas fa-check text-sm"></i></button><button onClick={() => { if(window.confirm('Excluir lead?')) cloud.apagar('indicacoes', i.id!) }} className="text-red-500/50 hover:text-red-500 transition"><i className="fas fa-trash-alt text-sm"></i></button><button onClick={() => { setEditingItem(i); setModalType('indicacao'); }} className="text-gray-600 hover:text-white transition"><i className="fas fa-edit text-xs"></i></button></div>
                        <div className="space-y-4"><div><p className="text-[14px] font-black text-white uppercase tracking-tight">{i.cliente}</p><p className="text-[11px] font-bold text-yellow-500 mt-1">{i.tel}</p></div><div className="space-y-1"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{i.veiculo || 'MOTO'}</p><p className="text-[7px] text-gray-600 font-bold uppercase">DATA: {new Date(i.dataCriacao).toLocaleDateString('pt-BR')}</p></div>
                        {i.suhai && <p className="text-[9px] s-suhai-pulse uppercase tracking-widest">SUHAI</p>}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-800/50"><button onClick={() => moveIndicacao(i, 'left')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-left text-[11px]"></i></button><span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{i.vendedor || 'SEM VENDEDOR'}</span><button onClick={() => moveIndicacao(i, 'right')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-right text-[11px]"></i></button></div></div>
                      </div>))}</div></div>))}</div></div>
      )}

      {activeSection === 'kanban-vendas' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-blue-500 tracking-tighter">PRODUÇÃO</h2><div className="flex gap-4"><input type="date" className="bg-[#111827] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none uppercase font-bold" /><button onClick={() => { setEditingItem({ status: 'Fazer Vistoria', vendedor: uNome, valor: 0, comissao_cheia: 0, comissao_vendedor: 0 }); setModalType('venda'); }} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-xl">LANÇAR VENDA</button></div></div>
           <div className="grid grid-cols-2 gap-4 mb-6"><input className="bg-[#111827] border border-gray-800 p-4 rounded-xl text-xs text-white uppercase outline-none" placeholder="PESQUISAR PRODUÇÃO..." /><select className="bg-[#111827] border border-gray-800 p-4 rounded-xl text-xs text-white uppercase outline-none"><option value="TODOS">TODOS VENDEDORES</option></select></div>
           <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-320px)]">{VENDA_STATUS_MAP.map(status => (
                <div key={status} className="kanban-column flex flex-col w-[350px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/50 p-4"><h3 className="text-[10px] font-black uppercase text-gray-500 text-center mb-6 py-4 border-b border-gray-800/30 tracking-widest">{status}</h3>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">{filteredVendas.filter(v => v.status === status).map(v => (
                      <div key={v.id} className="bg-[#111827] rounded-[2rem] p-6 border border-blue-900/20 shadow-xl relative"><button onClick={() => { setEditingItem(v); setModalType('venda'); }} className="absolute top-6 right-6 text-gray-600 hover:text-white transition"><i className="fas fa-edit text-xs"></i></button>
                        <div className="space-y-4"><div className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 rounded border-gray-800 bg-gray-900 accent-blue-500" /><div><p className="text-[12px] font-black text-white uppercase">{v.cliente}</p><p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight">{v.tel} | {v.empresa}</p><p className="text-[7px] text-gray-600 font-bold uppercase mt-1">DATA: {new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</p></div></div>
                          <div className="text-center bg-[#0b0f1a]/50 py-6 rounded-[1.5rem] border border-gray-800/30"><p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">PRÊMIO LÍQUIDO</p><h4 className="text-3xl font-black text-white font-mono">{FORMAT_BRL(v.valor)}</h4></div>
                          <div className="grid grid-cols-2 gap-3"><div className="bg-[#0b0f1a] p-3 rounded-2xl border border-gray-800 text-center"><p className="text-[7px] font-black text-gray-600 uppercase mb-1">C. CHEIA</p><p className="text-[10px] font-black text-white font-mono">{FORMAT_BRL(v.comissao_cheia)}</p></div><div className="bg-[#0b0f1a] p-3 rounded-2xl border border-gray-800 text-center"><p className="text-[7px] font-black text-green-500 uppercase mb-1">SUA PARTE</p><p className="text-[10px] font-black text-green-500 font-mono">{FORMAT_BRL(v.comissao_vendedor)}</p></div></div>
                          <div className="flex justify-between items-center pt-3 border-t border-gray-800/50"><button onClick={() => moveVenda(v, 'left')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-left text-[11px]"></i></button><span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{v.vendedor}</span><button onClick={() => moveVenda(v, 'right')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-right text-[11px]"></i></button></div></div>
                      </div>))}</div></div>))}</div></div>
      )}

      {activeSection === 'comissao' && <FinanceiroView vendas={vendas} user={user} />}
      {activeSection === 'cancelamentos' && <CancelamentosView cancelamentos={cancelamentos} user={user} onAdd={() => { setEditingItem({ cliente: '', empresa: '', vendedor: uNome, valor_comissao: 0 }); setModalType('cancelamento'); }} />}
      {activeSection === 'lead-suhai-page' && <FinanceiroView vendas={vendas} user={user} title="SUHAI GOLD - PAGOS" filterSuhai={true} />}

      {activeSection === 'cadastrar-indicacao' && (
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] animate-in zoom-in duration-500">
           <div className="bg-[#111827] w-full max-w-xl rounded-[2.5rem] p-12 border border-gray-800 shadow-2xl relative">
              <h2 className="text-2xl font-black text-[#facc15] uppercase text-center mb-10 tracking-[0.2em]">DISTRIBUIR LEAD</h2>
              <div className="space-y-6">
                 <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-600 ml-2 tracking-widest">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none font-bold uppercase" value={editingItem?.cliente || ''} onChange={e => setEditingItem((prev: any) => ({...(prev || {}), cliente: e.target.value.toUpperCase()}))} /></div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-600 ml-2 tracking-widest">WHATSAPP</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none" value={editingItem?.tel || ''} onChange={e => setEditingItem((prev: any) => ({...(prev || {}), tel: e.target.value}))} /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-600 ml-2 tracking-widest">VEÍCULO / MODELO</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none uppercase font-bold" value={editingItem?.veiculo || ''} onChange={e => setEditingItem((prev: any) => ({...(prev || {}), veiculo: e.target.value.toUpperCase()}))} /></div>
                 </div>
                 <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-600 ml-2 tracking-widest">ATRIBUIR AO VENDEDOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none font-black uppercase appearance-none" value={editingItem?.vendedor || ''} onChange={e => setEditingItem((prev: any) => ({...(prev || {}), vendedor: e.target.value}))}><option value="">SELECIONE UM VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome.toUpperCase()}>{u.nome.toUpperCase()}</option>)}</select></div>
                 <div className="flex items-center gap-3 bg-[#0b0f1a] p-5 rounded-xl border border-gray-800"><input type="checkbox" className="w-5 h-5 accent-green-500" checked={editingItem?.suhai || false} onChange={e => setEditingItem((prev: any) => ({...(prev || {}), suhai: e.target.checked}))} /><label className="text-[9px] font-black uppercase text-green-500 tracking-widest">MARCAR COMO LEAD SUHAI</label></div>
                 <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-600 ml-2 tracking-widest">OBSERVAÇÕES ADICIONAIS</label><textarea className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none h-32 uppercase text-[10px] resize-none" placeholder="EX: CLIENTE INDICADO POR AMIGO..." value={editingItem?.info || ''} onChange={e => setEditingItem((prev: any) => ({...(prev || {}), info: e.target.value}))} /></div>
                 <button onClick={async () => { await cloud.salvarIndicacao({...editingItem, status: 'NOVA INDICAÇÃO', dataCriacao: Date.now()}); alert("Lead distribuído!"); setEditingItem({}); setActiveSection('kanban-indicacoes'); }} className="w-full bg-[#facc15] p-5 rounded-xl font-black uppercase text-black text-[11px] shadow-xl hover:bg-yellow-400 transition-all tracking-widest">CONFIRMAR ENVIO DO LEAD</button>
              </div>
           </div>
        </div>
      )}

      {activeSection === 'cadastrar-emissao' && (
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] animate-in zoom-in duration-500">
          <div className="bg-[#111827] w-full max-w-xl rounded-[2.5rem] p-12 border border-gray-800 shadow-2xl">
            <h2 className="text-2xl font-black text-blue-400 uppercase text-center mb-10 tracking-[0.2em]">CADASTRAR EMISSÃO (RH)</h2>
            <div className="space-y-6">
              <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-2">NOME CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none font-bold uppercase" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-2">TEL</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-2">SEGURADORA</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none font-black uppercase" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}><option value="">SELECIONE</option>{empresas.map(emp => <option key={emp.id} value={emp.nome}>{emp.nome.toUpperCase()}</option>)}</select></div>
              </div>
              <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-2">VENDEDOR RESPONSÁVEL</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none font-black uppercase" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center"><p className="text-[6px] font-black text-gray-600 uppercase mb-2">PRÊMIO</p><input type="number" className="w-full bg-[#0b0f1a] p-3 rounded-lg border border-gray-800 text-center text-xs text-white" value={editingItem?.valor || 0} onChange={e => setEditingItem({...editingItem, valor: Number(e.target.value)})} /></div>
                <div className="text-center"><p className="text-[6px] font-black text-yellow-500 uppercase mb-2">% VEND</p><input type="number" className="w-full bg-[#0b0f1a] p-3 rounded-lg border border-gray-800 text-center text-xs text-yellow-500" value={editingItem?.porcentagem_vendida || 0} onChange={e => setEditingItem({...editingItem, porcentagem_vendida: Number(e.target.value)})} /></div>
                <div className="text-center"><p className="text-[6px] font-black text-gray-600 uppercase mb-2">C. CHEIA</p><input type="number" className="w-full bg-[#0b0f1a] p-3 rounded-lg border border-gray-800 text-center text-xs text-white" value={editingItem?.comissao_cheia || 0} onChange={e => setEditingItem({...editingItem, comissao_cheia: Number(e.target.value)})} /></div>
                <div className="text-center"><p className="text-[6px] font-black text-green-500 uppercase mb-2">C. VEND</p><input type="number" className="w-full bg-[#0b0f1a] p-3 rounded-lg border border-gray-800 text-center text-xs text-green-500" value={editingItem?.comissao_vendedor || 0} onChange={e => setEditingItem({...editingItem, comissao_vendedor: Number(e.target.value)})} /></div>
              </div>
              <button onClick={async () => { await cloud.salvarVenda({...editingItem, status: 'Pagamento Efetuado', origem: 'RH', dataCriacao: Date.now()}); alert("Emissão cadastrada!"); setActiveSection('dashboard'); }} className="w-full bg-blue-600 p-5 rounded-xl font-black uppercase text-white text-[11px] shadow-xl hover:bg-blue-500 transition-all">FINALIZAR EMISSÃO</button>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'vendedores' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
           <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-red-500 tracking-tighter">EQUIPE</h2><button onClick={() => { setEditingItem({ nome: '', login: '', senha: '', setor: 'VENDEDOR', comissao: 0 }); setModalType('usuario'); }} className="bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] shadow-xl">NOVO USUÁRIO</button></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {usuarios.map(u => (
                <div key={u.id} className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 shadow-xl relative group transition-all">
                  <div className="absolute top-8 right-8 flex gap-3"><button onClick={() => { setEditingItem(u); setModalType('usuario'); }} className="text-gray-600 hover:text-white transition"><i className="fas fa-edit text-xs"></i></button><button onClick={() => { if(window.confirm('Excluir usuário?')) cloud.apagar('usuarios', u.id!) }} className="text-gray-700 hover:text-red-500 transition"><i className="fas fa-trash text-xs"></i></button></div>
                  <div className="space-y-4"><div><h4 className="text-lg font-black text-white uppercase tracking-tight">{u.nome}</h4><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">SETOR: {u.setor}</p></div>
                    <div className="flex justify-center py-4"><div className="bg-[#1c1917] border border-red-900/30 px-10 py-3 rounded-full"><p className="text-[11px] font-black text-red-500 uppercase tracking-widest">{u.comissao}% COMISSÃO</p></div></div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSection === 'metas' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
           <h2 className="text-4xl font-black uppercase text-blue-500 tracking-tighter">METAS DOS VENDEDORES</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => {
                const meta = metas.find(m => m.vendedor === u.nome) || { meta_salario: 0, meta_premio: 0, meta_qtd: 0 };
                return (
                  <div key={u.id} className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 shadow-xl space-y-6">
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{u.nome}</h4>
                    <div className="space-y-2"><div className="flex justify-between text-[8px] font-black text-gray-500 uppercase"><span>META SALARIAL</span><span className="text-white">{FORMAT_BRL(meta.meta_salario)}</span></div><div className="flex justify-between text-[8px] font-black text-gray-500 uppercase"><span>META PRÊMIO</span><span className="text-white">{FORMAT_BRL(meta.meta_premio)}</span></div><div className="flex justify-between text-[8px] font-black text-gray-500 uppercase"><span>QUANTIDADE</span><span className="text-white">{meta.meta_qtd} UNI</span></div></div>
                    <button onClick={() => { setEditingItem({ ...meta, vendedor: u.nome }); setModalType('meta'); }} className="w-full bg-gray-800/50 p-3 rounded-xl text-[7px] font-black uppercase text-gray-400 hover:text-white transition-all">CONFIGURAR METAS</button>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {activeSection === 'performance' && (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
           <h2 className="text-4xl font-black uppercase text-purple-500 tracking-tighter">PERFORMANCE TEAM</h2>
           <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 shadow-xl"><h3 className="text-[9px] font-black text-gray-500 uppercase mb-8 flex items-center gap-2 tracking-widest"><i className="fas fa-book-open text-purple-500"></i> PRODUÇÃO GLOBAL POR SEGURADORA (MÊS)</h3>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {['PORTO SEGURO', 'ITURAN', 'SUHAI SEGURADORA', 'ALLIANZ', 'TOKIO MARINE'].map(emp => (
                  <div key={emp} className="bg-[#0b0f1a] p-6 rounded-2xl border border-gray-800 text-center relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-0.5 bg-purple-500/20"></div><p className="text-[7px] font-black text-gray-600 uppercase mb-4">{emp}</p><h4 className="text-3xl font-black text-white">{vendas.filter(v => (v.empresa || '').toUpperCase() === emp).length}</h4><p className="text-[6px] font-bold text-purple-500 uppercase mt-2">APÓLICES EM PRODUÇÃO</p></div>
                ))}
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => {
                const uv = vendas.filter(v => (v.vendedor || '').toUpperCase() === u.nome.toUpperCase());
                return (
                  <div key={u.id} className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-purple-500/30"></div><h4 className="text-center text-2xl font-black text-white uppercase tracking-tight mb-8">{u.nome}</h4>
                    <div className="bg-[#0b0f1a] py-8 rounded-[2rem] border border-gray-800 text-center mb-10"><p className="text-[8px] font-black text-gray-500 uppercase mb-2">PRODUÇÃO REAL (MÊS)</p><h5 className="text-7xl font-black text-purple-500">{uv.length}</h5></div>
                    <div className="space-y-4 mb-10"><p className="text-[8px] font-black text-gray-700 uppercase tracking-widest border-b border-gray-800 pb-2">QUEBRA POR EMPRESA</p>
                      {['PORTO SEGURO', 'ITURAN', 'SUHAI SEGURADORA', 'ALLIANZ', 'TOKIO MARINE'].map(emp => (
                        <div key={emp} className="flex justify-between items-center text-[9px] font-black text-gray-500"><span>{emp}</span><span className="text-white">{uv.filter(v => (v.empresa || '').toUpperCase() === emp).length}</span></div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4"><div className="bg-gray-800/30 p-3 rounded-xl text-center"><p className="text-[6px] font-black text-green-500 uppercase">C. PRODUZIDA</p><p className="text-[10px] font-black text-white">{FORMAT_BRL(uv.reduce((a, b) => a + Number(b.comissao_vendedor || 0), 0))}</p></div><div className="bg-gray-800/30 p-3 rounded-xl text-center"><p className="text-[6px] font-black text-blue-500 uppercase">PRÊMIO PRODUZIDO</p><p className="text-[10px] font-black text-white">{FORMAT_BRL(uv.reduce((a, b) => a + Number(b.valor || 0), 0))}</p></div></div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {activeSection === 'configuracoes' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
           <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-gray-400 tracking-tighter">CONFIGURAÇÕES</h2><button onClick={() => { setEditingItem({ nome: '' }); setModalType('empresa'); }} className="bg-gray-700 text-white px-5 py-3 rounded-lg font-black uppercase text-[9px] shadow-lg">NOVA SEGURADORA</button></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {empresas.map(emp => (
                <div key={emp.id} className="bg-[#111827] p-8 rounded-2xl border border-gray-800 flex justify-between items-center"><span className="text-sm font-black text-white uppercase">{emp.nome}</span><button onClick={() => { if(window.confirm('Excluir?')) cloud.apagar('empresas', emp.id!) }} className="text-gray-700 hover:text-red-500 transition"><i className="fas fa-trash"></i></button></div>
              ))}
           </div>
        </div>
      )}

      {activeSection === 'relatorio-vendas' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          {!selectedSellerRh ? (
            <>
              <h2 className="text-4xl font-black uppercase text-blue-400 tracking-tighter">RELATÓRIO DE VENDAS (RH)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => {
                  const rhVendas = vendas.filter(v => (v as any).origem === 'RH' && v.vendedor === u.nome);
                  return (
                    <div key={u.id} onClick={() => setSelectedSellerRh(u.nome)} className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl relative overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all group">
                      <h4 className="text-2xl font-black text-white uppercase mb-6 group-hover:text-blue-400 transition-colors">{u.nome}</h4>
                      <div className="space-y-2"><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">LANÇAMENTOS RH: <span className="text-white ml-2">{rhVendas.length}</span></p><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">COMISSÃO ACUMULADA: <span className="text-green-500 ml-2">{FORMAT_BRL(rhVendas.reduce((a, b) => a + Number(b.comissao_vendedor || 0), 0))}</span></p></div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-left duration-300">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSellerRh(null)} className="text-white hover:text-blue-400 transition-colors"><i className="fas fa-arrow-left text-2xl"></i></button>
                    <h2 className="text-4xl font-black uppercase text-blue-400 tracking-tighter">VENDAS RH: {selectedSellerRh}</h2>
                  </div>
                  <div className="flex gap-4">
                    <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-black uppercase text-[10px] flex items-center gap-2 shadow-lg"><i className="fas fa-lock"></i> LIBERAR FOLHA</button>
                    <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-black uppercase text-[10px] flex items-center gap-2 shadow-lg"><i className="fas fa-print"></i> IMPRIMIR LISTA</button>
                  </div>
               </div>
               <div className="bg-[#111827] rounded-[2rem] border border-gray-800 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead className="bg-[#0b0f1a]/50 text-[9px] font-black uppercase text-gray-500 tracking-widest"><tr><th className="px-8 py-6">DATA</th><th className="px-8 py-6">CLIENTE</th><th className="px-8 py-6">SEGURADORA</th><th className="px-8 py-6">PRÊMIO</th><th className="px-8 py-6 text-blue-400">C. CHEIA</th><th className="px-8 py-6 text-yellow-500">% VEND</th><th className="px-8 py-6 text-green-500">COMISSÃO</th></tr></thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {vendas.filter(v => (v as any).origem === 'RH' && (v.vendedor || '').toUpperCase() === selectedSellerRh.toUpperCase()).map(v => (
                        <tr key={v.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-5 text-gray-500 font-mono text-[10px]">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
                          <td className="px-8 py-5 text-white font-black text-[10px] uppercase">{v.cliente}</td>
                          <td className="px-8 py-5 text-gray-500 font-bold text-[9px] uppercase">{v.empresa}</td>
                          <td className="px-8 py-5 text-white/80 font-mono text-[10px]">{FORMAT_BRL(v.valor)}</td>
                          <td className="px-8 py-5 text-blue-400 font-black font-mono text-[10px]">{FORMAT_BRL(v.comissao_cheia)}</td>
                          <td className="px-8 py-5 text-yellow-500 font-black text-[10px]">{v.porcentagem_vendida || 0}%</td>
                          <td className="px-8 py-5 text-green-500 font-black font-mono text-[10px]">{FORMAT_BRL(v.comissao_vendedor)}</td>
                        </tr>
                      ))}
                    </tbody></table></div>
               </div>
               <div className="flex justify-center pt-10">
                  <div className="bg-[#111827] p-12 rounded-[3rem] border-2 border-green-500/30 shadow-2xl shadow-green-500/5 flex flex-col items-center">
                    <p className="text-gray-500 text-[9px] font-black uppercase mb-4 tracking-[0.4em]">VALOR TOTAL COMISSÃO REALIZADA</p>
                    <h3 className="text-8xl font-black text-green-500 font-mono tracking-tighter">
                      {FORMAT_BRL(vendas.filter(v => (v as any).origem === 'RH' && (v.vendedor || '').toUpperCase() === selectedSellerRh.toUpperCase()).reduce((a, b) => a + Number(b.comissao_vendedor || 0), 0))}
                    </h3>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'falta-pagar' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-yellow-500 tracking-tighter">FALTA PAGAR (PRODUÇÃO)</h2><button className="bg-[#10b981] text-white px-5 py-3 rounded-lg font-black uppercase text-[9px] shadow-lg">BAIXAR EM EXCEL</button></div>
          <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead className="bg-[#0b0f1a]/50 text-[9px] font-black uppercase text-gray-500 tracking-widest"><tr><th className="px-10 py-6 border-b border-gray-800">NOME CLIENTE</th><th className="px-10 py-6 border-b border-gray-800">TELEFONE</th><th className="px-10 py-6 border-b border-gray-800">SEGURADORA</th><th className="px-10 py-6 border-b border-gray-800">VENDEDOR</th><th className="px-10 py-6 border-b border-gray-800 text-right">COMISSÃO CHEIA</th></tr></thead>
              <tbody className="divide-y divide-gray-800/50">
                {vendas.filter(v => v.status === 'Falta Pagamento').map(v => (
                  <tr key={v.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-10 py-5 text-white font-black text-[10px] uppercase">{v.cliente}</td>
                    <td className="px-10 py-5 text-gray-500 font-mono text-[9px]">{v.tel}</td>
                    <td className="px-10 py-5 text-gray-500 font-bold text-[9px] uppercase">{v.empresa}</td>
                    <td className="px-10 py-5 text-blue-400 font-black text-[10px] uppercase">{v.vendedor}</td>
                    <td className="px-10 py-5 text-right text-yellow-600 font-black font-mono text-[10px]">{FORMAT_BRL(v.comissao_cheia)}</td>
                  </tr>
                ))}
              </tbody></table></div>
          </div>
        </div>
      )}

      {modalType && (
        <ModalWrapper 
          title={modalType === 'venda' ? 'GERENCIAR VENDA' : modalType === 'indicacao' ? 'EDITAR LEAD' : modalType === 'usuario' ? 'GERENCIAR USUÁRIO' : `GERENCIAR ${modalType.toUpperCase()}`} 
          onClose={() => { setModalType(null); setEditingItem(null); }} 
          isYellow={modalType === 'indicacao'}
          onSave={async () => { 
            if(modalType === 'venda') await cloud.salvarVenda(editingItem);
            if(modalType === 'indicacao') await cloud.salvarIndicacao(editingItem);
            if(modalType === 'usuario') await cloud.salvarUsuario(editingItem);
            if(modalType === 'cancelamento') await cloud.salvarCancelamento(editingItem);
            if(modalType === 'meta') await cloud.salvarMeta(editingItem);
            if(modalType === 'empresa') await cloud.salvarEmpresa(editingItem);
            setModalType(null); setEditingItem(null);
          }}>
           <div className="space-y-6">
              {modalType === 'venda' && (
                 <div className="space-y-6">
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase text-xs outline-none focus:border-blue-500" placeholder="NOME COMPLETO" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">TELEFONE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none focus:border-blue-500" placeholder="(00) 00000-0000" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">SEGURADORA</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase font-bold text-xs outline-none focus:border-blue-500" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}><option value="">SELECIONE</option>{empresas.map(emp => <option key={emp.id} value={emp.nome}>{emp.nome.toUpperCase()}</option>)}</select></div>
                    </div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">VENDEDOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase font-bold text-xs outline-none focus:border-blue-500" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">PRÊMIO LÍQUIDO</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold text-xs outline-none focus:border-blue-500" value={editingItem?.valor || 0} onChange={e => setEditingItem({...editingItem, valor: Number(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">COMISSÃO CHEIA</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold text-xs outline-none focus:border-blue-500" value={editingItem?.comissao_cheia || 0} onChange={e => setEditingItem({...editingItem, comissao_cheia: Number(e.target.value)})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-green-500 ml-1">SUA COMISSÃO</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-green-500 font-bold text-xs outline-none focus:border-blue-500" value={editingItem?.comissao_vendedor || 0} onChange={e => setEditingItem({...editingItem, comissao_vendedor: Number(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">STATUS</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase font-bold text-xs outline-none focus:border-blue-500" value={editingItem?.status || 'Fazer Vistoria'} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>{VENDA_STATUS_MAP.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></div>
                    </div>
                 </div>
              )}
              {modalType === 'indicacao' && (
                 <div className="space-y-5">
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">NOME CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase text-xs outline-none focus:border-yellow-500" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">TELEFONE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none focus:border-yellow-500" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">VEÍCULO</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs uppercase outline-none focus:border-yellow-500" value={editingItem?.veiculo || ''} onChange={e => setEditingItem({...editingItem, veiculo: e.target.value.toUpperCase()})} /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">VENDEDOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs uppercase font-bold outline-none focus:border-yellow-500" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}>{usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">OBSERVAÇÕES ADICIONAIS</label><textarea className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-[10px] uppercase outline-none focus:border-yellow-500 h-24 resize-none" value={editingItem?.info || ''} onChange={e => setEditingItem({...editingItem, info: e.target.value})} /></div>
                 </div>
              )}
              {modalType === 'cancelamento' && (
                 <div className="space-y-5">
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">NOME</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase text-xs outline-none focus:border-red-500" placeholder="NOME DO CLIENTE" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">VENDEDOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase text-xs font-bold outline-none focus:border-red-500" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[8px] font-black uppercase text-gray-500 ml-1">EMPRESA</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase text-xs font-bold outline-none focus:border-red-500" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}><option value="">SEGURADORA</option>{empresas.map(emp => <option key={emp.id} value={emp.nome}>{emp.nome.toUpperCase()}</option>)}</select></div>
                    </div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-red-500 ml-1">COMISSÃO ESTORNADA</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-red-500 font-bold text-xs outline-none focus:border-red-500" placeholder="R$ 0,00" value={editingItem?.valor_comissao || 0} onChange={e => setEditingItem({...editingItem, valor_comissao: Number(e.target.value)})} /></div>
                 </div>
              )}
              {modalType === 'usuario' && (
                 <div className="space-y-4">
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs uppercase font-bold" placeholder="NOME" value={editingItem?.nome || ''} onChange={e => setEditingItem({...editingItem, nome: e.target.value.toUpperCase()})} />
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs" placeholder="LOGIN" value={editingItem?.login || ''} onChange={e => setEditingItem({...editingItem, login: e.target.value.toLowerCase()})} />
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs" placeholder="SENHA" value={editingItem?.senha || ''} onChange={e => setEditingItem({...editingItem, senha: e.target.value})} />
                    <select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs font-bold" value={editingItem?.setor || 'VENDEDOR'} onChange={e => setEditingItem({...editingItem, setor: e.target.value})}><option value="VENDEDOR">VENDEDOR</option><option value="RH">RH</option><option value="ADMIN">ADMINISTRADOR</option></select>
                    <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs font-bold" placeholder="% COMISSÃO" value={editingItem?.comissao || 0} onChange={e => setEditingItem({...editingItem, comissao: Number(e.target.value)})} />
                 </div>
              )}
              {modalType === 'empresa' && (
                 <div className="space-y-4">
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs uppercase font-bold" placeholder="NOME SEGURADORA" value={editingItem?.nome || ''} onChange={e => setEditingItem({...editingItem, nome: e.target.value.toUpperCase()})} />
                 </div>
              )}
              {modalType === 'meta' && (
                 <div className="space-y-4">
                    <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs font-bold" placeholder="META SALARIAL" value={editingItem?.meta_salario || 0} onChange={e => setEditingItem({...editingItem, meta_salario: Number(e.target.value)})} />
                    <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs font-bold" placeholder="META PRÊMIO" value={editingItem?.meta_premio || 0} onChange={e => setEditingItem({...editingItem, meta_premio: Number(e.target.value)})} />
                    <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs font-bold" placeholder="QUANTIDADE" value={editingItem?.meta_qtd || 0} onChange={e => setEditingItem({...editingItem, meta_qtd: Number(e.target.value)})} />
                 </div>
              )}
           </div>
        </ModalWrapper>
      )}
    </Layout>
  );
};

export default App;