import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, User, Venda, Indicacao, Meta, Empresa, Cancelamento, FacebookLead } from './types';
import { cloud } from './services/firebase';
import { FORMAT_BRL, INDICACAO_STATUS_MAP, VENDA_STATUS_MAP } from './constants';
import Layout from './components/Layout';

const ModalWrapper: React.FC<{ 
  title: string; 
  onClose: () => void; 
  onSave: () => void | Promise<void>; 
  children: React.ReactNode;
  hideSave?: boolean;
  isYellow?: boolean;
}> = ({ title, onClose, onSave, children, hideSave, isYellow }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
    <div className="bg-[#111827] w-full max-w-xl rounded-[2rem] border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0b0f1a]/30">
        <h3 className={`text-sm font-black uppercase tracking-widest ${isYellow ? 'text-yellow-500' : 'text-white'}`}>{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition"><i className="fas fa-times text-lg"></i></button>
      </div>
      <div className="p-8 overflow-y-auto scrollbar-thin max-h-[75vh] bg-[#111827]">
        {children}
      </div>
      <div className="p-6 border-t border-gray-800 flex gap-4 bg-[#0b0f1a]/30">
        <button onClick={onClose} className="flex-1 bg-[#1e293b] hover:bg-gray-700 text-white p-4 rounded-xl font-black uppercase text-[10px] transition-all tracking-widest">CANCELAR</button>
        {!hideSave && (
          <button onClick={() => onSave()} className={`flex-1 p-4 rounded-xl font-black uppercase text-[10px] shadow-lg transition-all tracking-widest ${isYellow ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-[#2563eb] text-white hover:bg-blue-500'}`}>SALVAR</button>
        )}
      </div>
    </div>
  </div>
);

const DashboardView: React.FC<{ vendas: Venda[], indicacoes: Indicacao[], metas: Meta[], user: AuthUser }> = ({ vendas, indicacoes, metas, user }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const uNome = (user.nome || '').trim().toUpperCase();
    const baseVendas = (user.isAdmin || user.setor === 'RH') ? vendas : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
    const dashboardVendas = baseVendas.filter(v => v.origem !== 'RH');
    const hojeVendas = dashboardVendas.filter(v => v.dataCriacao >= startOfDay.getTime());
    const mesVendasPagas = dashboardVendas.filter(v => v.dataCriacao >= startOfMonth && v.status === 'Pagamento Efetuado');
    const vHojeCount = hojeVendas.length;
    const pHojeTotal = hojeVendas.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const vMesTotal = dashboardVendas.filter(v => v.dataCriacao >= startOfMonth).length;
    const pMesPagoTotal = mesVendasPagas.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const cMeta = metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS') || { meta_qtd: 270, meta_premio: 250000, meta_salario: 50000 };
    const uMeta = metas.find(m => (m.vendedor || '').toUpperCase() === uNome) || { meta_qtd: 1, meta_premio: 1, meta_salario: 1 };
    const prodMesPerformance = dashboardVendas.filter(v => v.dataCriacao >= startOfMonth && ['Mandar Boletos', 'Falta Pagamento', 'Pagamento Efetuado'].includes(v.status));
    return { vHojeCount, pHojeTotal, vMesTotal, pMesPagoTotal, prodCount: prodMesPerformance.length, prodPremio: prodMesPerformance.reduce((acc, v) => acc + Number(v.valor || 0), 0), cMeta, uMeta };
  }, [vendas, metas, user]);

  return (
    <div className="space-y-12 max-w-[1600px] mx-auto px-4 pb-20">
      <h2 className="text-[32px] font-black uppercase text-white tracking-tight text-center mt-6 italic">VOCÊ SÓ VENCE AMANHÃ SE NÃO DESISTIR HOJE!</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111827] p-8 rounded-[1.5rem] shadow-xl border border-gray-800/50">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">VENDAS (HOJE)</p>
          <h3 className="text-6xl font-black text-white">{stats.vHojeCount}</h3>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border-l-4 border-l-[#10b981] shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">PRÊMIO LÍQUIDO (HOJE)</p>
          <h3 className="text-[38px] font-black text-[#10b981] font-mono tracking-tighter">{FORMAT_BRL(stats.pHojeTotal)}</h3>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] shadow-xl border border-gray-800/50">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">VENDAS (NO MÊS)</p>
          <h3 className="text-6xl font-black text-white">{stats.vMesTotal}</h3>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border-l-4 border-l-white shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">PRÊMIO LÍQUIDO (NO MÊS)</p>
          <h3 className="text-[38px] font-black text-white font-mono tracking-tighter">{FORMAT_BRL(stats.pMesPagoTotal)}</h3>
        </div>
      </div>
    </div>
  );
};const FacebookAdsView: React.FC<{ leads: FacebookLead[] }> = ({ leads }) => (
  <div className="space-y-10 max-w-full px-10">
    <h2 className="text-[38px] font-black uppercase text-blue-500 tracking-tighter italic">FACEBOOK ADS LEADS</h2>
    <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800/50 overflow-hidden shadow-2xl">
      <table className="w-full text-left">
        <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-800/50">
          <tr><th className="px-10 py-8">DATA</th><th className="px-10 py-8">NOME</th><th className="px-10 py-8">TELEFONE</th><th className="px-10 py-8">VEÍCULO</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-800/30">
          {leads.map((l, idx) => (
            <tr key={l.id || idx} className="hover:bg-white/5 transition-colors">
              <td className="px-10 py-6 text-gray-500 font-bold text-[11px]">{new Date(l.dataGerada).toLocaleString()}</td>
              <td className="px-10 py-6 text-white font-black text-[11px] uppercase">{l.nome}</td>
              <td className="px-10 py-6 text-blue-400 font-black text-[11px]">{l.telefone}</td>
              <td className="px-10 py-6 text-gray-400 font-bold text-[10px] uppercase">{l.veiculo || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [section, setSection] = useState('dashboard');
  const [login, setLogin] = useState({ u: '', p: '' });
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [leads, setLeads] = useState<FacebookLead[]>([]);

  useEffect(() => {
    cloud.subscribeVendas(setVendas);
    cloud.subscribeUsuarios(setUsers);
    cloud.subscribeMetas(setMetas);
    cloud.subscribeFacebookLeads(setLeads);
  }, []);

  const handleLogin = () => {
    if (login.u === 'admin' && login.p === 'Realmadridfc123@') {
      setUser({ id: 'admin', nome: 'ADMIN', setor: 'ADMIN', isAdmin: true, login: 'admin', comissao: 100 });
      setIsAuth(true);
    } else {
      const found = users.find(u => u.login === login.u && u.senha === login.p);
      if (found) { setUser({ ...found, isAdmin: found.setor === 'ADMIN' }); setIsAuth(true); }
      else alert('Erro!');
    }
  };

  if (!isAuth || !user) return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-black text-white mb-10 italic">VM SEGUROS</h1>
      <div className="bg-[#111827] w-full max-w-[320px] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-4">
        <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs" placeholder="Login" onChange={e => setLogin({...login, u: e.target.value})} />
        <input type="password" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs" placeholder="Senha" onChange={e => setLogin({...login, p: e.target.value})} />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase text-[10px]">ENTRAR</button>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={() => setIsAuth(false)} activeSection={section} setActiveSection={setSection}>
      {section === 'dashboard' && <DashboardView vendas={vendas} indicacoes={[]} metas={metas} user={user} />}
      {section === 'facebook-ads' && <FacebookAdsView leads={leads} />}
    </Layout>
  );
};

export default App;
