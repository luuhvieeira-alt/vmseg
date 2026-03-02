import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, User, Venda, Indicacao, Meta, Empresa, Cancelamento, FacebookLead } from './types';
import { cloud } from './services/firebase';
import { FORMAT_BRL, INDICACAO_STATUS_MAP, VENDA_STATUS_MAP } from './constants';
import Layout from './components/Layout';
import AiAssistant from './components/AiAssistant';

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
            <div className="absolute -right-20 top-0 hidden lg:flex flex-col items-center opacity-40">
                <i className="fas fa-building text-6xl text-gray-700"></i>
                <span className="text-[10px] font-black text-[#eab308] mt-2">35%</span>
            </div>
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
        <div className="flex gap-4">
          <button 
            onClick={async () => {
              try {
                await cloud.salvarFacebookLead({
                  nome: "LEAD DE TESTE SISTEMA",
                  telefone: "(11) 99999-9999",
                  veiculo: "TESTE DRIVE",
                  dataGerada: Date.now()
                });
                alert("Lead de teste enviado com sucesso! Verifique seu Firebase.");
              } catch (e) {
                console.error(e);
                alert("Erro ao enviar lead de teste. Verifique o console.");
              }
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-500 transition-all"
          >
            <i className="fas fa-vial mr-2"></i> Gerar Lead de Teste
          </button>
          <div className="bg-blue-900/20 px-6 py-3 rounded-xl border border-blue-500/30">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Conectado via Make.com</p>
          </div>
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
              <tr>
                <td colSpan={5} className="px-10 py-12 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">
                  Aguardando leads do Facebook/Instagram...
                </td>
              </tr>
            ) : (
              leads.map((lead, idx) => (
                <tr key={lead.id || `lead-${idx}`} className="hover:bg-white/5 transition-colors group">
                  <td className="px-10 py-6 text-gray-500 font-bold text-[11px]">
                    {new Date(lead.dataGerada).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-10 py-6 text-white font-black text-[11px] uppercase tracking-tight">
                    {lead.nome}
                  </td>
                  <td className="px-10 py-6 text-blue-400 font-black text-[11px]">
                    {lead.telefone}
                  </td>
                  <td className="px-10 py-6 text-gray-400 font-bold text-[10px] uppercase">
                    {lead.veiculo || 'NÃO INFORMADO'}
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={async () => {
                          if(window.confirm('Deseja converter este lead em uma Indicação no CRM?')) {
                            try {
                              await cloud.salvarIndicacao({
                                cliente: lead.nome,
                                tel: lead.telefone,
                                veiculo: lead.veiculo,
                                vendedor: 'SEM VENDEDOR',
                                suhai: false,
                                info: 'Lead vindo do Facebook Ads',
                                status: 'NOVA INDICAÇÃO',
                                dataCriacao: Date.now()
                              });
                              await cloud.apagar('facebook_leads', lead.id!);
                              alert('Lead convertido com sucesso!');
                            } catch (e) {
                              console.error(e);
                              alert('Erro ao converter lead.');
                            }
                          }
                        }}
                        className="text-green-500 hover:text-green-400 transition-colors"
                        title="Converter em Lead CRM"
                      >
                        <i className="fas fa-user-plus"></i>
                      </button>
                      <button 
                        onClick={() => {
                          if(window.confirm('Deseja excluir este lead?')) cloud.apagar('facebook_leads', lead.id!);
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors"
                        title="Excluir Lead"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-900/10 border border-blue-500/20 p-8 rounded-[2rem] mt-10">
        <h4 className="text-blue-400 font-black uppercase text-xs mb-4 tracking-widest">Instruções de Integração (Make.com)</h4>
        <div className="space-y-3 text-[11px] text-gray-400 font-medium">
          <p>1. No Make.com, use o módulo <span className="text-white font-bold">Firebase Cloud Firestore</span>.</p>
          <p>2. Escolha a ação <span className="text-white font-bold">Create a Document</span>.</p>
          <p>3. Collection ID: <span className="text-white font-bold">facebook_leads</span></p>
          <p>4. Mapeie os campos: <span className="text-white font-bold">nome</span>, <span className="text-white font-bold">telefone</span>, <span className="text-white font-bold">veiculo</span>.</p>
          <p>5. Adicione o campo <span className="text-white font-bold">dataGerada</span> com o valor <span className="text-white font-bold">now</span> (ou timestamp).</p>
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
  const [facebookLeads, setFacebookLeads] = useState<FacebookLead[]>([]);
  const [modalType, setModalType] = useState<'venda' | 'indicacao' | 'usuario' | 'empresa' | 'meta' | 'cancelamento' | 'ver_info_lead' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [aiAssistantLead, setAiAssistantLead] = useState<any>(null);

  useEffect(() => {
    cloud.checkAndRunCleanup();
    const unsubVendas = cloud.subscribeVendas(setVendas);
    const unsubUsers = cloud.subscribeUsuarios(setUsuarios);
    const unsubMetas = cloud.subscribeMetas(setMetas);
    const unsubIndicacoes = cloud.subscribeIndicacoes(setIndicacoes);
    const unsubEmpresas = cloud.subscribeEmpresas(setEmpresas);
    const unsubCancelamentos = cloud.subscribeCancelamentos(setCancelamentos);
    const unsubFacebookLeads = cloud.subscribeFacebookLeads(setFacebookLeads);
    return () => { unsubVendas(); unsubUsers(); unsubMetas(); unsubIndicacoes(); unsubEmpresas(); unsubCancelamentos(); unsubFacebookLeads(); };
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

  // --- HOOKS AT THE TOP ---

  const currentUserData = useMemo(() => {
    if (!user) return null;
    const dbUser = usuarios.find(u => u.id === user.id);
    if (!dbUser) return user;
    return { ...dbUser, isAdmin: dbUser.setor === 'ADMIN' } as AuthUser;
  }, [user, usuarios]);

  const filteredVendas = useMemo(() => {
    if (!currentUserData) return [];
    return vendas.filter(v => {
      if (v.origem === 'RH') return false;
      const matchesSalesman = (currentUserData.setor === 'ADMIN' || currentUserData.setor === 'RH') 
        ? (salesmanFilter === 'TODOS' || (v.vendedor || '').toUpperCase() === salesmanFilter.toUpperCase()) 
        : (v.vendedor || '').toUpperCase() === (currentUserData.nome || '').toUpperCase();
      const cNome = (v.cliente || '').toUpperCase();
      const sTerm = searchTerm.toUpperCase();
      return matchesSalesman && (cNome.includes(sTerm) || (v.tel || '').includes(searchTerm));
    });
  }, [vendas, currentUserData, salesmanFilter, searchTerm]);

  const filteredIndicacoes = useMemo(() => {
    if (!currentUserData) return [];
    return indicacoes.filter(i => {
      const matchesSalesman = (currentUserData.setor === 'ADMIN' || currentUserData.setor === 'RH') 
        ? (salesmanFilter === 'TODOS' || (i.vendedor || '').toUpperCase() === salesmanFilter.toUpperCase()) 
        : (i.vendedor || '').toUpperCase() === (currentUserData.nome || '').toUpperCase();
      const cNome = (i.cliente || '').toUpperCase();
      const sTerm = searchTerm.toUpperCase();
      return matchesSalesman && (cNome.includes(sTerm) || (i.tel || '').includes(searchTerm));
    });
  }, [indicacoes, currentUserData, salesmanFilter, searchTerm]);

  const filteredCancelamentos = useMemo(() => {
    if (!currentUserData) return [];
    if (currentUserData.setor === 'ADMIN' || currentUserData.setor === 'RH') return cancelamentos;
    const uNome = (currentUserData.nome || '').trim().toUpperCase();
    return cancelamentos.filter(c => (c.vendedor || '').trim().toUpperCase() === uNome);
  }, [cancelamentos, currentUserData]);

  const financeiroVendas = useMemo(() => {
    if (!currentUserData) return [];
    const isMaster = currentUserData.setor === 'ADMIN' || currentUserData.setor === 'RH';
    return vendas.filter(v => {
      if (v.origem === 'RH' || v.status !== 'Pagamento Efetuado') return false;
      if (isMaster) return true;
      return (v.vendedor || '').trim().toUpperCase() === (currentUserData.nome || '').trim().toUpperCase();
    });
  }, [vendas, currentUserData]);

  // --- CONDITIONAL RETURNS ---

  if (!isAuthenticated || !currentUserData) return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-10"><h1 className="text-3xl font-black text-white tracking-tighter uppercase">VM SEGUROS</h1><p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2">Cloud CRM Elite</p></div>
      <div className="bg-[#111827] w-full max-w-[320px] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-6">
        <div className="space-y-4">
          <div className="space-y-1 text-left"><label className="text-[9px] font-black text-gray-600 uppercase ml-2">Acesso</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none" placeholder="Login" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} /></div>
          <div className="space-y-1 text-left"><label className="text-[9px] font-black text-gray-600 uppercase ml-2">Senha</label><input type="password" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none" placeholder="Senha" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} /></div>
        </div>
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase text-[10px] hover:bg-blue-500 transition-all">Entrar</button>
      </div>
    </div>
  );

  return (
    <Layout user={currentUserData} onLogout={() => { setIsAuthenticated(false); setUser(null); }} activeSection={activeSection} setActiveSection={(s) => { setActiveSection(s); setSelectedSellerRh(null); }}>
      
      {activeSection === 'dashboard' && <DashboardView vendas={vendas} indicacoes={indicacoes} metas={metas} user={currentUserData} />}
      
      {/* PAGINA INDICAÇÕES */}
      {activeSection === 'kanban-indicacoes' && (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-full px-4">
           <div className="flex justify-between items-center px-4">
              <h2 className="text-[34px] font-black uppercase text-yellow-500 tracking-tighter">LEADS</h2>
              <button onClick={() => setModalType('indicacao')} className="bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg hover:scale-105 transition-all">NOVO LEAD</button>
           </div>
           <div className="flex gap-4 px-4 mb-4">
              <div className="flex-1 relative"><input className="w-full bg-[#111827] border border-gray-800/50 p-4 rounded-xl text-xs text-white uppercase outline-none focus:border-yellow-500/50 transition-all shadow-inner" placeholder="BUSCAR LEADS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              <div className="w-72"><select className="w-full bg-[#111827] border border-gray-800/50 p-4 rounded-xl text-xs text-white uppercase outline-none font-bold" value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}><option value="TODOS">TODOS VENDEDORES</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map((u, idx) => <option key={u.id || `vendedor-${idx}`} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
           </div>
           <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-280px)] px-4">
             {INDICACAO_STATUS_MAP.map(status => (
                <div key={status} className="kanban-column flex flex-col w-[350px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/20 p-4">
                  <h3 className="text-[11px] font-black uppercase text-gray-500 text-center mb-6 py-4 border-b border-gray-800/30 tracking-[0.2em]">{status}</h3>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                    {filteredIndicacoes.filter(i => i.status === status).map((i, idx) => (
                      <div key={i.id || `ind-${idx}`} className="bg-[#111827] rounded-[2.2rem] p-8 border border-gray-800/30 shadow-xl relative group transition-all hover:border-yellow-500/20">
                        <div className="absolute top-8 right-8 flex gap-4">
                          <button onClick={() => { 
                            const { id, ...leadData } = i;
                            setEditingItem({ 
                              ...leadData, 
                              leadIdToDelete: id, 
                              status: 'Fazer Vistoria', 
                              valor: 0, 
                              comissao_cheia: 0, 
                              comissao_vendedor: 0 
                            }); 
                            setModalType('venda'); 
                          }} className="text-[#10b981] hover:scale-110 transition opacity-60 hover:opacity-100"><i className="fas fa-check text-base"></i></button>
                          <button onClick={() => { if(window.confirm('Excluir lead?')) cloud.apagar('indicacoes', i.id!) }} className="text-red-500 hover:scale-110 transition opacity-40 hover:opacity-100"><i className="fas fa-trash-alt text-base"></i></button>
                          <button onClick={() => { setEditingItem(i); setModalType('indicacao'); }} className="text-gray-500 hover:text-white transition"><i className="fas fa-edit text-sm"></i></button>
                        </div>
                        <div className="space-y-4">
                          <div><p className="text-[15px] font-black text-white uppercase tracking-tight">{i.cliente}</p><p className="text-[12px] font-black text-yellow-500 mt-1">{i.tel}</p></div>
                          <div className="space-y-1"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{i.veiculo || 'NÃO INFORMADO'}</p><p className="text-[9px] font-bold text-gray-700 uppercase">DATA: {new Date(i.dataCriacao).toLocaleDateString()}</p>{i.suhai && <p className="text-[9px] font-black text-green-500 uppercase s-suhai-pulse mt-1">SUHAI</p>}</div>
                          <div className="flex justify-between items-center pt-5 border-t border-gray-800/50">
                            <button onClick={() => moveIndicacao(i, 'left')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-left text-xs"></i></button>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{i.vendedor || 'SEM VENDEDOR'}</span>
                            <button onClick={() => moveIndicacao(i, 'right')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-right text-xs"></i></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {/* PAGINA PRODUÇÃO */}
      {activeSection === 'kanban-vendas' && (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-full px-4">
           <div className="flex justify-between items-center px-4"><h2 className="text-[34px] font-black uppercase text-blue-500 tracking-tighter">PRODUÇÃO</h2><button onClick={() => { setEditingItem({ status: 'Fazer Vistoria', vendedor: currentUserData.nome.toUpperCase(), valor: 0, comissao_cheia: 0, comissao_vendedor: 0, dataCriacao: Date.now() }); setModalType('venda'); }} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-xl hover:scale-105 transition-all">LANÇAR VENDA</button></div>
           <div className="flex gap-4 px-4 mb-4"><div className="flex-1 relative"><input className="w-full bg-[#111827] border border-gray-800/50 p-4 rounded-xl text-xs text-white uppercase outline-none focus:border-blue-500/50 transition-all shadow-inner" placeholder="PESQUISAR PRODUÇÃO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div><div className="w-72"><select className="w-full bg-[#111827] border border-gray-800/50 p-4 rounded-xl text-xs text-white uppercase outline-none font-bold" value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}><option value="TODOS">TODOS VENDEDORES</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map((u, idx) => <option key={u.id || `vendedor-prod-${idx}`} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div></div>
           <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-280px)] px-4">
             {VENDA_STATUS_MAP.map(status => (
                <div key={status} className="kanban-column flex flex-col w-[380px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/20 p-4">
                  <h3 className="text-[11px] font-black uppercase text-gray-500 text-center mb-6 py-4 border-b border-gray-800/30 tracking-[0.2em]">{status}</h3>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                    {filteredVendas.filter(v => v.status === status).map((v, idx) => (
                      <div key={v.id || `venda-${idx}`} className="bg-[#111827] rounded-[2.2rem] p-8 border border-gray-800/30 shadow-xl relative group transition-all hover:border-yellow-500/20">
                        <div className="absolute top-8 right-8 flex gap-4">
                          <button 
                            onClick={() => { if(window.confirm('Excluir venda?')) cloud.apagar('vendas', v.id!) }} 
                            className="text-red-500 hover:scale-110 transition opacity-40 hover:opacity-100"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                          <button onClick={() => { setEditingItem(v); setModalType('venda'); }} className="text-gray-600 hover:text-white transition">
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <p className="text-[14px] font-black text-white uppercase tracking-tight">{v.cliente}</p>
                            <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase">{v.tel} | {v.empresa || 'SEGURADORA'}</p>
                            <p className="text-[9px] font-bold text-gray-700 mt-1 uppercase">DATA: {new Date(v.dataCriacao).toLocaleDateString()}</p>
                          </div>
                          <div className="text-center bg-[#0b0f1a]/60 py-6 px-4 rounded-[1.8rem] border border-gray-800/50 shadow-inner">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">PRÊMIO LÍQUIDO</p>
                            <h4 className="text-[28px] font-black text-white font-mono tracking-tighter">{FORMAT_BRL(v.valor)}</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0b0f1a]/40 p-4 rounded-2xl border border-gray-800/30 text-center shadow-inner">
                              <p className="text-[8px] font-black text-gray-600 uppercase mb-1">C. CHEIA</p>
                              <p className="text-[11px] font-black text-white font-mono">{FORMAT_BRL(v.comissao_cheia)}</p>
                            </div>
                            <div className="bg-[#0b0f1a]/40 p-4 rounded-2xl border border-gray-800/30 text-center shadow-inner">
                              <p className="text-[8px] font-black text-gray-600 uppercase mb-1">SUA PARTE</p>
                              <p className="text-[11px] font-black text-green-500 font-mono">{FORMAT_BRL(v.comissao_vendedor)}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-5 border-t border-gray-800/50">
                            <button onClick={() => moveVenda(v, 'left')} className="text-gray-600 hover:text-white transition">
                              <i className="fas fa-chevron-left text-xs"></i>
                            </button>
                            <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest">{v.vendedor}</span>
                            <button onClick={() => moveVenda(v, 'right')} className="text-gray-600 hover:text-white transition">
                              <i className="fas fa-chevron-right text-xs"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {/* MINHA FOLHA DE PAGAMENTO (VENDEDOR - APENAS RH) */}
      {activeSection === 'pagamento' && currentUserData.setor === 'VENDEDOR' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[32px] font-black text-green-400 uppercase tracking-tighter">MINHA FOLHA DE PAGAMENTO (RH)</h2>
            <button onClick={() => window.print()} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-green-500 transition-all"><i className="fas fa-print mr-2"></i> IMPRIMIR MINHA FOLHA</button>
          </div>
          <div id="financeiro-table" className="bg-[#111827] rounded-[1.5rem] border border-gray-800/30 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0b0f1a]/80 text-[8px] font-black uppercase text-gray-500 border-b border-gray-800/50"><tr><th className="px-8 py-6 tracking-widest">DATA</th><th className="px-8 py-6 tracking-widest">CLIENTE</th><th className="px-8 py-6 tracking-widest">SEGURADORA</th><th className="px-8 py-6 tracking-widest">PRÊMIO LÍQUIDO</th><th className="px-8 py-6 tracking-widest">C. CHEIA</th><th className="px-8 py-6 tracking-widest">% VEND</th><th className="px-8 py-6 tracking-widest">COMISSÃO</th></tr></thead>
              <tbody className="divide-y divide-gray-800/30">
                {vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === (currentUserData.nome || '').trim().toUpperCase() && v.origem === 'RH').map((v, idx) => (
                  <tr key={v.id || `venda-rh-${idx}`} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5 text-gray-500 font-bold text-[9px]">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-8 py-5 text-white font-black text-[10px] uppercase tracking-tight">{v.cliente}</td>
                    <td className="px-8 py-5 text-gray-500 font-bold text-[9px] uppercase">{v.empresa}</td>
                    <td className="px-8 py-5 text-white font-bold text-[10px] font-mono">{FORMAT_BRL(v.valor)}</td>
                    <td className="px-8 py-5 text-blue-400 font-black text-[10px] font-mono">{FORMAT_BRL(v.comissao_cheia)}</td>
                    <td className="px-8 py-5 text-orange-400 font-black text-[10px] font-mono">{v.porcentagem_vendida || 0}%</td>
                    <td className="px-8 py-5 text-green-500 font-black text-[10px] font-mono">{FORMAT_BRL(v.comissao_vendedor)}</td>
                  </tr>
                ))}
                {vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === (currentUserData.nome || '').trim().toUpperCase() && v.origem === 'RH').length === 0 && (
                  <tr><td colSpan={7} className="px-10 py-12 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Nenhum lançamento encontrado em sua folha</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center mt-12 pb-10">
            <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800/50 text-center min-w-[400px] shadow-2xl relative group overflow-hidden">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">VALOR TOTAL A RECEBER</p>
               <h4 className="text-[72px] font-black text-green-500 tracking-tighter leading-none font-mono">
                 {FORMAT_BRL(vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === (currentUserData.nome || '').trim().toUpperCase() && v.origem === 'RH').reduce((acc, curr) => acc + Number(curr.comissao_vendedor || 0), 0))}
               </h4>
               <div className="absolute inset-0 border-2 border-green-500/5 rounded-[2.5rem] pointer-events-none group-hover:border-green-500/20 transition-all duration-700"></div>
            </div>
          </div>
        </div>
      )}

      {/* CANCELAMENTOS */}
      {activeSection === 'cancelamentos' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-full px-10">
           <div className="flex justify-between items-center"><h2 className="text-[38px] font-black uppercase text-red-500 tracking-tight">CANCELAMENTOS</h2><button onClick={() => { setEditingItem({ dataCriacao: Date.now(), valor_comissao: 0 }); setModalType('cancelamento'); }} className="bg-red-500 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all">NOVO CANCELAMENTO</button></div>
           <div id="financeiro-table" className="bg-[#111827] rounded-[2.5rem] border border-gray-800/50 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 border-b border-gray-800/50">
                  <tr><th className="px-10 py-8">DATA</th><th className="px-10 py-8">CLIENTE</th><th className="px-10 py-8">SEGURADORA</th><th className="px-10 py-8">VENDEDOR</th><th className="px-10 py-8">VALOR ESTORNO</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {filteredCancelamentos.length === 0 ? (
                    <tr><td colSpan={5} className="px-10 py-12 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Nenhum registro encontrado</td></tr>
                  ) : (
                    filteredCancelamentos.map((c, idx) => (
                      <tr key={c.id || `canc-${idx}`} className="hover:bg-white/5 transition-colors group">
                        <td className="px-10 py-6 text-gray-500 font-bold text-[11px]">{c.dataCriacao ? new Date(c.dataCriacao).toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-10 py-6 text-white font-black text-[11px] uppercase tracking-tight">{c.cliente}</td>
                        <td className="px-10 py-6 text-gray-400 font-bold text-[10px] uppercase">{c.empresa || 'SEGURADORA'}</td>
                        <td className="px-10 py-6 text-blue-500 font-black text-[11px] uppercase">{c.vendedor}</td>
                        <td className="px-10 py-6 text-red-500 font-black font-mono text-[11px]">{FORMAT_BRL(c.valor_comissao)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* FINANCEIRO (PRODUÇÃO) */}
      {activeSection === 'comissao' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-full px-10">
           <div className="flex justify-between items-center">
              <h2 className="text-[38px] font-black uppercase text-green-500 tracking-tight">
                {currentUserData.isAdmin ? 'FINANCEIRO GLOBAL' : 'MEU FINANCEIRO'}
              </h2>
              <button onClick={() => window.print()} className="bg-green-500 text-black px-6 py-3 rounded-lg font-black uppercase text-[10px] shadow-lg hover:bg-green-400 transition-all">BAIXAR PDF</button>
           </div>
           
           <div className="flex justify-center">
             <div className="bg-[#111827] w-full max-w-md p-8 rounded-[2rem] border border-gray-800 text-center shadow-2xl relative overflow-hidden group">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">COMISSÃO REALIZADA (PRODUÇÃO)</p>
                <h3 className="text-5xl font-black text-green-500 font-mono tracking-tighter">
                  {FORMAT_BRL(financeiroVendas.reduce((acc, v) => acc + Number(v.comissao_vendedor || 0), 0))}
                </h3>
                <div className="absolute inset-0 border-2 border-green-500/5 rounded-[2rem] pointer-events-none group-hover:border-green-500/20 transition-all duration-700"></div>
             </div>
           </div>

           <div id="financeiro-table" className="bg-[#111827] rounded-[2.5rem] border border-gray-800/50 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 tracking-widest border-b border-gray-800/50">
                  <tr>
                    <th className="px-10 py-8">DATA</th>
                    <th className="px-10 py-8">CLIENTE</th>
                    <th className="px-10 py-8">SEGURADORA</th>
                    {currentUserData.isAdmin && <th className="px-10 py-8">VENDEDOR</th>}
                    <th className="px-10 py-8">COMISSÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {financeiroVendas.length === 0 ? (
                    <tr><td colSpan={currentUserData.isAdmin ? 5 : 4} className="px-10 py-12 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Nenhuma comissão de produção registrada</td></tr>
                  ) : (
                    financeiroVendas.map((v, idx) => (
                      <tr key={v.id || `fin-${idx}`} className="hover:bg-white/5 transition-colors group">
                        <td className="px-10 py-6 text-gray-500 font-bold text-[11px]">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
                        <td className="px-10 py-6 text-white font-black text-[11px] uppercase tracking-tight">{v.cliente}</td>
                        <td className="px-10 py-6 text-gray-400 font-bold text-[10px] uppercase">{v.empresa || 'SUHAI SEGURADORA'}</td>
                        {currentUserData.isAdmin && <td className="px-10 py-6 text-blue-500 font-black text-[11px] uppercase">{v.vendedor}</td>}
                        <td className="px-10 py-6 text-green-500 font-black font-mono text-[11px]">{FORMAT_BRL(v.comissao_vendedor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* --- SETOR RH (CADASTRAR EMISSÃO / RELATÓRIOS) --- */}

      {/* FALTA PAGAR (AUDITORIA DE PRODUÇÃO PARA ADMIN/RH) */}
      {activeSection === 'falta-pagar' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-full px-10">
          <div className="flex justify-between items-center">
            <h2 className="text-[38px] font-black uppercase text-yellow-500 tracking-tighter">FALTA PAGAR (PRODUÇÃO)</h2>
            <button className="bg-[#10b981] text-white px-6 py-3 rounded-lg font-black uppercase text-[10px] shadow-lg hover:bg-emerald-500 transition-all">BAIXAR EM EXCEL</button>
          </div>
          
          <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800/50 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f1a]/50 text-[9px] font-black uppercase text-gray-600 border-b border-gray-800/50">
                <tr>
                  <th className="px-10 py-8">NOME CLIENTE</th>
                  <th className="px-10 py-8">TELEFONE</th>
                  <th className="px-10 py-8">SEGURADORA</th>
                  <th className="px-10 py-8">VENDEDOR</th>
                  <th className="px-10 py-8">COMISSÃO CHEIA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {vendas.filter(v => v.origem !== 'RH' && v.status === 'Falta Pagamento').map((v, idx) => (
                  <tr key={v.id || `falta-${idx}`} className="hover:bg-white/5 transition-colors group">
                    <td className="px-10 py-6 text-white font-black text-[11px] uppercase tracking-tight">{v.cliente}</td>
                    <td className="px-10 py-6 text-gray-500 font-bold text-[11px]">{v.tel}</td>
                    <td className="px-10 py-6 text-gray-500 font-bold text-[10px] uppercase">{v.empresa || 'SEGURADORA'}</td>
                    <td className="px-10 py-6 text-blue-500 font-black text-[11px] uppercase">{v.vendedor}</td>
                    <td className="px-10 py-6 text-white font-black font-mono text-[11px]">{FORMAT_BRL(v.comissao_cheia)}</td>
                  </tr>
                ))}
                {vendas.filter(v => v.origem !== 'RH' && v.status === 'Falta Pagamento').length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-10 py-12 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">Nenhum registro de produção aguardando pagamento</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'facebook-ads' && <FacebookAdsView leads={facebookLeads} />}

      {activeSection === 'cadastrar-emissao' && (
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] animate-in fade-in duration-500">
           <div className="bg-[#111827] w-full max-w-lg rounded-[2.5rem] p-10 border border-gray-800 shadow-2xl relative">
              <h2 className="text-[24px] font-black text-blue-400 uppercase text-center mb-10 tracking-[0.2em]">CADASTRAR EMISSÃO (RH)</h2>
              <div className="space-y-8">
                <div className="space-y-2"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">NOME CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-2xl text-white outline-none font-black uppercase text-xs focus:border-blue-500/30 transition-all shadow-inner" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-2"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">SEGURADORA</label><div className="relative"><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-2xl text-white outline-none font-black uppercase text-xs focus:border-blue-500/30 shadow-inner appearance-none cursor-pointer" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}><option value="">SELECIONE</option>{empresas.map((emp, idx) => <option key={emp.id || `emp-${idx}`} value={emp.nome}>{emp.nome.toUpperCase()}</option>)}</select><i className="fas fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-[10px]"></i></div></div>
                <div className="space-y-2"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">VENDEDOR RESPONSÁVEL</label><div className="relative"><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-2xl text-white outline-none font-black uppercase text-xs focus:border-blue-500/30 shadow-inner appearance-none cursor-pointer" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map((u, idx) => <option key={u.id || `vend-rh-${idx}`} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select><i className="fas fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-[10px]"></i></div></div>
                <div className="grid grid-cols-4 gap-4"><div className="space-y-1 text-center"><label className="text-[7px] font-black uppercase text-gray-600 tracking-widest">PRÊMIO</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-3 rounded-xl text-white outline-none text-center font-black text-[11px]" value={editingItem?.valor || 0} onChange={e => setEditingItem({...editingItem, valor: Number(e.target.value)})} /></div><div className="space-y-1 text-center"><label className="text-[7px] font-black uppercase text-yellow-500 tracking-widest">% VEND</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-3 rounded-xl text-yellow-500 outline-none text-center font-black text-[11px]" value={editingItem?.porcentagem_vendida || 0} onChange={e => setEditingItem({...editingItem, porcentagem_vendida: Number(e.target.value)})} /></div><div className="space-y-1 text-center"><label className="text-[7px] font-black uppercase text-gray-600 tracking-widest">C. CHEIA</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-3 rounded-xl text-white outline-none text-center font-black text-[11px]" value={editingItem?.comissao_cheia || 0} onChange={e => setEditingItem({...editingItem, comissao_cheia: Number(e.target.value)})} /></div><div className="space-y-1 text-center"><label className="text-[7px] font-black uppercase text-green-500 tracking-widest">C. VEND</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-3 rounded-xl text-green-500 outline-none text-center font-black text-[11px]" value={editingItem?.comissao_vendedor || 0} onChange={e => setEditingItem({...editingItem, comissao_vendedor: Number(e.target.value)})} /></div></div>
                <button onClick={async () => { if(!editingItem?.cliente || !editingItem?.vendedor) return alert('PREENCHA O CLIENTE E VENDEDOR'); await cloud.salvarVenda({...editingItem, status: 'Pagamento Efetuado', dataCriacao: Date.now(), origem: 'RH'}); alert("EMISSÃO FINALIZADA COM SUCESSO!"); setEditingItem({}); }} className="w-full bg-[#2563eb] p-5 rounded-[1rem] font-black uppercase text-white text-[11px] shadow-2xl hover:bg-blue-500 transition-all mt-4 tracking-widest">FINALIZAR EMISSÃO</button>
              </div>
           </div>
        </div>
      )}

      {activeSection === 'relatorio-vendas' && !selectedSellerRh && (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
          <h2 className="text-[32px] font-black text-blue-400 uppercase tracking-tighter">RELATÓRIO DE VENDAS (RH)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {usuarios.filter(u => u.setor === 'VENDEDOR').map((v, idx) => {
              const rhVendas = vendas.filter(vend => vend.vendedor === v.nome && vend.origem === 'RH');
              const comRh = rhVendas.reduce((acc, curr) => acc + Number(curr.comissao_vendedor || 0), 0);
              return (
                <button key={v.id || `rel-vend-${idx}`} onClick={() => setSelectedSellerRh(v.nome)} className="bg-[#111827] p-10 rounded-[2rem] border border-gray-800/30 text-left group hover:border-blue-500/30 transition-all shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-[22px] font-black text-white uppercase tracking-tight mb-8 group-hover:text-blue-400 transition-colors">{v.nome}</h3>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">LANÇAMENTOS RH: <span className="text-white ml-2 text-[10px]">{rhVendas.length}</span></p>
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">COMISSÃO ACUMULADA: <span className="text-green-500 ml-2 text-[10px] font-mono">{FORMAT_BRL(comRh)}</span></p>
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity"><i className="fas fa-file-invoice-dollar text-8xl text-white"></i></div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === 'relatorio-vendas' && selectedSellerRh && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <button onClick={() => setSelectedSellerRh(null)} className="flex items-center gap-3 text-white text-[24px] font-black uppercase tracking-tighter hover:text-blue-400 transition-all group">
              <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i> VENDAS RH: {selectedSellerRh}
            </button>
            <div className="flex flex-wrap gap-3">
              <button onClick={async () => { const u = usuarios.find(u => u.nome === selectedSellerRh); if(u) await cloud.salvarUsuario({...u, folhaLiberada: true}); alert('Folha Liberada!'); }} className="bg-green-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 hover:bg-green-500 transition shadow-lg"><i className="fas fa-lock-open"></i> LIBERAR FOLHA</button>
              <button onClick={async () => { const u = usuarios.find(u => u.nome === selectedSellerRh); if(u) await cloud.salvarUsuario({...u, folhaLiberada: false}); alert('Folha Bloqueada!'); }} className="bg-orange-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 hover:bg-orange-500 transition shadow-lg"><i className="fas fa-lock"></i> RETIRAR FOLHA</button>
              <button onClick={async () => { if(window.confirm('Apagar permanentemente todos os lançamentos RH deste vendedor?')) { const toDelete = vendas.filter(v => v.vendedor === selectedSellerRh && v.origem === 'RH'); await Promise.all(toDelete.map(v => cloud.apagar('vendas', v.id!))); alert('Ciclo limpo!'); } }} className="bg-red-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 hover:bg-red-500 transition shadow-lg"><i className="fas fa-trash"></i> LIMPAR TUDO</button>
              <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 hover:bg-blue-500 transition shadow-lg"><i className="fas fa-print"></i> IMPRIMIR LISTA</button>
            </div>
          </div>
          <div id="financeiro-table" className="bg-[#111827] rounded-[1.5rem] border border-gray-800/30 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0b0f1a]/80 text-[8px] font-black uppercase text-gray-500 border-b border-gray-800/50">
                <tr>
                  <th className="px-8 py-6 tracking-widest">DATA</th>
                  <th className="px-8 py-6 tracking-widest">CLIENTE</th>
                  <th className="px-8 py-6 tracking-widest">SEGURADORA</th>
                  <th className="px-8 py-6 tracking-widest">PRÊMIO</th>
                  <th className="px-8 py-6 tracking-widest">C. CHEIA</th>
                  <th className="px-8 py-6 tracking-widest">% VEND</th>
                  <th className="px-8 py-6 tracking-widest">COMISSÃO</th>
                  {currentUserData.isAdmin && <th className="px-8 py-6 tracking-widest text-center">AÇÕES</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {vendas.filter(v => v.vendedor === selectedSellerRh && v.origem === 'RH').map((v, idx) => (
                  <tr key={v.id || `vend-rh-det-${idx}`} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5 text-gray-500 font-bold text-[9px]">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-8 py-5 text-white font-black text-[10px] uppercase tracking-tight">{v.cliente}</td>
                    <td className="px-8 py-5 text-gray-500 font-bold text-[9px] uppercase">{v.empresa}</td>
                    <td className="px-8 py-5 text-white font-bold text-[10px] font-mono">{FORMAT_BRL(v.valor)}</td>
                    <td className="px-8 py-5 text-blue-400 font-black text-[10px] font-mono">{FORMAT_BRL(v.comissao_cheia)}</td>
                    <td className="px-8 py-5 text-orange-400 font-black text-[10px] font-mono">{v.porcentagem_vendida || 0}%</td>
                    <td className="px-8 py-5 text-green-500 font-black text-[10px] font-mono">{FORMAT_BRL(v.comissao_vendedor)}</td>
                    {currentUserData.isAdmin && (
                      <td className="px-8 py-5 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => { setEditingItem(v); setModalType('venda'); }} className="text-blue-400 hover:text-blue-300 transition-colors">
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                          <button onClick={() => { if(window.confirm('Excluir este lançamento de venda do relatório?')) cloud.apagar('vendas', v.id!) }} className="text-red-600 hover:text-red-500 transition-colors">
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center mt-12 pb-10">
            <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800/50 text-center min-w-[400px] shadow-2xl relative group overflow-hidden">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">VALOR TOTAL COMISSÃO REALIZADA</p>
               <h4 className="text-[72px] font-black text-green-500 tracking-tighter leading-none font-mono">
                 {FORMAT_BRL(vendas.filter(v => v.vendedor === selectedSellerRh && v.origem === 'RH').reduce((acc, curr) => acc + Number(curr.comissao_vendedor || 0), 0))}
               </h4>
               <div className="absolute inset-0 border-2 border-green-500/5 rounded-[2.5rem] pointer-events-none group-hover:border-green-500/20 transition-all duration-700"></div>
            </div>
          </div>
        </div>
      )}

      {/* OUTRAS SEÇÕES */}
      {activeSection === 'cadastrar-indicacao' && currentUserData.setor === 'ADMIN' && (
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] animate-in fade-in duration-500">
           <div className="bg-[#111827] w-full max-w-xl rounded-[2.5rem] p-12 border border-gray-800 shadow-2xl relative">
              <h2 className="text-[24px] font-black text-yellow-500 uppercase text-center mb-12 tracking-[0.2em]">DISTRIBUIR LEAD</h2>
              <div className="space-y-8">
                <div className="space-y-3"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none font-black uppercase text-sm focus:border-yellow-500/30 transition-all shadow-inner" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">WHATSAPP</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none text-sm font-bold shadow-inner" placeholder="(00) 00000-0000" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div>
                  <div className="space-y-3"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">VEÍCULO / MODELO</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none text-sm font-bold uppercase shadow-inner" placeholder="MOTO, CARRO, ETC" value={editingItem?.veiculo || ''} onChange={e => setEditingItem({...editingItem, veiculo: e.target.value.toUpperCase()})} /></div>
                </div>
                <div className="space-y-3"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">ATRIBUIR AO VENDEDOR</label><div className="relative"><select className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none font-black uppercase text-sm cursor-pointer shadow-inner appearance-none" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE UM VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map((u, idx) => <option key={u.id || `dist-lead-${idx}`} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select><i className="fas fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"></i></div></div>
                <div className="bg-[#0b0f1a] border border-gray-800 p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition" onClick={() => setEditingItem({...editingItem, suhai: !editingItem?.suhai})}><div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${editingItem?.suhai ? 'bg-green-500 border-green-500' : 'border-gray-700'}`}>{editingItem?.suhai && <i className="fas fa-check text-white text-[10px]"></i>}</div><span className="text-[8px] font-black uppercase text-green-500 tracking-widest">MARCAR COMO LEAD SUHAI</span></div>
                <div className="space-y-3"><label className="text-[8px] font-black uppercase text-gray-600 ml-4 tracking-widest">OBSERVAÇÕES ADICIONAIS</label><textarea className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none text-xs font-bold shadow-inner min-h-[120px]" placeholder="EX: CLIENTE INDICADO POR AMIGO..." value={editingItem?.info || ''} onChange={e => setEditingItem({...editingItem, info: e.target.value})}></textarea></div>
                <button onClick={async () => { if(!editingItem?.cliente || !editingItem?.vendedor) return alert('PREENCHA PELO MENOS NOME E VENDEDOR'); await cloud.salvarIndicacao({...editingItem, status: 'NOVA INDICAÇÃO', dataCriacao: Date.now()}); alert("LEAD DISTRIBUÍDO COM SUCESSO!"); setEditingItem({}); }} className="w-full bg-[#ffcc00] p-6 rounded-[1.2rem] font-black uppercase text-black text-[12px] shadow-2xl hover:bg-yellow-400 transition-all mt-6">CONFIRMAR ENVIO DO LEAD</button>
              </div>
           </div>
        </div>
      )}

      {activeSection === 'performance' && (
        <div className="space-y-16 animate-in fade-in duration-500 max-w-[1600px] mx-auto px-4 pb-20">
          <h2 className="text-[34px] font-black text-purple-500 uppercase tracking-tighter">PERFORMANCE TEAM</h2>
          <div className="bg-[#111827]/40 p-10 rounded-[2.5rem] border border-gray-800/30 shadow-2xl">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-10 flex items-center gap-2"><i className="fas fa-bookmark text-purple-500"></i> PRODUÇÃO GLOBAL POR SEGURADORA (MÊS)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {['ALLIANZ', 'BRADESCO', 'HDI', 'ITURAN', 'PORTO SEGURO', 'SUHAI SEGURADORA', 'TOKIO MARINE'].map(name => {
                const count = vendas.filter(v => (v.empresa || '').toUpperCase() === name && new Date(v.dataCriacao).getMonth() === new Date().getMonth()).length;
                return (
                  <div key={name} className="bg-[#0b0f1a] p-8 rounded-2xl border border-gray-800/40 flex flex-col items-center justify-center text-center group hover:border-purple-500/20 transition-all"><p className="text-[7px] font-black text-gray-600 uppercase tracking-widest mb-3">{name}</p><h4 className="text-[42px] font-black text-white leading-none">{count}</h4><p className="text-[7px] font-black text-purple-500 uppercase tracking-[0.2em] mt-2">APÓLICES</p></div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {usuarios.filter(u => u.setor === 'VENDEDOR').map((v, idx) => {
              const uVendas = vendas.filter(vend => vend.vendedor === v.nome && new Date(vend.dataCriacao).getMonth() === new Date().getMonth());
              const tPremio = uVendas.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
              const tComissao = uVendas.reduce((acc, curr) => acc + Number(curr.comissao_vendedor || 0), 0);
              return (
                <div key={v.id || `perf-${idx}`} className="bg-[#111827] rounded-[2.5rem] p-10 border border-gray-800/30 shadow-2xl relative flex flex-col items-center text-center">
                   <h3 className="text-[32px] font-black text-white uppercase tracking-tight mb-12">{v.nome}</h3>
                   <div className="bg-[#0b0f1a] w-full p-8 rounded-[2rem] border border-gray-800/50 mb-12 flex flex-col items-center shadow-inner"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">PRODUÇÃO REAL (MÊS)</p><h4 className="text-[100px] font-black text-purple-500 leading-none font-mono">{uVendas.length}</h4></div>
                   <div className="w-full space-y-4 text-left"><p className="text-[9px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800/50 pb-2 mb-4">PRÊMIO E COMISSÃO</p><div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-500 uppercase">TOTAL PRÊMIO</span><span className="text-[12px] font-black text-white font-mono">{FORMAT_BRL(tPremio)}</span></div><div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-500 uppercase">TOTAL COMISSÃO</span><span className="text-[12px] font-black text-green-500 font-mono">{FORMAT_BRL(tComissao)}</span></div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === 'configuracoes' && currentUserData.setor === 'ADMIN' && (
        <div className="space-y-10 max-w-[1200px] mx-auto animate-in fade-in duration-500 px-4">
           <div className="flex justify-between items-center"><h2 className="text-[34px] font-black text-gray-400 uppercase tracking-tighter">CONFIGURAÇÕES</h2><button onClick={() => { setEditingItem({}); setModalType('empresa'); }} className="bg-gray-700 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-gray-600 transition-all">NOVA SEGURADORA</button></div>
           <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800/50 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-gray-800/50"><h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">GERENCIAR SEGURADORAS</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-8">
                 {empresas.map((emp, idx) => (
                   <div key={emp.id || `emp-config-${idx}`} className="bg-[#0b0f1a] p-6 rounded-2xl border border-gray-800/50 flex justify-between items-center group"><span className="font-black text-white uppercase text-sm tracking-tight">{emp.nome}</span><button onClick={() => cloud.apagar('empresas', emp.id!)} className="text-red-900 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"><i className="fas fa-trash-alt"></i></button></div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeSection === 'vendedores' && currentUserData.setor === 'ADMIN' && (
        <div className="space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500 px-4">
           <div className="flex justify-between items-center"><h2 className="text-[34px] font-black text-red-500 tracking-tighter uppercase">GESTÃO DE EQUIPE</h2><button onClick={() => { setEditingItem({ setor: 'VENDEDOR', comissao: 0 }); setModalType('usuario'); }} className="bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-all">CADASTRAR NOVO USUÁRIO</button></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
             {usuarios.map((u, idx) => (
               <div key={u.id || `user-card-${idx}`} className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 relative group shadow-2xl transition-all hover:border-red-900/30">
                  <div className="absolute top-8 right-8 flex gap-4 opacity-30 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingItem(u); setModalType('usuario'); }} className="text-gray-400 hover:text-white transition"><i className="fas fa-edit text-sm"></i></button><button onClick={() => { if(window.confirm('Deseja excluir permanentemente este usuário?')) cloud.apagar('usuarios', u.id!); }} className="text-red-900 hover:text-red-500 transition"><i className="fas fa-trash text-sm"></i></button></div>
                  <div className="flex flex-col items-center text-center"><div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mb-6"><i className="fas fa-user-tie text-2xl text-red-500"></i></div><h4 className="text-[18px] font-black text-white uppercase tracking-tight">{u.nome}</h4><span className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1 px-3 py-1 bg-red-900/10 rounded-full">{u.setor}</span></div>
                  <div className="mt-8 pt-6 border-t border-gray-800/50 space-y-3"><div className="flex justify-between items-center"><span className="text-[9px] font-bold text-gray-500 uppercase">LOGIN:</span><span className="text-[10px] font-black text-white">{u.login}</span></div><div className="flex justify-between items-center"><span className="text-[9px] font-bold text-gray-500 uppercase">COMISSÃO:</span><span className="text-[10px] font-black text-green-500 font-mono">{u.comissao}%</span></div></div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeSection === 'metas' && currentUserData.setor === 'ADMIN' && (
        <div className="space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500 px-4">
           <div className="flex justify-between items-center"><h2 className="text-[34px] font-black text-blue-500 uppercase tracking-tighter">DEFINIÇÃO DE METAS</h2><button onClick={() => { setEditingItem({ meta_qtd: 0, meta_premio: 0, meta_salario: 0 }); setModalType('meta'); }} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-all">NOVA META</button></div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {metas.map((m, idx) => {
                const isCompany = m.vendedor === 'EMPRESA_VM_SEGUROS';
                return (
                  <div key={m.id || `meta-${idx}`} className={`bg-[#111827] p-10 rounded-[2.5rem] border shadow-2xl relative overflow-hidden group transition-all ${isCompany ? 'border-purple-900/30' : 'border-blue-900/20'}`}>
                    <div className="absolute top-10 right-10 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingItem(m); setModalType('meta'); }} className="text-gray-400 hover:text-white transition"><i className="fas fa-edit text-sm"></i></button>{!isCompany && <button onClick={() => cloud.apagar('metas', m.id!)} className="text-red-900 hover:text-red-500 transition"><i className="fas fa-trash text-sm"></i></button>}</div>
                    <h4 className={`text-2xl font-black uppercase mb-10 tracking-tight ${isCompany ? 'text-purple-400' : 'text-blue-400'}`}>{isCompany ? '🚀 META GLOBAL EMPRESA' : `👤 VENDEDOR: ${m.vendedor}`}</h4>
                    <div className="grid grid-cols-3 gap-10">
                      <div className="bg-[#0b0f1a]/50 p-6 rounded-[2rem] border border-gray-800/50 text-center"><p className="text-[9px] font-black text-gray-500 uppercase mb-3">QTD VENDAS</p><p className="text-4xl font-black text-white">{m.meta_qtd}</p></div>
                      <div className="bg-[#0b0f1a]/50 p-6 rounded-[2rem] border border-gray-800/50 text-center"><p className="text-[9px] font-black text-gray-500 uppercase mb-3">PRÊMIO BRUTO</p><p className="text-2xl font-black text-white font-mono tracking-tighter">{FORMAT_BRL(m.meta_premio)}</p></div>
                      <div className="bg-[#0b0f1a]/50 p-6 rounded-[2rem] border border-gray-800/50 text-center"><p className="text-[9px] font-black text-gray-500 uppercase mb-3">SALÁRIO BRUTO</p><p className="text-2xl font-black text-green-500 font-mono tracking-tighter">{FORMAT_BRL(m.meta_salario)}</p></div>
                    </div>
                  </div>
                );
             })}
           </div>
        </div>
      )}

      {/* MODAL SYSTEM */}
      {modalType && (
        <ModalWrapper 
          title={modalType === 'venda' ? 'GERENCIAR VENDA' : modalType === 'indicacao' ? 'EDITAR LEAD' : modalType === 'cancelamento' ? 'GERENCIAR CANCELAMENTO' : `GERENCIAR ${modalType.toUpperCase()}`} 
          onClose={() => { setModalType(null); setEditingItem(null); }} 
          isYellow={modalType === 'indicacao'}
          onSave={async () => { 
            if(modalType === 'venda') {
                const { leadIdToDelete, ...itemToSave } = editingItem;
                if (leadIdToDelete) { delete (itemToSave as any).id; }
                await cloud.salvarVenda(itemToSave);
                if (leadIdToDelete) await cloud.apagar('indicacoes', leadIdToDelete);
            } else if(modalType === 'indicacao') { await cloud.salvarIndicacao(editingItem);
            } else if(modalType === 'usuario') { 
              if(!editingItem.nome || !editingItem.login) return alert('Preencha os campos obrigatórios');
              await cloud.salvarUsuario(editingItem);
            } else if(modalType === 'cancelamento') { 
              if(!editingItem.cliente || !editingItem.vendedor) return alert('Preencha nome e vendedor');
              await cloud.salvarCancelamento(editingItem);
            } else if(modalType === 'meta') { 
              if(!editingItem.vendedor) return alert('Selecione um vendedor ou EMPRESA');
              await cloud.salvarMeta(editingItem);
            } else if(modalType === 'empresa') { 
              if(!editingItem.nome) return alert('Preencha o nome da seguradora');
              await cloud.salvarEmpresa(editingItem);
            }
            setModalType(null); setEditingItem(null);
          }}>
          <div className="space-y-6">
            {modalType === 'indicacao' && (
              <div className="space-y-6">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-black uppercase shadow-inner" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">TELEFONE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-bold shadow-inner" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div><div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">VEÍCULO</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-bold uppercase shadow-inner" value={editingItem?.veiculo || ''} onChange={e => setEditingItem({...editingItem, veiculo: e.target.value.toUpperCase()})} /></div></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">VENDEDOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs uppercase font-black shadow-inner" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map((u, idx) => <option key={u.id || `modal-ind-vend-${idx}`} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">OBSERVAÇÕES</label><textarea className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-bold shadow-inner min-h-[100px]" value={editingItem?.info || ''} onChange={e => setEditingItem({...editingItem, info: e.target.value})}></textarea></div>
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setEditingItem({...editingItem, suhai: !editingItem?.suhai})}><div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${editingItem?.suhai ? 'bg-green-500 border-green-500' : 'border-gray-700'}`}>{editingItem?.suhai && <i className="fas fa-check text-white text-[10px]"></i>}</div><span className="text-[9px] font-black uppercase text-green-500 tracking-widest">MARCAR COMO LEAD SUHAI</span></div>
              </div>
            )}
            {modalType === 'venda' && (
              <div className="space-y-6">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-black uppercase focus:border-blue-500/30 transition-all shadow-inner" placeholder="NOME COMPLETO" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">TELEFONE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-bold shadow-inner" placeholder="(00) 00000-0000" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div><div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">SEGURADORA</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs uppercase font-black shadow-inner" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}><option value="">SELECIONE</option>{empresas.map((emp, idx) => <option key={emp.id || `modal-venda-emp-${idx}`} value={emp.nome}>{emp.nome.toUpperCase()}</option>)}</select></div></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">VENDEDOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs uppercase font-black shadow-inner" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE VENDEDOR</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map((u, idx) => <option key={u.id || `modal-venda-vend-${idx}`} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">PRÊMIO LÍQUIDO</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-black font-mono shadow-inner" value={editingItem?.valor || 0} onChange={e => setEditingItem({...editingItem, valor: Number(e.target.value)})} /></div><div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">COMISSÃO CHEIA</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-black font-mono shadow-inner" value={editingItem?.comissao_cheia || 0} onChange={e => setEditingItem({...editingItem, comissao_cheia: Number(e.target.value)})} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-black uppercase text-green-500 ml-2 tracking-widest">SUA COMISSÃO</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-green-500 outline-none text-xs font-black font-mono shadow-inner" value={editingItem?.comissao_vendedor || 0} onChange={e => setEditingItem({...editingItem, comissao_vendedor: Number(e.target.value)})} /></div><div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">STATUS</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs uppercase font-black shadow-inner" value={editingItem?.status || 'Fazer Vistoria'} onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}>{VENDA_STATUS_MAP.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}</select></div></div>
              </div>
            )}
            {modalType === 'empresa' && (
              <div className="space-y-6">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">NOME DA SEGURADORA</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-black uppercase shadow-inner" value={editingItem?.nome || ''} onChange={e => setEditingItem({...editingItem, nome: e.target.value.toUpperCase()})} /></div>
              </div>
            )}
            {modalType === 'cancelamento' && (
              <div className="space-y-6">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs font-black uppercase shadow-inner" placeholder="NOME DO CLIENTE" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">VENDEDOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs uppercase font-black shadow-inner" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}><option value="">SELECIONE</option>{usuarios.filter(u => u.setor === 'VENDEDOR').map((u, idx) => <option key={u.id || `modal-canc-vend-${idx}`} value={u.nome}>{u.nome.toUpperCase()}</option>)}</select></div>
                   <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-500 ml-2 tracking-widest">SEGURADORA</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-white outline-none text-xs uppercase font-black shadow-inner" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}><option value="">SELECIONE</option>{empresas.map((emp, idx) => <option key={emp.id || `modal-canc-emp-${idx}`} value={emp.nome}>{emp.nome.toUpperCase()}</option>)}</select></div>
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-red-500 ml-2 tracking-widest">VALOR DO ESTORNO</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-5 rounded-xl text-red-500 outline-none text-xs font-black font-mono shadow-inner" value={editingItem?.valor_comissao || 0} onChange={e => setEditingItem({...editingItem, valor_comissao: Number(e.target.value)})} /></div>
              </div>
            )}
          </div>
        </ModalWrapper>
      )}

      {aiAssistantLead && (
        <AiAssistant lead={aiAssistantLead} onClose={() => setAiAssistantLead(null)} />
      )}
    </Layout>
  );
};

export default App;