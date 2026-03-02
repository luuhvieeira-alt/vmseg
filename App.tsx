import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, User, Venda, Indicacao, Meta, Empresa, Cancelamento, FacebookLead } from './types';
import { cloud } from './services/firebase';
import { FORMAT_BRL, INDICACAO_STATUS_MAP, VENDA_STATUS_MAP } from './constants';
import Layout from './components/Layout';
import AiAssistant from './components/AiAssistant';
import { 
  LayoutDashboard, Users, TrendingUp, DollarSign, XCircle, UserPlus, 
  Target, ShieldCheck, BarChart3, Settings, ExternalLink, Facebook 
} from 'lucide-react';

// --- COMPONENTES DE APOIO ---
const ModalWrapper: React.FC<{ 
  title: string; 
  onClose: () => void; 
  onSave: () => void | Promise<void>; 
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
        <button onClick={onClose} className="flex-1 bg-[#1e293b] hover:bg-gray-700 text-white p-4 rounded-xl font-black uppercase text-[10px] transition-all tracking-widest">CANCELAR</button>
        {!hideSave && (
          <button onClick={() => onSave()} className={`flex-1 p-4 rounded-xl font-black uppercase text-[10px] shadow-lg transition-all tracking-widest ${isYellow ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-[#2563eb] text-white hover:bg-blue-500'}`}>SALVAR</button>
        )}
      </div>
    </div>
  </div>
);

