
import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, User, Venda, Indicacao, Meta, Empresa } from './types';
import { cloud } from './services/firebase';
import { FORMAT_BRL, INDICACAO_STATUS_MAP, VENDA_STATUS_MAP } from './constants';
import Layout from './components/Layout';

// --- COMPONENTES DE APOIO ---

const ModalWrapper: React.FC<{ 
  title: string; 
  onClose: () => void; 
  onSave: () => void; 
  children: React.ReactNode;
}> = ({ title, onClose, onSave, children }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="bg-[#111827] w-full max-w-2xl rounded-[3rem] border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
      <div className="p-10 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-xl font-black uppercase text-white tracking-tighter">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition"><i className="fas fa-times text-xl"></i></button>
      </div>
      <div className="p-10 overflow-y-auto scrollbar-thin max-h-[60vh]">
        {children}
      </div>
      <div className="p-10 border-t border-gray-800 flex gap-4">
        <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white p-5 rounded-2xl font-black uppercase text-[10px] transition-all">Cancelar</button>
        <button onClick={onSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-900/20 transition-all">Salvar</button>
      </div>
    </div>
  </div>
);

const DashboardView: React.FC<{ 
  vendas: Venda[], 
  indicacoes: Indicacao[], 
  metas: Meta[], 
  user: AuthUser | null 
}> = ({ vendas, indicacoes, metas, user }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const uNome = (user?.nome || '').trim().toUpperCase();
    
    const baseVendas = user?.isAdmin 
      ? vendas 
      : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
    
    const hojeVendas = baseVendas.filter(v => v.dataCriacao >= startOfDay.getTime());
    const mesVendasTotal = baseVendas.filter(v => v.dataCriacao >= startOfMonth);
    const mesVendasPagas = mesVendasTotal.filter(v => v.status === 'Pagamento Efetuado');
    
    const vendasHojeCount = hojeVendas.length;
    const premioHojeTotal = hojeVendas.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const vendasMesTotalCount = mesVendasTotal.length;
    const premioMesPagoTotal = mesVendasPagas.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    
    const statusValidosPerformance = ['Mandar Boletos', 'Falta Pagamento', 'Pagamento Efetuado'];
    const mesVendasPerformance = mesVendasTotal.filter(v => statusValidosPerformance.includes(v.status));
    
    const vendasProducaoMesCount = mesVendasPerformance.length;
    const premioProducaoMesTotal = mesVendasPerformance.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const comissaoProducaoMesTotal = mesVendasPerformance.reduce((acc, v) => 
      acc + Number(user?.isAdmin ? (v.comissao_cheia || 0) : (v.comissao_vendedor || 0)), 0
    );

    const companyMeta = metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS') || { meta_qtd: 1, meta_premio: 1, meta_salario: 1 };
    const userMeta = metas.find(m => m.vendedor.toUpperCase() === uNome) || { meta_qtd: 1, meta_premio: 1, meta_salario: 1 };

    const funilVendas = VENDA_STATUS_MAP.map(status => {
      const count = mesVendasTotal.filter(v => v.status === status).length;
      const total = mesVendasTotal.length || 1;
      return { status, count, pct: Math.round((count / total) * 100) };
    });

    const filteredLeads = indicacoes.filter(i => (user?.isAdmin ? true : (i.vendedor || '').trim().toUpperCase() === uNome));
    const funilLeads = INDICACAO_STATUS_MAP.map(status => {
      const count = filteredLeads.filter(i => i.status === status).length;
      const total = filteredLeads.length || 1;
      return { status, count, pct: Math.round((count / total) * 100) };
    });

    return { 
      vendasHojeCount, premioHojeTotal, vendasMesTotalCount, premioMesPagoTotal, 
      vendasProducaoMesCount, premioProducaoMesTotal, comissaoProducaoMesTotal,
      companyMeta, userMeta, funilVendas, funilLeads
    };
  }, [vendas, indicacoes, metas, user]);

  const metaRef = user?.isAdmin ? stats.companyMeta : stats.userMeta;
  const salesPct = Math.min(Math.round((stats.vendasProducaoMesCount / (metaRef.meta_qtd || 1)) * 100), 100);
  const premioPct = Math.min(Math.round((stats.premioProducaoMesTotal / (metaRef.meta_premio || 1)) * 100), 100);
  const comissaoPct = Math.min(Math.round((stats.comissaoProducaoMesTotal / (metaRef.meta_salario || 1)) * 100), 100);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Você só vence amanhã se não desistir hoje!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 border-l-4 border-l-blue-500 shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">Vendas (Hoje)</p>
          <h3 className="text-6xl font-black text-white">{stats.vendasHojeCount}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">Lançamentos do dia</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 border-l-4 border-l-green-500 shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">Prêmio Líquido (Hoje)</p>
          <h3 className="text-4xl font-black text-green-500 font-mono">{FORMAT_BRL(stats.premioHojeTotal)}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">Total produzido hoje</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 border-l-4 border-l-yellow-600 shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">Vendas (No Mês)</p>
          <h3 className="text-6xl font-black text-white">{stats.vendasMesTotalCount}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">Total acumulado mês</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 border-l-4 border-l-white shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">Prêmio Líquido (No Mês)</p>
          <h3 className="text-4xl font-black text-white font-mono">{FORMAT_BRL(stats.premioMesPagoTotal)}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">Apenas pagamentos confirmados</p>
        </div>
      </div>

      <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black uppercase text-white flex items-center gap-3">
            <i className="fas fa-chart-line text-purple-500"></i> {user?.isAdmin ? 'PERFORMANCE CONSOLIDADA (VM SEGUROS)' : 'SUA META INDIVIDUAL'}
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-center">
          <div className="space-y-3">
            <p className="text-[9px] font-black text-gray-500 uppercase">{user?.isAdmin ? 'VENDAS TOTAIS EMPRESA' : 'MINHAS VENDAS TOTAIS'}</p>
            <h4 className="text-2xl font-black text-white">{stats.vendasProducaoMesCount} <span className="text-gray-600">/ {metaRef.meta_qtd}</span></h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${salesPct}%` }}></div></div>
            <p className="text-right text-[10px] font-black text-purple-500">{salesPct}%</p>
          </div>
          <div className="space-y-3">
            <p className="text-[9px] font-black text-gray-500 uppercase">PRÊMIO BRUTO ACUMULADO</p>
            <h4 className="text-2xl font-black text-white">{FORMAT_BRL(stats.premioProducaoMesTotal)}</h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${premioPct}%` }}></div></div>
            <div className="flex justify-between"><span className="text-[8px] font-black text-gray-600 uppercase">META: {FORMAT_BRL(metaRef.meta_premio)}</span><span className="text-[10px] font-black text-green-500">{premioPct}%</span></div>
          </div>
          <div className="space-y-3">
            <p className="text-[9px] font-black text-gray-500 uppercase">{user?.isAdmin ? 'COMISSÃO BRUTA EMPRESA' : 'MINHA COMISSÃO BRUTA'}</p>
            <h4 className="text-2xl font-black text-white">{FORMAT_BRL(stats.comissaoProducaoMesTotal)}</h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-yellow-500 h-full transition-all duration-1000" style={{ width: `${comissaoPct}%` }}></div></div>
            <div className="flex justify-between"><span className="text-[8px] font-black text-gray-600 uppercase">META: {FORMAT_BRL(metaRef.meta_salario)}</span><span className="text-[10px] font-black text-yellow-500">{comissaoPct}%</span></div>
          </div>
          <div className="flex justify-end pr-6 opacity-20"><i className="fas fa-building text-gray-400 text-7xl"></i></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase mb-8 flex items-center gap-3"><i className="fas fa-chart-bar text-blue-500"></i> Funil de Produção</h3>
          <div className="space-y-6">
            {stats.funilVendas.map(f => (
              <div key={f.status} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-gray-500">{f.status}</span><span className="text-white">{f.count} ({f.pct}%)</span></div>
                <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${f.pct}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-xl">
          <h3 className="text-sm font-black text-white uppercase mb-8 flex items-center gap-3"><i className="fas fa-bolt text-yellow-500"></i> Status dos Leads</h3>
          <div className="space-y-6">
            {stats.funilLeads.map(f => (
              <div key={f.status} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-gray-500">{f.status}</span><span className="text-white">{f.count} ({f.pct}%)</span></div>
                <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-yellow-500 h-full transition-all duration-700" style={{ width: `${f.pct}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FinanceiroView: React.FC<{ vendas: Venda[], user: AuthUser | null }> = ({ vendas, user }) => {
  const stats = useMemo(() => {
    const uNome = (user?.nome || '').trim().toUpperCase();
    const filtered = user?.isAdmin 
      ? vendas.filter(v => v.status === 'Pagamento Efetuado')
      : vendas.filter(v => v.status === 'Pagamento Efetuado' && (v.vendedor || '').trim().toUpperCase() === uNome);
    
    const totalComissao = filtered.reduce((acc, v) => acc + (user?.isAdmin ? Number(v.comissao_cheia || 0) : Number(v.comissao_vendedor || 0)), 0);
    const totalPremio = filtered.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    return { filtered, totalComissao, totalPremio };
  }, [vendas, user]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <h2 className="text-4xl font-black uppercase text-green-500 tracking-tighter">FINANCEIRO</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-green-500 shadow-2xl flex flex-col items-center justify-center space-y-3"><p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">COMISSÃO ACUMULADA (PAGOS)</p><h1 className="text-6xl font-black text-green-500 font-mono">{FORMAT_BRL(stats.totalComissao)}</h1></div>
        <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-blue-500 shadow-2xl flex flex-col items-center justify-center space-y-3"><p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">PRÊMIO TOTAL PRODUZIDO</p><h1 className="text-6xl font-black text-blue-500 font-mono">{FORMAT_BRL(stats.totalPremio)}</h1></div>
      </div>
      <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
            <tr><th className="px-10 py-8 border-b border-gray-800/50">Vendedor</th><th className="px-10 py-8 border-b border-gray-800/50">Cliente</th><th className="px-10 py-8 border-b border-gray-800/50">Prêmio</th><th className="px-10 py-8 border-b border-gray-800/50">Comissão</th><th className="px-10 py-8 border-b border-gray-800/50 text-center">Data</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {stats.filtered.map(v => (
              <tr key={v.id} className="text-sm text-white hover:bg-white/5 transition-all">
                <td className="px-10 py-6 font-bold text-blue-400 uppercase text-[11px]">{v.vendedor}</td>
                <td className="px-10 py-6 font-black uppercase tracking-tight">{v.cliente}</td>
                <td className="px-10 py-6 font-bold text-gray-400">{FORMAT_BRL(v.valor)}</td>
                <td className="px-10 py-6 font-black text-green-500">{FORMAT_BRL(user?.isAdmin ? v.comissao_cheia : v.comissao_vendedor)}</td>
                <td className="px-10 py-6 text-center text-[10px] text-gray-500 font-bold">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PerformanceView: React.FC<{
  vendas: Venda[],
  usuarios: User[]
}> = ({ vendas, usuarios }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const mesVendas = vendas.filter(v => v.dataCriacao >= startOfMonth);
    const normalize = (n: string) => (n || '').trim().toUpperCase();

    const globalPorEmpresa: Record<string, number> = {};
    mesVendas.forEach(v => {
      let emp = normalize(v.empresa || 'SUHAI SEGURADORA');
      if (emp.includes('SUHAI')) emp = 'SUHAI SEGURADORA';
      globalPorEmpresa[emp] = (globalPorEmpresa[emp] || 0) + 1;
    });

    const vendedorasBase = ['ANA BEATRIZ', 'IGOR VICENTE', 'LUANA VIERA', 'ELEN JACONIS', 'ELEN', 'GRAZIELE MEDEIROS', 'RODRIGO MARIANO', 'JESSICA REGIS'];
    const todosVendedores = Array.from(new Set([
      ...usuarios.filter(u => u.setor === 'VENDEDOR').map(u => normalize(u.nome)),
      ...vendas.map(v => normalize(v.vendedor)),
      ...vendedorasBase.map(n => normalize(n))
    ])).filter(Boolean);

    const performanceVendedores = todosVendedores.map(nome => {
      const vVendedor = mesVendas.filter(v => {
        const vNome = normalize(v.vendedor);
        return vNome === nome || (nome === 'ELEN' && vNome.startsWith('ELEN'));
      });
      const quebraEmpresa: Record<string, number> = {};
      vVendedor.forEach(v => {
        let emp = normalize(v.empresa || 'SUHAI SEGURADORA');
        if (emp.includes('SUHAI')) emp = 'SUHAI SEGURADORA';
        quebraEmpresa[emp] = (quebraEmpresa[emp] || 0) + 1;
      });
      return {
        nome, total: vVendedor.length,
        quebra: Object.entries(quebraEmpresa).map(([label, val]) => ({ label, val })),
        cProduzida: vVendedor.reduce((acc, v) => acc + Number(v.comissao_vendedor || 0), 0),
        premioProduzido: vVendedor.reduce((acc, v) => acc + Number(v.valor || 0), 0)
      };
    }).filter(v => v.total > 0 || vendedorasBase.some(base => normalize(base) === v.nome));

    return { vendedores: performanceVendedores, globalPorEmpresa: Object.entries(globalPorEmpresa) };
  }, [vendas, usuarios]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <h2 className="text-4xl font-black uppercase text-purple-500 tracking-tighter">PERFORMANCE TEAM</h2>
      <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-2xl">
         <h3 className="text-sm font-black text-white uppercase mb-8 flex items-center gap-3"><i className="fas fa-building text-purple-500"></i> PRODUÇÃO GLOBAL POR SEGURADORA (MÊS)</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.globalPorEmpresa.map(([emp, count]) => (
              <div key={emp} className="bg-[#0b0f1a] p-6 rounded-[2rem] border border-gray-800/50 text-center hover:border-purple-500/50 transition-all">
                 <p className="text-[8px] font-black text-gray-500 uppercase mb-2">{emp}</p>
                 <h4 className="text-3xl font-black text-white">{count}</h4>
                 <p className="text-[7px] font-black text-purple-400 uppercase mt-1">APÓLICES EM PRODUÇÃO</p>
              </div>
            ))}
         </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {stats.vendedores.map(v => (
          <div key={v.nome} className="bg-[#111827] rounded-[3.5rem] p-10 border border-gray-800 shadow-2xl relative group overflow-hidden border-t-8 border-t-purple-600/50">
             <button 
                onClick={() => {
                  const userRecord = usuarios.find(u => u.nome.toUpperCase() === v.nome.toUpperCase());
                  if (userRecord && window.confirm(`Deseja realmente excluir o vendedor ${v.nome}?`)) {
                    cloud.apagar('usuarios', userRecord.id!);
                  } else if (!userRecord) {
                    alert("Aviso: Este registro não é um usuário editável (provavelmente histórico de vendas).");
                  }
                }} 
                className="absolute top-8 left-8 text-red-500/30 hover:text-red-500 transition-all z-10"
             >
                <i className="fas fa-trash-alt text-xs"></i>
             </button>
             <div className="text-center mb-10">
               <h3 className="text-xl font-black uppercase text-white tracking-tighter mb-8">{v.nome}</h3>
               <div className="bg-[#0b0f1a] p-10 rounded-[2.5rem] border border-gray-800/50 mb-8"><p className="text-[8px] font-black text-gray-500 uppercase mb-2">PRODUÇÃO REAL (MÊS)</p><h4 className="text-6xl font-black text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">{v.total}</h4></div>
               <div className="space-y-4 text-left">
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800 pb-2">QUEBRA POR EMPRESA</p>
                  <div className="grid grid-cols-1 gap-2">
                    {v.quebra.map(q => (
                      <div key={q.label} className="flex justify-between items-center bg-[#0b0f1a]/30 px-4 py-2 rounded-xl border border-gray-800/30"><span className="text-[9px] font-black text-gray-400 uppercase">{q.label}</span><span className="text-[10px] font-black text-white">{q.val}</span></div>
                    ))}
                  </div>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0b0f1a] p-5 rounded-3xl border border-gray-800/50 text-center"><p className="text-[7px] font-black text-green-500 uppercase mb-1">C. PRODUZIDA</p><p className="text-[11px] font-black text-white">{FORMAT_BRL(v.cProduzida)}</p></div>
                <div className="bg-[#0b0f1a] p-5 rounded-3xl border border-gray-800/50 text-center"><p className="text-[7px] font-black text-blue-500 uppercase mb-1">PRÊMIO PRODUZIDO</p><p className="text-[11px] font-black text-white">{FORMAT_BRL(v.premioProduzido)}</p></div>
             </div>
          </div>
        ))}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('TODOS');
  const [dateFilter, setDateFilter] = useState('');

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const [selectedVendas, setSelectedVendas] = useState<string[]>([]);
  const [modalType, setModalType] = useState<'venda' | 'indicacao' | 'usuario' | 'empresa' | 'meta' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [distribuirForm, setDistribuirForm] = useState<Partial<Indicacao>>({
    status: 'NOVA INDICAÇÃO', suhai: false, info: '', cliente: '', tel: '', veiculo: '', vendedor: ''
  });

  useEffect(() => {
    const unsubVendas = cloud.subscribeVendas(setVendas);
    const unsubUsers = cloud.subscribeUsuarios(setUsuarios);
    const unsubMetas = cloud.subscribeMetas(setMetas);
    const unsubIndicacoes = cloud.subscribeIndicacoes(setIndicacoes);
    const unsubEmpresas = cloud.subscribeEmpresas(setEmpresas);
    return () => { unsubVendas(); unsubUsers(); unsubMetas(); unsubIndicacoes(); unsubEmpresas(); };
  }, []);

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
    if (nextIdx >= 0 && nextIdx < VENDA_STATUS_MAP.length) await cloud.updateStatus('vendas', v.id!, VENDA_STATUS_MAP[nextIdx]);
  };

  const moveIndicacao = async (i: Indicacao, dir: 'left' | 'right') => {
    const idx = INDICACAO_STATUS_MAP.indexOf(i.status);
    const nextIdx = dir === 'left' ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < INDICACAO_STATUS_MAP.length) await cloud.updateStatus('indicacoes', i.id!, INDICACAO_STATUS_MAP[nextIdx]);
  };

  const filteredVendas = useMemo(() => {
    let list = user?.isAdmin ? vendas : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === (user?.nome || '').trim().toUpperCase());
    if (user?.isAdmin && salesmanFilter !== 'TODOS') list = list.filter(v => (v.vendedor || '').trim().toUpperCase() === salesmanFilter.trim().toUpperCase());
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      list = list.filter(v => (v.cliente || '').toLowerCase().includes(low) || (v.vendedor || '').toLowerCase().includes(low));
    }
    return list;
  }, [vendas, user, searchTerm, salesmanFilter]);

  const filteredIndicacoes = useMemo(() => {
    let list = user?.isAdmin ? indicacoes : indicacoes.filter(i => (i.vendedor || '').trim().toUpperCase() === (user?.nome || '').trim().toUpperCase());
    if (user?.isAdmin && salesmanFilter !== 'TODOS') list = list.filter(i => (i.vendedor || '').trim().toUpperCase() === salesmanFilter.trim().toUpperCase());
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      list = list.filter(i => (i.cliente || '').toLowerCase().includes(low) || (i.vendedor || '').toLowerCase().includes(low));
    }
    if (dateFilter) {
      list = list.filter(i => {
        const d = new Date(i.dataCriacao);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === dateFilter;
      });
    }
    return list;
  }, [indicacoes, user, searchTerm, salesmanFilter, dateFilter]);

  const salesSuhai = vendas.filter(v => v.status === 'Pagamento Efetuado' && v.suhai);
  const totalSuhaiComm = salesSuhai.reduce((acc, v) => acc + (user?.isAdmin ? Number(v.comissao_cheia || 0) : Number(v.comissao_vendedor || 0)), 0);
  const totalSuhaiPrem = salesSuhai.reduce((acc, v) => acc + Number(v.valor || 0), 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4">
        <div className="bg-[#111827] w-full max-w-sm p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-6 animate-in zoom-in duration-500">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black uppercase text-white tracking-tighter">VM SEGUROS</h1>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Painel Administrativo</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-600 uppercase px-1">Login</label>
              <input 
                className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-2xl text-white text-xs outline-none focus:border-blue-500 transition-all" 
                value={loginForm.username} 
                onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-600 uppercase px-1">Senha</label>
              <input 
                type="password" 
                className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-2xl text-white text-xs outline-none focus:border-blue-500 transition-all" 
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
              />
            </div>
          </div>
          <button 
            onClick={handleLogin} 
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-900/10 active:scale-95 transition-all"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user!} onLogout={() => { setIsAuthenticated(false); setUser(null); }} activeSection={activeSection} setActiveSection={setActiveSection}>
      {activeSection === 'dashboard' && <DashboardView vendas={vendas} indicacoes={indicacoes} metas={metas} user={user} />}
      
      {activeSection === 'kanban-vendas' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center"><div><h2 className="text-4xl font-black uppercase text-[#3b82f6] tracking-tighter">PRODUÇÃO</h2></div><div className="flex gap-4">{selectedVendas.length > 0 && <button onClick={async () => { if(window.confirm('Excluir selecionados?')) { for(const id of selectedVendas) await cloud.apagar('vendas', id); setSelectedVendas([]); } }} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px]">Excluir ({selectedVendas.length})</button>}<button onClick={() => { setEditingItem({ status: 'Fazer Vistoria', suhai: false, dataCriacao: Date.now(), vendedor: user?.isAdmin ? '' : user?.nome.toUpperCase() }); setModalType('venda'); }} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg hover:scale-105 transition-all">Lançar Venda</button></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"><input type="text" placeholder="PESQUISAR PRODUÇÃO..." className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-blue-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><select className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 outline-none focus:border-blue-500 transition-all" value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}><option value="TODOS">TODOS VENDEDORES</option>{Array.from(new Set([...usuarios.map(u => u.nome.toUpperCase()), 'ELEN JACONIS'])).map(nome => <option key={nome} value={nome}>{nome}</option>)}</select></div>
          <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-280px)]">
            {VENDA_STATUS_MAP.map(status => (
              <div key={status} className="kanban-column flex flex-col w-[350px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/50 p-4">
                <div className="flex justify-center items-center mb-6 py-4 border-b border-gray-800/30"><h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">{status}</h3></div>
                <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                  {filteredVendas.filter(v => v.status === status).map(v => (
                    <div key={v.id} className="bg-[#111827] rounded-[2rem] border border-blue-900/20 p-8 shadow-sm hover:border-blue-600/50 transition-all group relative overflow-hidden">
                      <input type="checkbox" checked={selectedVendas.includes(v.id!)} onChange={(e) => e.target.checked ? setSelectedVendas([...selectedVendas, v.id!]) : setSelectedVendas(selectedVendas.filter(id => id !== v.id))} className="absolute top-8 left-8 w-4 h-4" />
                      <button onClick={() => { setEditingItem(v); setModalType('venda'); }} className="absolute top-8 right-8 text-gray-600 hover:text-white transition"><i className="fas fa-pencil-alt text-[10px]"></i></button>
                      <div className="pl-6 space-y-5">
                        <div><p className="text-sm font-black text-white uppercase leading-tight mb-2">{v.cliente}</p><p className="text-[10px] font-bold text-blue-500">{v.tel}</p><p className="text-[9px] font-black text-gray-600 uppercase mt-2 tracking-widest">{v.empresa || 'SUHAI SEGURADORA'}</p></div>
                        <div className="text-center py-5 bg-[#0b0f1a]/50 rounded-2xl border border-gray-800/50"><p className="text-[8px] font-black text-gray-500 uppercase mb-1">Prêmio Líquido</p><h4 className="text-xl font-black text-white">{FORMAT_BRL(v.valor)}</h4></div>
                        <div className="grid grid-cols-2 gap-4"><div className="p-4 rounded-xl border border-gray-800 bg-[#0b0f1a]/30 text-center"><p className="text-[7px] font-black text-gray-600 uppercase mb-1">C. Cheia</p><p className="text-[10px] font-black text-white">{FORMAT_BRL(v.comissao_cheia)}</p></div><div className="p-4 rounded-xl border border-gray-800 bg-[#0b0f1a]/30 text-center"><p className="text-[7px] font-black text-[#10b981] uppercase mb-1">Sua Parte</p><p className="text-[10px] font-black text-[#10b981]">{FORMAT_BRL(v.comissao_vendedor)}</p></div></div>
                        <div className="flex justify-between items-center pt-5 mt-2 border-t border-gray-800/50"><button onClick={() => moveVenda(v, 'left')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-left text-[9px]"></i></button><span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">{v.vendedor}</span><button onClick={() => moveVenda(v, 'right')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-right text-[9px]"></i></button></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'kanban-indicacoes' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <div><h2 className="text-4xl font-black uppercase text-[#eab308] tracking-tighter">LEADS</h2></div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={() => { setActiveSection('cadastrar-indicacao'); }} className="bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg hover:scale-105 transition-all">Novo Lead</button>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-gray-600 uppercase">Filtrar Data:</span>
                <input 
                  type="date" 
                  className="bg-[#111827] border border-gray-800 rounded-lg p-2 text-[10px] font-black uppercase text-gray-400 outline-none focus:border-yellow-500 transition-all" 
                  value={dateFilter} 
                  onChange={e => setDateFilter(e.target.value)}
                />
                {dateFilter && <button onClick={() => setDateFilter('')} className="text-red-500 text-[10px] hover:text-red-400 transition-all"><i className="fas fa-times-circle"></i></button>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"><input type="text" placeholder="BUSCAR LEADS..." className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-yellow-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><select className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 outline-none focus:border-blue-500 transition-all" value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}><option value="TODOS">TODOS VENDEDORES</option>{Array.from(new Set([...usuarios.map(u => u.nome.toUpperCase()), 'ELEN JACONIS'])).map(nome => <option key={nome} value={nome}>{nome}</option>)}</select></div>
          <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-280px)]">
            {INDICACAO_STATUS_MAP.map(status => (
              <div key={status} className="kanban-column flex flex-col w-[350px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/50 p-4">
                <div className="flex justify-center items-center mb-6 py-4 border-b border-gray-800/30"><h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">{status}</h3></div>
                <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                  {filteredIndicacoes.filter(i => i.status === status).map(i => (
                    <div key={i.id} className="bg-[#111827] rounded-[2rem] border border-yellow-900/20 p-8 shadow-sm hover:border-yellow-500/50 transition-all group relative overflow-hidden">
                      <div className="absolute top-8 right-8 flex gap-3"><button onClick={() => { if(window.confirm('Excluir lead?')) cloud.apagar('indicacoes', i.id!)}} className="text-red-500/30 hover:text-red-500 transition"><i className="fas fa-trash-alt text-[10px]"></i></button><button onClick={() => { setEditingItem(i); setModalType('indicacao'); }} className="text-gray-600 hover:text-white transition"><i className="fas fa-pencil-alt text-[10px]"></i></button></div>
                      <div className="pl-6 space-y-5">
                        <div><p className="text-sm font-black text-white uppercase leading-tight mb-2">{i.cliente}</p><p className="text-[10px] font-bold text-yellow-500">{i.tel}</p><p className="text-[10px] font-black text-gray-500 uppercase mt-2 tracking-widest">{i.veiculo || 'SEM VEÍCULO'}</p></div>
                        <div className="flex flex-col pt-5 mt-2 border-t border-gray-800/50"><div className="flex justify-between items-center mb-1"><button onClick={() => moveIndicacao(i, 'left')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-left text-[9px]"></i></button><span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{i.vendedor || 'SEM VENDEDOR'}</span><button onClick={() => moveIndicacao(i, 'right')} className="text-gray-600 hover:text-white transition"><i className="fas fa-chevron-right text-[9px]"></i></button></div>{i.suhai && <div className="text-center s-suhai-pulse text-[8px] uppercase tracking-widest mt-1 opacity-60">Suhai</div>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'comissao' && <FinanceiroView vendas={vendas} user={user} />}
      {activeSection === 'performance' && <PerformanceView vendas={vendas} usuarios={usuarios} />}
      
      {activeSection === 'metas' && (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-blue-400 tracking-tighter">METAS DOS VENDEDORES</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {usuarios.filter(u => u.setor === 'VENDEDOR' || u.nome.toUpperCase() === 'ELEN JACONIS').map(u => {
              const meta = metas.find(m => m.vendedor.toUpperCase() === u.nome.toUpperCase()) || { vendedor: u.nome.toUpperCase(), meta_qtd: 0, meta_premio: 0, meta_salario: 0 };
              return (
                <div key={u.id || u.nome} className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 shadow-xl relative group hover:border-blue-500/30 transition-all">
                  <button onClick={() => { setEditingItem(meta); setModalType('meta'); }} className="absolute top-8 right-8 text-gray-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"><i className="fas fa-edit text-xs"></i></button>
                  <h3 className="text-xl font-black uppercase text-blue-400 mb-8 tracking-tight">{u.nome}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">META SALARIAL</span><span className="text-xs font-black text-white">{FORMAT_BRL(meta.meta_salario)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">META PRÊMIO</span><span className="text-xs font-black text-white">{FORMAT_BRL(meta.meta_premio)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">QUANTIDADE</span><span className="text-xs font-black text-white">{meta.meta_qtd} UNI</span></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-20">
             <h2 className="text-4xl font-black uppercase text-purple-400 tracking-tighter mb-8">META DA EMPRESA (VM SEGUROS)</h2>
             <div className="bg-[#111827] p-16 rounded-[3.5rem] border-purple-600/30 border-dashed border-2 shadow-2xl relative max-w-2xl overflow-hidden mx-auto">
                <button onClick={() => { setEditingItem(metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS') || { vendedor: 'EMPRESA_VM_SEGUROS', meta_qtd: 0, meta_premio: 0, meta_salario: 0 }); setModalType('meta'); }} className="absolute top-10 right-10 text-purple-400 hover:text-white transition"><i className="fas fa-edit text-lg"></i></button>
                <div className="text-center mb-12"><p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.5em] mb-2">OBJETIVOS GLOBAIS MENSAIS</p><h3 className="text-3xl font-black uppercase text-white tracking-tighter">ESTRATÉGICO VM</h3></div>
                <div className="space-y-10">
                   <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">META PRÊMIO</span><span className="text-2xl font-black text-white">{FORMAT_BRL(metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS')?.meta_premio)}</span></div>
                   <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">META VENDAS</span><span className="text-2xl font-black text-white">{metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS')?.meta_qtd} UNI</span></div>
                   <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">META COMISSÃO</span><span className="text-2xl font-black text-white">{FORMAT_BRL(metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS')?.meta_salario)}</span></div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeSection === 'lead-suhai-page' && (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          <h2 className="text-4xl font-black uppercase text-[#10b981] tracking-tighter">SUHAI GOLD - PAGOS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-[#10b981] shadow-2xl flex flex-col items-center justify-center space-y-3"><p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">COMISSÃO SUHAI</p><h1 className="text-6xl font-black text-[#10b981] font-mono">{FORMAT_BRL(totalSuhaiComm)}</h1></div>
            <div className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-blue-500 shadow-2xl flex flex-col items-center justify-center space-y-3"><p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">PRÊMIO TOTAL</p><h1 className="text-6xl font-black text-blue-500 font-mono">{FORMAT_BRL(totalSuhaiPrem)}</h1></div>
          </div>
          <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <tr><th className="px-10 py-8 border-b border-gray-800/50">Vendedor</th><th className="px-10 py-8 border-b border-gray-800/50">Cliente</th><th className="px-10 py-8 border-b border-gray-800/50">Prêmio</th><th className="px-10 py-8 border-b border-gray-800/50">Comissão</th><th className="px-10 py-8 border-b border-gray-800/50 text-center">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {salesSuhai.map(v => (
                  <tr key={v.id} className="text-sm text-white hover:bg-white/5 transition-all">
                    <td className="px-10 py-6 font-bold text-blue-400 uppercase text-[11px]">{v.vendedor}</td>
                    <td className="px-10 py-6 font-black uppercase tracking-tight">{v.cliente}</td>
                    <td className="px-10 py-6 font-bold text-gray-400">{FORMAT_BRL(v.valor)}</td>
                    <td className="px-10 py-6 font-black text-[#10b981]">{FORMAT_BRL(user?.isAdmin ? v.comissao_cheia : v.comissao_vendedor)}</td>
                    <td className="px-10 py-6 text-center"><span className="bg-green-500/10 text-green-500 text-[8px] font-black px-4 py-1.5 rounded-full border border-green-500/20 uppercase">PAGO</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'vendedores' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-[#ef4444] tracking-tighter">EQUIPE</h2><button onClick={() => { setEditingItem({ setor: 'VENDEDOR', comissao: 30 }); setModalType('usuario'); }} className="bg-[#ef4444] text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg hover:scale-105 transition-all">Novo Usuário</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {usuarios.filter(u => u.setor === 'VENDEDOR' || u.nome.toUpperCase() === 'ELEN JACONIS').map(u => (
              <div key={u.id} className="bg-[#111827] rounded-[2.5rem] p-8 border border-gray-800 relative shadow-xl hover:border-red-500/30 transition-all flex flex-col justify-between group overflow-hidden">
                <div className="pl-4">
                   <div className="flex justify-between items-start mb-1"><h3 className="text-xl font-black uppercase text-white tracking-tight">{u.nome}</h3><button onClick={() => { setEditingItem(u); setModalType('usuario'); }} className="text-gray-600 hover:text-white transition-all"><i className="fas fa-edit text-xs"></i></button></div>
                   <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-10">Setor: {u.setor}</p>
                   <div className="inline-block bg-red-500/10 text-[#ef4444] px-6 py-3 rounded-2xl text-[10px] font-black border border-red-500/10 uppercase">{u.comissao}% Comissão</div>
                </div>
                <button onClick={() => { if(window.confirm('Excluir vendedor?')) cloud.apagar('usuarios', u.id!) }} className="absolute bottom-6 right-8 text-red-500/20 hover:text-red-500 transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'configuracoes' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-gray-400 tracking-tighter">CONFIGURAÇÕES</h2><button onClick={() => { setEditingItem({}); setModalType('empresa'); }} className="bg-[#374151] text-[10px] font-black uppercase text-white px-8 py-4 rounded-2xl shadow-xl transition-all">NOVA SEGURADORA</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {empresas.map(e => (
              <div key={e.id} className="bg-[#111827] rounded-[2.5rem] p-10 border border-gray-800 relative shadow-xl hover:border-gray-600 transition-all group overflow-hidden">
                <div className="pl-6 flex justify-between items-center"><h3 className="text-sm font-black uppercase text-white tracking-widest leading-none">{e.nome}</h3><button onClick={() => { if(window.confirm('Excluir seguradora?')) cloud.apagar('empresas', e.id!) }} className="text-red-500/20 hover:text-red-500 transition-all"><i className="fas fa-trash-alt text-xs"></i></button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'cadastrar-indicacao' && (
        <div className="flex flex-col items-center justify-center min-h-full py-10 animate-in fade-in zoom-in duration-500">
          <div className="bg-[#111827] w-full max-w-2xl rounded-[3rem] p-12 border border-gray-800 shadow-2xl space-y-10">
            <h2 className="text-2xl font-black text-yellow-500 text-center uppercase tracking-widest">DISTRIBUIR LEAD</h2>
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">CLIENTE</label>
                <input 
                  className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none focus:border-yellow-500 transition-all" 
                  value={distribuirForm.cliente || ''} 
                  onChange={e => setDistribuirForm({...distribuirForm, cliente: e.target.value.toUpperCase()})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">WHATSAPP</label>
                  <input 
                    className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none focus:border-yellow-500 transition-all" 
                    value={distribuirForm.tel || ''} 
                    onChange={e => setDistribuirForm({...distribuirForm, tel: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">VEÍCULO / MODELO</label>
                  <input 
                    className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none focus:border-yellow-500 transition-all" 
                    value={distribuirForm.veiculo || ''} 
                    onChange={e => setDistribuirForm({...distribuirForm, veiculo: e.target.value.toUpperCase()})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">ATRIBUIR AO VENDEDOR</label>
                <select 
                  disabled={!user?.isAdmin}
                  className={`w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white uppercase outline-none focus:border-yellow-500 transition-all appearance-none ${!user?.isAdmin ? 'opacity-50' : ''}`} 
                  value={distribuirForm.vendedor || (user?.isAdmin ? '' : user?.nome.toUpperCase())} 
                  onChange={e => setDistribuirForm({...distribuirForm, vendedor: e.target.value})}
                >
                  {user?.isAdmin ? (
                    <>
                      <option value="">SELECIONE UM VENDEDOR</option>
                      {Array.from(new Set([...usuarios.map(u => u.nome.toUpperCase()), 'ELEN JACONIS'])).map(nome => (
                        <option key={nome} value={nome}>{nome}</option>
                      ))}
                    </>
                  ) : (
                    <option value={user?.nome.toUpperCase()}>{user?.nome.toUpperCase()}</option>
                  )}
                </select>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                <input 
                  type="checkbox" 
                  id="lead-suhai-check" 
                  checked={distribuirForm.suhai || false} 
                  onChange={e => setDistribuirForm({...distribuirForm, suhai: e.target.checked})} 
                  className="w-5 h-5 rounded border-gray-800 bg-gray-900 checked:bg-green-500" 
                />
                <label htmlFor="lead-suhai-check" className="text-[11px] font-black uppercase text-green-500 cursor-pointer select-none">Marcar como Lead Suhai</label>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500">OBSERVAÇÕES ADICIONAIS</label>
                <textarea 
                  className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none focus:border-yellow-500 h-32 resize-none transition-all" 
                  placeholder="EX: CLIENTE INDICADO POR AMIGO..." 
                  value={distribuirForm.info || ''} 
                  onChange={e => setDistribuirForm({...distribuirForm, info: e.target.value})}
                />
              </div>
            </div>
            <button 
              onClick={async () => { 
                const finalForm = { ...distribuirForm, vendedor: user?.isAdmin ? distribuirForm.vendedor : user?.nome.toUpperCase() };
                if (!finalForm.cliente || !finalForm.vendedor) return alert("Erro: Cliente e Vendedor são obrigatórios."); 
                await cloud.salvarIndicacao(finalForm as Indicacao); 
                alert("Sucesso: Lead distribuído para a equipe!"); 
                setDistribuirForm({ status: 'NOVA INDICAÇÃO', suhai: false, info: '', cliente: '', tel: '', veiculo: '', vendedor: user?.isAdmin ? '' : user?.nome.toUpperCase() }); 
              }} 
              className="w-full bg-yellow-500 text-black p-6 rounded-3xl font-black uppercase text-xs active:scale-95 transition-all shadow-xl shadow-yellow-500/10"
            >
              CONFIRMAR ENVIO DO LEAD
            </button>
          </div>
        </div>
      )}

      {/* MODAIS */}
      {modalType === 'venda' && (
        <ModalWrapper title="GERENCIAR PRODUÇÃO" onClose={() => setModalType(null)} onSave={async () => { await cloud.salvarVenda(editingItem); setModalType(null); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2"><label className="text-[9px] font-black uppercase text-gray-500">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white outline-none" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2 col-span-2"><label className="text-[9px] font-black uppercase text-gray-500">TELEFONE (WHATSAPP)</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white outline-none" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">VENDEDOR</label>
              <select 
                disabled={!user?.isAdmin}
                className={`w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase ${!user?.isAdmin ? 'opacity-50' : ''}`}
                value={editingItem?.vendedor || (user?.isAdmin ? '' : user?.nome.toUpperCase())} 
                onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}
              >
                {user?.isAdmin ? (
                  <>
                    <option value="">SELECIONE</option>
                    {Array.from(new Set([...usuarios.map(u => u.nome.toUpperCase()), 'ELEN JACONIS'])).map(nome => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                  </>
                ) : (
                  <option value={user?.nome.toUpperCase()}>{user?.nome.toUpperCase()}</option>
                )}
              </select>
            </div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">VALOR PRÊMIO</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.valor || 0} onChange={e => setEditingItem({...editingItem, valor: Number(e.target.value)})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">C. CHEIA</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold" value={editingItem?.comissao_cheia || 0} onChange={e => setEditingItem({...editingItem, comissao_cheia: Number(e.target.value)})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">PARTE VENDEDOR</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold" value={editingItem?.comissao_vendedor || 0} onChange={e => setEditingItem({...editingItem, comissao_vendedor: Number(e.target.value)})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">SEGURADORA</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}>{empresas.map(emp => <option key={emp.id} value={emp.nome}>{emp.nome}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">STATUS</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase" value={editingItem?.status || 'Fazer Vistoria'} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>{VENDA_STATUS_MAP.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
        </ModalWrapper>
      )}

      {modalType === 'indicacao' && (
        <ModalWrapper title="GERENCIAR LEAD" onClose={() => setModalType(null)} onSave={async () => { await cloud.salvarIndicacao(editingItem); setModalType(null); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2"><label className="text-[9px] font-black uppercase text-gray-500">CLIENTE</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white outline-none" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">WHATSAPP</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white outline-none" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">VEÍCULO</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white outline-none" value={editingItem?.veiculo || ''} onChange={e => setEditingItem({...editingItem, veiculo: e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2 col-span-2"><label className="text-[9px] font-black uppercase text-gray-500">VENDEDOR</label>
              <select 
                disabled={!user?.isAdmin}
                className={`w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase ${!user?.isAdmin ? 'opacity-50' : ''}`}
                value={editingItem?.vendedor || (user?.isAdmin ? '' : user?.nome.toUpperCase())} 
                onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}
              >
                {user?.isAdmin ? (
                  <>
                    <option value="">SELECIONE</option>
                    {Array.from(new Set([...usuarios.map(u => u.nome.toUpperCase()), 'ELEN JACONIS'])).map(nome => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                  </>
                ) : (
                  <option value={user?.nome.toUpperCase()}>{user?.nome.toUpperCase()}</option>
                )}
              </select>
            </div>
            <div className="space-y-2 col-span-2"><label className="text-[9px] font-black uppercase text-gray-500">OBSERVAÇÕES</label><textarea className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white outline-none h-24" value={editingItem?.info || ''} onChange={e => setEditingItem({...editingItem, info: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">STATUS</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase" value={editingItem?.status || 'NOVA INDICAÇÃO'} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>{INDICACAO_STATUS_MAP.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
        </ModalWrapper>
      )}

      {modalType === 'usuario' && (
        <ModalWrapper title="CONFIGURAR USUÁRIO" onClose={() => setModalType(null)} onSave={async () => { await cloud.salvarUsuario(editingItem); setModalType(null); }}>
          <div className="space-y-6">
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">NOME COMPLETO</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase" value={editingItem?.nome || ''} onChange={e => setEditingItem({...editingItem, nome: e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">LOGIN</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.login || ''} onChange={e => setEditingItem({...editingItem, login: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">SENHA</label><input type="password" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.senha || ''} onChange={e => setEditingItem({...editingItem, senha: e.target.value})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">SETOR</label><select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.setor || 'VENDEDOR'} onChange={e => setEditingItem({...editingItem, setor: e.target.value})}><option value="VENDEDOR">VENDEDOR</option><option value="ADMIN">ADMIN</option></select></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">COMISSÃO (%)</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.comissao || 0} onChange={e => setEditingItem({...editingItem, comissao: Number(e.target.value)})} /></div>
          </div>
        </ModalWrapper>
      )}

      {modalType === 'meta' && (
        <ModalWrapper title="CONFIGURAR META" onClose={() => setModalType(null)} onSave={async () => { await cloud.salvarMeta(editingItem); setModalType(null); }}>
          <div className="space-y-6">
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">META SALARIAL (R$)</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.meta_salario || 0} onChange={e => setEditingItem({...editingItem, meta_salario: Number(e.target.value)})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">META PRÊMIO (R$)</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.meta_premio || 0} onChange={e => setEditingItem({...editingItem, meta_premio: Number(e.target.value)})} /></div>
            <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">META QUANTIDADE</label><input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" value={editingItem?.meta_qtd || 0} onChange={e => setEditingItem({...editingItem, meta_qtd: Number(e.target.value)})} /></div>
          </div>
        </ModalWrapper>
      )}

      {modalType === 'empresa' && (
        <ModalWrapper title="NOVA SEGURADORA" onClose={() => setModalType(null)} onSave={async () => { await cloud.salvarEmpresa(editingItem); setModalType(null); }}>
          <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-500">NOME DA EMPRESA</label><input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase" value={editingItem?.nome || ''} onChange={e => setEditingItem({...editingItem, nome: e.target.value.toUpperCase()})} /></div>
        </ModalWrapper>
      )}
    </Layout>
  );
};

export default App;