// --- DASHBOARD VIEW ---
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
    const prodCount = prodMesPerformance.length;
    const prodPremio = prodMesPerformance.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const prodComissao = prodMesPerformance.reduce((acc, v) => acc + Number((user.isAdmin || user.setor === 'RH') ? (v.comissao_cheia || 0) : (v.comissao_vendedor || 0)), 0);

    return { 
      vHojeCount, pHojeTotal, vMesTotal, pMesPagoTotal, 
      prodCount, prodPremio, prodComissao,
      cMeta, uMeta,
      funilVendas: VENDA_STATUS_MAP.map(s => ({ status: s, count: dashboardVendas.filter(v => v.dataCriacao >= startOfMonth && v.status === s).length, pct: Math.round((dashboardVendas.filter(v => v.status === s).length / (dashboardVendas.length || 1)) * 100) })),
      funilLeads: INDICACAO_STATUS_MAP.map(s => ({ status: s, count: indicacoes.filter(i => i.status === s).length, pct: Math.round((indicacoes.filter(i => i.status === s).length / (indicacoes.length || 1)) * 100) }))
    };
  }, [vendas, indicacoes, metas, user]);

  const metaRef = (user.isAdmin || user.setor === 'RH') ? stats.cMeta : stats.uMeta;
  const percVendas = Math.min(Math.round((stats.prodCount / (metaRef.meta_qtd || 1)) * 100), 100);
  const percPremio = Math.min(Math.round((stats.prodPremio / (metaRef.meta_premio || 1)) * 100), 100);
  const percComissao = Math.min(Math.round((stats.prodComissao / (metaRef.meta_salario || 1)) * 100), 100);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4 pb-20">
      <h2 className="text-[32px] font-black uppercase text-white tracking-tight text-center mt-6">VOCÊ SÓ VENCE AMANHÃ SE NÃO DESISTIR HOJE!</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111827] p-8 rounded-[1.5rem] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">VENDAS (HOJE)</p>
          <h3 className="text-6xl font-black text-white">{stats.vHojeCount}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase tracking-widest">LANÇAMENTOS DO DIA</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border-l-2 border-l-[#10b981] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">PRÊMIO LÍQUIDO (HOJE)</p>
          <h3 className="text-[38px] font-black text-[#10b981] font-mono tracking-tighter">{FORMAT_BRL(stats.pHojeTotal)}</h3>
          <p className="text-gray-700 text-[8px] font-bold mt-2 uppercase tracking-widest">TOTAL PRODUZIDO HOJE</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">VENDAS (NO MÊS)</p>
          <h3 className="text-6xl font-black text-white">{stats.vMesTotal}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase tracking-widest">TOTAL ACUMULADO MÊS</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[1.5rem] border-l-2 border-l-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3 tracking-widest">PRÊMIO LÍQUIDO (NO MÊS)</p>
          <h3 className="text-[38px] font-black text-white font-mono tracking-tighter">{FORMAT_BRL(stats.pMesPagoTotal)}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase tracking-widest">APENAS PAGAMENTOS CONFIRMADOS</p>
        </div>
      </div>
      <div className="bg-[#111827] p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-gray-800/20">
        <h3 className="text-[11px] font-black uppercase text-white mb-12 flex items-center gap-3 tracking-widest">
          <i className="fas fa-chart-line text-[#a855f7]"></i> PERFORMANCE CONSOLIDADA (VM SEGUROS)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-20 relative lg:pr-32">
          <div className="space-y-4 relative">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">VENDAS TOTAIS EMPRESA</p>
            <h4 className="text-[28px] font-black text-white">{stats.prodCount} <span className="text-gray-700">/ {metaRef.meta_qtd}</span></h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                <div className="bg-[#a855f7] h-full" style={{ width: `${percVendas}%` }}></div>
            </div>
            <span className="absolute -bottom-6 text-[10px] font-black text-[#a855f7]" style={{ left: `${percVendas}%` }}>{percVendas}%</span>
          </div>
          <div className="space-y-4 relative">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">PRÊMIO BRUTO ACUMULADO</p>
            <h4 className="text-[28px] font-black text-white font-mono tracking-tighter">{FORMAT_BRL(stats.prodPremio)}</h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                <div className="bg-[#22c55e] h-full" style={{ width: `${percPremio}%` }}></div>
            </div>
            <span className="absolute -bottom-6 text-[10px] font-black text-[#22c55e]" style={{ left: `${percPremio}%` }}>{percPremio}%</span>
            <p className="text-[7px] font-black text-gray-700 uppercase mt-1">META: {FORMAT_BRL(metaRef.meta_premio)}</p>
          </div>
          <div className="space-y-4 relative">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">COMISSÃO BRUTA EMPRESA</p>
            <h4 className="text-[28px] font-black text-white font-mono tracking-tighter">{FORMAT_BRL(stats.prodComissao)}</h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                <div className="bg-[#eab308] h-full" style={{ width: `${percComissao}%` }}></div>
            </div>
            <p className="text-[7px] font-black text-gray-700 uppercase mt-1">META: {FORMAT_BRL(metaRef.meta_salario)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- FACEBOOK ADS VIEW ---
const FacebookAdsView: React.FC<{ leads: FacebookLead[] }> = ({ leads }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-full px-10">
      <div className="flex justify-between items-center">
        <h2 className="text-[38px] font-black uppercase text-blue-500 tracking-tighter">FACEBOOK ADS LEADS</h2>
        <div className="bg-blue-900/20 px-6 py-3 rounded-xl border border-blue-500/30">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Conectado via Make.com</p>
        </div>
      </div>
      <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800/50 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-800/50">
            <tr>
              <th className="px-10 py-8">DATA GERADA</th>
              <th className="px-10 py-8">NOME</th>
              <th className="px-10 py-8">TELEFONE</th>
              <th className="px-10 py-8">VEÍCULO</th>
              <th className="px-10 py-8 text-center">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {leads.length === 0 ? (
              <tr><td colSpan={5} className="px-10 py-12 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Aguardando leads...</td></tr>
            ) : (
              leads.map((lead, idx) => (
                <tr key={lead.id || `lead-${idx}`} className="hover:bg-white/5 transition-colors group">
                  <td className="px-10 py-6 text-gray-500 font-bold text-[11px]">{new Date(lead.dataGerada).toLocaleString('pt-BR')}</td>
                  <td className="px-10 py-6 text-white font-black text-[11px] uppercase tracking-tight">{lead.nome}</td>
                  <td className="px-10 py-6 text-blue-400 font-black text-[11px]">{lead.telefone}</td>
                  <td className="px-10 py-6 text-gray-400 font-bold text-[10px] uppercase">{lead.veiculo || 'NÃO INFORMADO'}</td>
                  <td className="px-10 py-6 text-center">
                    <button onClick={() => { if(window.confirm('Excluir lead?')) cloud.apagar('facebook_leads', lead.id!) }} className="text-red-500 hover:scale-110 transition"><i className="fas fa-trash-alt"></i></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [facebookLeads, setFacebookLeads] = useState<FacebookLead[]>([]);

  useEffect(() => {
    const unsubVendas = cloud.subscribeVendas(setVendas);
    const unsubUsers = cloud.subscribeUsuarios(setUsuarios);
    const unsubMetas = cloud.subscribeMetas(setMetas);
    const unsubIndicacoes = cloud.subscribeIndicacoes(setIndicacoes);
    const unsubFacebookLeads = cloud.subscribeFacebookLeads(setFacebookLeads);
    return () => { unsubVendas(); unsubUsers(); unsubMetas(); unsubIndicacoes(); unsubFacebookLeads(); };
  }, []);

  const handleLogin = () => {
    const uI = (loginForm.username || '').trim().toLowerCase();
    const pI = (loginForm.password || '').trim();
    if (uI === 'admin' && pI === 'Realmadridfc123@') {
      setUser({ id: 'admin-id', nome: 'ADMIN MASTER', setor: 'ADMIN', isAdmin: true, login: 'admin', comissao: 100 });
      setIsAuthenticated(true);
    } else {
      const found = usuarios.find(u => (u.login || '').toLowerCase() === uI && u.senha === pI);
      if (found) { setUser({ ...found, isAdmin: found.setor === 'ADMIN' }); setIsAuthenticated(true); } else { alert('Credenciais inválidas'); }
    }
  };

  if (!isAuthenticated || !user) return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-10"><h1 className="text-3xl font-black text-white tracking-tighter uppercase">VM SEGUROS</h1><p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2">Cloud CRM Elite</p></div>
      <div className="bg-[#111827] w-full max-w-[320px] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-6">
        <div className="space-y-4">
          <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none" placeholder="Login" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
          <input type="password" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none" placeholder="Senha" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
        </div>
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase text-[10px] hover:bg-blue-500 transition-all">Entrar</button>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={() => { setIsAuthenticated(false); setUser(null); }} activeSection={activeSection} setActiveSection={setActiveSection}>
      {activeSection === 'dashboard' && <DashboardView vendas={vendas} indicacoes={indicacoes} metas={metas} user={user} />}
      {activeSection === 'facebook-ads' && <FacebookAdsView leads={facebookLeads} />}
      {/* Adicione as outras seções conforme necessário */}
    </Layout>
  );
};

export default App;
