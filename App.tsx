
import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, User, Venda, Indicacao, Meta, Empresa } from './types';
import { cloud } from './services/firebase';
import { FORMAT_BRL, INDICACAO_STATUS_MAP, VENDA_STATUS_MAP } from './constants';
import Layout from './components/Layout';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('TODOS');

  // Global Data State
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  // Selection State for Bulk Actions
  const [selectedVendas, setSelectedVendas] = useState<string[]>([]);
  const [selectedIndicacoes, setSelectedIndicacoes] = useState<string[]>([]);

  // Modals
  const [modalType, setModalType] = useState<'venda' | 'indicacao' | 'usuario' | 'empresa' | 'meta' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    const unsubVendas = cloud.subscribeVendas(setVendas);
    const unsubUsers = cloud.subscribeUsuarios(setUsuarios);
    const unsubMetas = cloud.subscribeMetas(setMetas);
    const unsubIndicacoes = cloud.subscribeIndicacoes(setIndicacoes);
    const unsubEmpresas = cloud.subscribeEmpresas(setEmpresas);

    return () => {
      unsubVendas();
      unsubUsers();
      unsubMetas();
      unsubIndicacoes();
      unsubEmpresas();
    };
  }, []);

  const handleLogin = () => {
    const uI = loginForm.username.trim().toLowerCase();
    const pI = loginForm.password.trim();

    if (uI === 'admin' && pI === 'admin123') {
      const admin: AuthUser = { nome: 'ADMIN MASTER', setor: 'ADMIN', isAdmin: true, login: 'admin', comissao: 100 };
      setUser(admin);
      setIsAuthenticated(true);
    } else {
      const found = usuarios.find(u => (u.login || '').toLowerCase() === uI && u.senha === pI);
      if (found) {
        const authUser: AuthUser = { ...found, isAdmin: found.setor === 'ADMIN' };
        setUser(authUser);
        setIsAuthenticated(true);
      } else {
        alert('Credenciais inválidas');
      }
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setLoginForm({ username: '', password: '' });
    setSelectedVendas([]);
    setSelectedIndicacoes([]);
    setSalesmanFilter('TODOS');
  };

  // Funções de Movimentação Rápida
  const moveVenda = async (item: Venda, direction: 'left' | 'right') => {
    const currentIndex = VENDA_STATUS_MAP.indexOf(item.status);
    const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < VENDA_STATUS_MAP.length) {
      await cloud.updateStatus('vendas', item.id!, VENDA_STATUS_MAP[nextIndex]);
    }
  };

  const moveIndicacao = async (item: Indicacao, direction: 'left' | 'right') => {
    const currentIndex = INDICACAO_STATUS_MAP.indexOf(item.status);
    const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < INDICACAO_STATUS_MAP.length) {
      await cloud.updateStatus('indicacoes', item.id!, INDICACAO_STATUS_MAP[nextIndex]);
    }
  };

  // Bulk Actions
  const handleBulkDeleteVendas = async () => {
    if (window.confirm(`Excluir permanentemente ${selectedVendas.length} registros?`)) {
      for (const id of selectedVendas) await cloud.apagar('vendas', id);
      setSelectedVendas([]);
    }
  };

  const handleBulkDeleteIndicacoes = async () => {
    if (window.confirm(`Excluir permanentemente ${selectedIndicacoes.length} leads?`)) {
      for (const id of selectedIndicacoes) await cloud.apagar('indicacoes', id);
      setSelectedIndicacoes([]);
    }
  };

  const toggleVendaSelection = (id: string) => {
    setSelectedVendas(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const toggleIndicacaoSelection = (id: string) => {
    setSelectedIndicacoes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Filtros Otimizados
  const filteredVendas = useMemo(() => {
    let list = user?.isAdmin ? vendas : vendas.filter(v => v.vendedor === user?.nome);
    if (user?.isAdmin && salesmanFilter !== 'TODOS') {
      list = list.filter(v => v.vendedor === salesmanFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(v => 
        (v.cliente || '').toLowerCase().includes(lower) || 
        (v.vendedor || '').toLowerCase().includes(lower) ||
        (v.empresa || '').toLowerCase().includes(lower)
      );
    }
    return list;
  }, [vendas, user, searchTerm, salesmanFilter]);

  const filteredIndicacoes = useMemo(() => {
    let list = user?.isAdmin ? indicacoes : indicacoes.filter(i => i.vendedor === user?.nome);
    if (user?.isAdmin && salesmanFilter !== 'TODOS') {
      list = list.filter(i => i.vendedor === salesmanFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(i => 
        (i.cliente || '').toLowerCase().includes(lower) || 
        (i.veiculo || '').toLowerCase().includes(lower) ||
        (i.vendedor || '').toLowerCase().includes(lower)
      );
    }
    return list;
  }, [indicacoes, user, searchTerm, salesmanFilter]);

  // --- Views ---

  const PerformanceTeamView = () => {
    const metrics = useMemo(() => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const mesVendas = vendas.filter(v => v.dataCriacao >= startOfMonth);

      // Lógica de normalização estrita:
      // ITURAN e ALLIANZ separadas
      // Vazio, 'OUTRAS' ou 'SUHAI' -> SUHAI SEGURADORA
      const getNormalizedEmpresa = (rawEmp?: string) => {
        if (!rawEmp || rawEmp.trim() === '') return 'SUHAI SEGURADORA';
        const empUpper = rawEmp.toUpperCase().trim();
        if (empUpper === 'OUTRAS') return 'SUHAI SEGURADORA';
        if (empUpper.includes('SUHAI')) return 'SUHAI SEGURADORA';
        return empUpper; // ALLIANZ, ITURAN, TOKIO MARINE, etc permanecem como digitados (em caixa alta)
      };

      const userList = usuarios.filter(u => u.setor === 'VENDEDOR');
      
      // Métricas por Vendedor - Baseado em TUDO o que foi cadastrado (Produção Real)
      const perUser = userList.map(u => {
        const myVendas = mesVendas.filter(v => v.vendedor === u.nome);
        const empresas: Record<string, number> = {};
        myVendas.forEach(v => {
          const emp = getNormalizedEmpresa(v.empresa);
          empresas[emp] = (empresas[emp] || 0) + 1;
        });

        return {
          nome: u.nome,
          totalVendas: myVendas.length,
          empresas,
          // Agora soma toda a produção para bater 100% com o Kanban
          comissaoTotal: myVendas.reduce((acc, v) => acc + (v.comissao_cheia || 0), 0),
          premioTotal: myVendas.reduce((acc, v) => acc + (v.valor || 0), 0)
        };
      });

      // Cálculo Global consolidado
      const globalEmpresas: Record<string, number> = {};
      perUser.forEach(mu => {
        Object.entries(mu.empresas).forEach(([emp, count]) => {
          globalEmpresas[emp] = (globalEmpresas[emp] || 0) + (count as number);
        });
      });

      return { globalEmpresas, perUser };
    }, [vendas, usuarios]);

    return (
      <div className="animate-in fade-in duration-500">
        <h2 className="text-4xl font-black uppercase text-purple-400 mb-10 tracking-tighter">Performance Team</h2>
        
        {/* Topo: Ranking Global de Empresas */}
        <div className="bg-[#111827] p-8 rounded-[3rem] border border-gray-800 mb-10 shadow-2xl">
          <h3 className="text-xl font-black uppercase text-white mb-6 flex items-center gap-3">
             <i className="fas fa-building text-purple-500"></i> Produção por Seguradora (Mês)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Object.entries(metrics.globalEmpresas).sort((a,b) => (b[1] as number) - (a[1] as number)).map(([name, count]) => (
              <div key={name} className="bg-[#0f172a] p-4 rounded-2xl border border-gray-800 text-center border-t-4 border-t-blue-500/50">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">{name}</p>
                <p className="text-2xl font-black text-white">{count}</p>
                <p className="text-[8px] font-bold text-purple-400 uppercase">Apólices em Produção</p>
              </div>
            ))}
            {Object.keys(metrics.globalEmpresas).length === 0 && (
              <div className="col-span-full py-6 text-center text-gray-600 font-bold uppercase text-[10px]">Aguardando lançamentos no mês</div>
            )}
          </div>
        </div>

        {/* Lista de Vendedores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {metrics.perUser.map(mu => (
            <div key={mu.nome} className="bg-[#111827] p-8 rounded-[3rem] border border-gray-800 border-t-8 border-t-purple-600 shadow-2xl hover:scale-[1.02] transition-all">
               <h4 className="text-xl font-black uppercase text-white mb-6 text-center">{mu.nome}</h4>
               
               <div className="bg-[#0f172a] p-5 rounded-2xl border border-gray-800 mb-6 text-center shadow-inner">
                  <p className="text-[10px] text-gray-500 font-black uppercase mb-1">Produção Total (Mês)</p>
                  <p className="text-4xl font-black text-purple-400">{mu.totalVendas}</p>
               </div>

               <div className="space-y-4 mb-8">
                  <p className="text-[10px] font-black text-gray-500 uppercase border-b border-gray-800 pb-2">Quebra por Empresa</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(mu.empresas).map(([e, c]) => (
                      <div key={e} className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-gray-400 uppercase">{e}</span>
                        <span className="text-white bg-purple-900/30 px-2 py-0.5 rounded-lg">{c}</span>
                      </div>
                    ))}
                    {Object.keys(mu.empresas).length === 0 && <p className="text-[10px] text-gray-700 uppercase">Sem registros</p>}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/10 text-center">
                     <p className="text-[8px] text-green-500 font-black uppercase mb-1">C. Produzida</p>
                     <p className="text-[12px] font-black text-white">{FORMAT_BRL(mu.comissaoTotal)}</p>
                  </div>
                  <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 text-center">
                     <p className="text-[8px] text-blue-500 font-black uppercase mb-1">Prêmio Total</p>
                     <p className="text-[12px] font-black text-white">{FORMAT_BRL(mu.premioTotal)}</p>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    const stats = useMemo(() => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const baseVendas = user?.isAdmin ? vendas : vendas.filter(v => v.vendedor === user?.nome);
      
      const hojeVendas = baseVendas.filter(v => v.dataCriacao >= startOfDay);
      const mesVendas = baseVendas.filter(v => v.dataCriacao >= startOfMonth);
      const mesVendasPagas = mesVendas.filter(v => v.status === 'Pagamento Efetuado');

      const userMeta = metas.find(m => m.vendedor === user?.nome);

      return {
        vendasDia: hojeVendas.length,
        premioDia: hojeVendas.reduce((acc, v) => acc + (v.valor || 0), 0),
        vendasMes: mesVendas.length,
        premioMes: mesVendasPagas.reduce((acc, v) => acc + (v.valor || 0), 0),
        comissaoMes: mesVendasPagas.reduce((acc, v) => acc + (v.comissao_vendedor || 0), 0),
        userMeta
      };
    }, [vendas, metas, user]);

    return (
      <div className="animate-in fade-in duration-500">
        <h2 className="text-4xl font-black uppercase text-white tracking-tighter mb-10">Cockpit Geral</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 shadow-xl border-l-4 border-l-blue-500">
            <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Vendas (Hoje)</p>
            <h3 className="text-5xl font-black text-white">{stats.vendasDia}</h3>
            <p className="text-[9px] text-gray-600 mt-2 uppercase font-bold">Lançamentos do dia</p>
          </div>
          
          <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 shadow-xl border-l-4 border-l-green-500">
            <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Prêmio Líquido (Hoje)</p>
            <h3 className="text-3xl font-black text-green-500">{FORMAT_BRL(stats.premioDia)}</h3>
            <p className="text-[9px] text-gray-600 mt-2 uppercase font-bold">Total produzido hoje</p>
          </div>

          <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 shadow-xl border-l-4 border-l-yellow-500">
            <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Vendas (No Mês)</p>
            <h3 className="text-5xl font-black text-white">{stats.vendasMes}</h3>
            <p className="text-[9px] text-gray-600 mt-2 uppercase font-bold">Total acumulado mês</p>
          </div>

          <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 shadow-xl border-l-4 border-l-white">
            <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Prêmio Líquido (No Mês)</p>
            <h3 className="text-3xl font-black text-white">{FORMAT_BRL(stats.premioMes)}</h3>
            <p className="text-[9px] text-gray-400 mt-2 uppercase font-bold">Apenas pagamentos confirmados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
           <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-2xl">
              <h3 className="text-xl font-black uppercase text-white mb-8 flex items-center gap-3">
                <i className="fas fa-chart-line text-blue-500"></i> Funil de Produção
              </h3>
              <div className="space-y-6">
                {VENDA_STATUS_MAP.map(status => {
                  const myVendas = user?.isAdmin ? vendas : vendas.filter(v => v.vendedor === user?.nome);
                  const count = myVendas.filter(v => v.status === status).length;
                  const total = myVendas.length;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>{status}</span>
                        <span className="text-white">{count} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden border border-gray-800">
                        <div className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>

           <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-2xl">
              <h3 className="text-xl font-black uppercase text-white mb-8 flex items-center gap-3">
                <i className="fas fa-bolt text-yellow-500"></i> Status dos Leads
              </h3>
              <div className="space-y-6">
                {INDICACAO_STATUS_MAP.map(status => {
                  const myLeads = user?.isAdmin ? indicacoes : indicacoes.filter(i => i.vendedor === user?.nome);
                  const count = myLeads.filter(i => i.status === status).length;
                  const total = myLeads.length;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>{status}</span>
                        <span className="text-white">{count} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden border border-gray-800">
                        <div className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>

        {!user?.isAdmin && stats.userMeta && (
          <div className="animate-in slide-in-from-bottom duration-700">
             <div className="bg-[#111827] p-10 rounded-[3.5rem] border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <i className="fas fa-bullseye text-9xl text-blue-500"></i>
                </div>
                
                <h3 className="text-2xl font-black uppercase text-white mb-10 flex items-center gap-3">
                  <i className="fas fa-trophy text-yellow-500"></i> Meus Objetivos do Mês
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <div>
                            <p className="text-gray-500 text-[10px] font-black uppercase">Quantidade de Vendas</p>
                            <h4 className="text-3xl font-black text-white">{stats.vendasMes} / <span className="text-gray-600">{stats.userMeta.meta_qtd}</span></h4>
                         </div>
                         <p className="text-[10px] font-black text-blue-400">{((stats.vendasMes / stats.userMeta.meta_qtd) * 100).toFixed(0)}%</p>
                      </div>
                      <div className="h-3 bg-[#0f172a] rounded-full border border-gray-800 overflow-hidden">
                         <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min((stats.vendasMes / stats.userMeta.meta_qtd) * 100, 100)}%` }}></div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <div>
                            <p className="text-gray-500 text-[10px] font-black uppercase">Prêmio Produzido (Pago)</p>
                            <h4 className="text-2xl font-black text-white">{FORMAT_BRL(stats.premioMes)}</h4>
                         </div>
                         <p className="text-[10px] font-black text-green-500">{((stats.premioMes / stats.userMeta.meta_premio) * 100).toFixed(0)}%</p>
                      </div>
                      <div className="h-3 bg-[#0f172a] rounded-full border border-gray-800 overflow-hidden">
                         <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${Math.min((stats.premioMes / stats.userMeta.meta_premio) * 100, 100)}%` }}></div>
                      </div>
                      <p className="text-[9px] text-gray-600 font-bold uppercase">Meta: {FORMAT_BRL(stats.userMeta.meta_premio)}</p>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <div>
                            <p className="text-gray-500 text-[10px] font-black uppercase">Comissão Acumulada</p>
                            <h4 className="text-2xl font-black text-white">{FORMAT_BRL(stats.comissaoMes)}</h4>
                         </div>
                         <p className="text-[10px] font-black text-purple-500">{((stats.comissaoMes / stats.userMeta.meta_salario) * 100).toFixed(0)}%</p>
                      </div>
                      <div className="h-3 bg-[#0f172a] rounded-full border border-gray-800 overflow-hidden">
                         <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${Math.min((stats.comissaoMes / stats.userMeta.meta_salario) * 100, 100)}%` }}></div>
                      </div>
                      <p className="text-[9px] text-gray-600 font-bold uppercase">Meta Salarial: {FORMAT_BRL(stats.userMeta.meta_salario)}</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  const KanbanIndicacoes = () => (
    <div className="animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-yellow-500 tracking-tighter">Leads</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase">Selecione para excluir em massa</p>
        </div>
        <div className="flex gap-4">
          {selectedIndicacoes.length > 0 && (
            <button onClick={handleBulkDeleteIndicacoes} className="bg-red-600/20 text-red-500 border border-red-600/30 px-6 py-3 rounded-2xl font-black text-[11px] uppercase hover:bg-red-600 hover:text-white transition-all">
              Excluir Selecionados ({selectedIndicacoes.length})
            </button>
          )}
          <button onClick={() => { setModalType('indicacao'); setEditingItem(null); }} className="bg-yellow-500 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-black">Novo Lead</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
          <input type="text" placeholder="BUSCAR LEADS..." className="w-full bg-[#111827] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-yellow-500 transition-all uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {user?.isAdmin && (
           <div className="relative">
             <i className="fas fa-user-tie absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
             <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="w-full bg-[#111827] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-yellow-500 transition-all uppercase appearance-none">
               <option value="TODOS">TODOS VENDEDORES</option>
               {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
             </select>
             <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"></i>
           </div>
        )}
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 scrollbar-thin">
        {INDICACAO_STATUS_MAP.map(status => (
          <div key={status} className="kanban-column bg-[#0f172a] rounded-[2.5rem] p-5 border border-gray-800 flex flex-col">
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-6 text-center tracking-[0.2em]">{status}</h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              {filteredIndicacoes.filter(i => i.status === status).map(i => (
                <div key={i.id} className="group bg-[#111827] border border-gray-800 p-6 rounded-[2.5rem] border-l-4 border-l-yellow-500 hover:scale-[1.02] transition-all shadow-xl relative">
                  <div className="absolute top-4 left-4">
                    <input type="checkbox" checked={selectedIndicacoes.includes(i.id!)} onChange={() => toggleIndicacaoSelection(i.id!)} className="w-4 h-4 rounded accent-yellow-500 cursor-pointer" />
                  </div>
                  <div className="absolute top-4 right-4">
                     <button onClick={() => { setModalType('indicacao'); setEditingItem(i); }} className="text-gray-600 hover:text-yellow-500 transition-colors p-2">
                        <i className="fas fa-pen text-[10px]"></i>
                     </button>
                  </div>
                  <div className="flex justify-between items-start mb-2 ml-6 mr-8">
                    <h4 onClick={() => { setModalType('indicacao'); setEditingItem(i); }} className="text-[12px] font-black uppercase text-white cursor-pointer hover:text-yellow-500 leading-tight">{i.cliente}</h4>
                    <button onClick={async () => { if(confirm("Excluir lead?")) await cloud.apagar('indicacoes', i.id!); }} className="text-red-500/30 hover:text-red-500 ml-2"><i className="fas fa-trash text-[10px]"></i></button>
                  </div>
                  <p className="text-[10px] text-yellow-400 font-bold mb-3 ml-6 flex items-center gap-1"><i className="fab fa-whatsapp"></i>{i.tel}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-4 ml-6">{i.veiculo}</p>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                    <button disabled={INDICACAO_STATUS_MAP.indexOf(i.status) === 0} onClick={() => moveIndicacao(i, 'left')} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-yellow-500 hover:text-black disabled:opacity-0 transition-all"><i className="fas fa-chevron-left text-[10px]"></i></button>
                    <span className="text-[8px] font-black uppercase text-gray-600">{i.vendedor}</span>
                    <button disabled={INDICACAO_STATUS_MAP.indexOf(i.status) === INDICACAO_STATUS_MAP.length - 1} onClick={() => moveIndicacao(i, 'right')} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-yellow-500 hover:text-black disabled:opacity-0 transition-all"><i className="fas fa-chevron-right text-[10px]"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const KanbanVendas = () => (
    <div className="animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-blue-500 tracking-tighter">Produção</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase">Gestão completa de apólices</p>
        </div>
        <div className="flex gap-4">
          {selectedVendas.length > 0 && (
            <button onClick={handleBulkDeleteVendas} className="bg-red-600/20 text-red-500 border border-red-600/30 px-6 py-3 rounded-2xl font-black text-[11px] uppercase hover:bg-red-600 hover:text-white transition-all">
              Excluir Selecionados ({selectedVendas.length})
            </button>
          )}
          <button onClick={() => { setModalType('venda'); setEditingItem(null); }} className="bg-blue-600 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-white shadow-lg shadow-blue-500/20">Lançar Venda</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
          <input type="text" placeholder="PESQUISAR PRODUÇÃO..." className="w-full bg-[#111827] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {user?.isAdmin && (
           <div className="relative">
             <i className="fas fa-user-tie absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
             <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="w-full bg-[#111827] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase appearance-none">
               <option value="TODOS">TODOS VENDEDORES</option>
               {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
             </select>
             <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"></i>
           </div>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
        {VENDA_STATUS_MAP.map(status => (
          <div key={status} className="kanban-column bg-[#0f172a] rounded-[2.5rem] p-5 border border-gray-800 flex flex-col">
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-6 text-center tracking-[0.2em]">{status}</h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              {filteredVendas.filter(v => v.status === status).map(v => (
                <div key={v.id} className="group bg-[#111827] border border-gray-800 p-4 rounded-[2rem] border-l-4 border-l-blue-600 hover:scale-[1.02] transition-all shadow-xl relative">
                  <div className="absolute top-3 left-3">
                    <input type="checkbox" checked={selectedVendas.includes(v.id!)} onChange={() => toggleVendaSelection(v.id!)} className="w-4 h-4 rounded accent-blue-500 cursor-pointer" />
                  </div>
                  <div className="absolute top-3 right-3">
                     <button onClick={() => { setModalType('venda'); setEditingItem(v); }} className="text-gray-600 hover:text-blue-500 transition-colors p-2"><i className="fas fa-pen text-[10px]"></i></button>
                  </div>
                  <div className="flex justify-between items-start mb-1 ml-6 mr-8">
                    <h4 onClick={() => { setModalType('venda'); setEditingItem(v); }} className="text-[12px] font-black uppercase text-white cursor-pointer hover:text-blue-500 leading-tight">{v.cliente}</h4>
                    {v.suhai && <i className="fas fa-star text-green-500 text-[10px] s-suhai-pulse"></i>}
                  </div>
                  <p className="text-[9px] text-blue-400 font-bold mb-2 ml-6 flex items-center gap-1"><i className="fab fa-whatsapp"></i>{v.tel}</p>
                  <p className="text-[8px] text-gray-500 font-black uppercase mb-3 ml-6">{v.empresa || 'Seguradora'}</p>
                  <div className="bg-[#0f172a] p-3 rounded-2xl mb-4 border border-gray-800 text-center shadow-inner">
                    <p className="text-[7px] text-gray-500 font-black uppercase mb-1">Prêmio Líquido</p>
                    <p className="text-[14px] font-black text-white">{FORMAT_BRL(v.valor)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-800/40 p-2 rounded-xl border border-gray-800 text-center">
                      <p className="text-[6px] font-black text-gray-500 uppercase mb-1">C. Cheia</p>
                      <p className="text-[9px] font-bold text-gray-300">{FORMAT_BRL(v.comissao_cheia)}</p>
                    </div>
                    <div className="bg-green-500/5 p-2 rounded-xl border border-green-500/20 text-center">
                      <p className="text-[6px] font-black text-green-500 uppercase mb-1">Sua Parte</p>
                      <p className="text-[9px] font-black text-green-400">{FORMAT_BRL(v.comissao_vendedor)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                    <button disabled={VENDA_STATUS_MAP.indexOf(v.status) === 0} onClick={() => moveVenda(v, 'left')} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white disabled:opacity-0 transition-all"><i className="fas fa-chevron-left text-[10px]"></i></button>
                    <div className="text-center"><p className="text-[8px] text-blue-400 font-black uppercase">{v.vendedor}</p></div>
                    <button disabled={VENDA_STATUS_MAP.indexOf(v.status) === VENDA_STATUS_MAP.length - 1} onClick={() => moveVenda(v, 'right')} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white disabled:opacity-0 transition-all"><i className="fas fa-chevron-right text-[10px]"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const LeadSuhaiView = () => {
    const suhaiRecords = filteredVendas.filter(v => v.suhai && v.status === 'Pagamento Efetuado');
    const totalComissao = suhaiRecords.reduce((acc, v) => acc + (user?.isAdmin ? (v.comissao_cheia || 0) : (v.comissao_vendedor || 0)), 0);
    const totalPremio = suhaiRecords.reduce((acc, v) => acc + (v.valor || 0), 0);
    return (
      <div className="animate-in fade-in duration-500">
        <h2 className="text-4xl font-black uppercase text-green-500 mb-10 tracking-tighter">Suhai Gold - Pagos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
           <div className="bg-[#111827] p-8 rounded-[2rem] border border-green-500/30 shadow-2xl">
              <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Comissão Suhai</p>
              <h2 className="text-5xl font-black text-green-500">{FORMAT_BRL(totalComissao)}</h2>
           </div>
           <div className="bg-[#111827] p-8 rounded-[2rem] border border-blue-500/30 shadow-2xl">
              <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Prêmio Total</p>
              <h2 className="text-5xl font-black text-blue-500">{FORMAT_BRL(totalPremio)}</h2>
           </div>
        </div>
        <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
           <table className="w-full text-left">
              <thead className="bg-[#0f172a] text-gray-400 text-[10px] uppercase font-black">
                 <tr><th className="p-6">Vendedor</th><th className="p-6">Cliente</th><th className="p-6">Prêmio</th><th className="p-6">Comissão</th><th className="p-6 text-center">Status</th></tr>
              </thead>
              <tbody className="text-xs font-bold uppercase">
                 {suhaiRecords.map(v => (
                    <tr key={v.id} className="border-b border-gray-800 hover:bg-gray-800/20">
                       <td className="p-6 text-blue-400">{v.vendedor}</td><td className="p-6 text-white">{v.cliente}</td><td className="p-6 text-gray-400">{FORMAT_BRL(v.valor)}</td><td className="p-6 text-green-500 font-black">{FORMAT_BRL(user?.isAdmin ? v.comissao_cheia : v.comissao_vendedor)}</td><td className="p-6 text-center"><span className="text-[9px] bg-green-500/10 text-green-500 px-3 py-1 rounded-full">PAGO</span></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    );
  };

  const Financeiro = () => {
    const concluido = filteredVendas.filter(v => v.status === 'Pagamento Efetuado');
    const totalComissao = concluido.reduce((a, b) => a + Number(user?.isAdmin ? (b.comissao_cheia || 0) : (b.comissao_vendedor || 0)), 0);
    return (
      <div className="animate-in fade-in duration-500">
        <h2 className="text-4xl font-black uppercase text-green-500 mb-10 tracking-tighter">Financeiro</h2>
        <div className="bg-[#111827] p-12 rounded-[3rem] border border-green-900/30 text-center mb-10 shadow-2xl">
          <p className="text-gray-500 text-[11px] font-black uppercase mb-2">Total Sua Parte (Vendas Pagas)</p>
          <h2 className="text-7xl font-black text-green-500">{FORMAT_BRL(totalComissao)}</h2>
        </div>
        <div className="bg-[#111827] rounded-[2rem] border border-gray-800 overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-gray-400 text-[10px] uppercase font-black">
              <tr><th className="p-6">Data</th><th className="p-6">Cliente</th><th className="p-6">Prêmio</th><th className="p-6">Comissão</th></tr>
            </thead>
            <tbody className="text-xs font-bold uppercase">
              {concluido.map(v => (
                <tr key={v.id} className="border-b border-gray-800 hover:bg-gray-800/20">
                  <td className="p-6 text-gray-500">{new Date(v.dataCriacao || 0).toLocaleDateString()}</td><td className="p-6 text-white">{v.cliente}</td><td className="p-6 text-gray-400">{FORMAT_BRL(v.valor)}</td><td className="p-6 font-black text-green-500">{FORMAT_BRL(user?.isAdmin ? v.comissao_cheia : v.comissao_vendedor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const FormLead = () => (
    <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
      <div className="bg-[#111827] p-12 rounded-[3rem] border border-gray-800 shadow-2xl">
        <h2 className="text-2xl font-black uppercase text-yellow-500 mb-10 text-center">Distribuir Lead</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const f = (e.target as any);
          await cloud.salvarIndicacao({ cliente: f.cliente.value, tel: f.tel.value, veiculo: f.veiculo.value, vendedor: f.vendedor.value, suhai: f.suhai.checked, status: 'NOVA INDICAÇÃO', info: f.info.value, dataCriacao: Date.now() } as any);
          alert('Lead enviado com sucesso!');
          f.reset();
        }} className="space-y-6">
          <div className="space-y-1">
             <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Nome do Cliente</label>
             <input name="cliente" placeholder="NOME COMPLETO" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-yellow-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">WhatsApp / Tel</label>
                <input name="tel" placeholder="(00) 00000-0000" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none focus:border-yellow-500" required />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Veículo</label>
                <input name="veiculo" placeholder="MARCA / MODELO" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-yellow-500" required />
             </div>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Atribuir ao Vendedor</label>
             <select name="vendedor" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-yellow-500" required>
                {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Notas Adicionais</label>
             <textarea name="info" placeholder="DETALHES DO LEAD..." className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none h-32 uppercase focus:border-yellow-500"></textarea>
          </div>
          <div className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-2xl border border-gray-800">
            <input type="checkbox" name="suhai" className="w-6 h-6 accent-green-500" />
            <label className="text-xs font-black uppercase text-green-500">Marcar como Suhai Gold</label>
          </div>
          <button type="submit" className="w-full bg-yellow-500 p-6 rounded-[2rem] font-black uppercase text-black hover:scale-105 transition-all shadow-xl">Confirmar Envio</button>
        </form>
      </div>
    </div>
  );

  const VendedoresView = () => (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black uppercase text-red-500">Equipe</h2>
        <button onClick={() => { setModalType('usuario'); setEditingItem(null); }} className="bg-red-600 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-white">Novo Usuário</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {usuarios.map(u => (
          <div key={u.id} onClick={() => { setModalType('usuario'); setEditingItem(u); }} className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 border-l-8 border-l-red-600 hover:scale-[1.03] transition-all cursor-pointer shadow-xl">
            <h4 className="text-[14px] font-black uppercase text-white mb-2">{u.nome}</h4><p className="text-[10px] text-gray-500 uppercase font-black">Setor: {u.setor}</p>
            <div className="mt-4 inline-block bg-red-600/10 text-red-500 px-3 py-1 rounded-lg text-[11px] font-black">{u.comissao}% Comissão</div>
          </div>
        ))}
      </div>
    </div>
  );

  const MetasView = () => (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10"><h2 className="text-4xl font-black uppercase text-blue-400">Metas</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {usuarios.map(u => {
           const existingMeta = metas.find(m => m.vendedor === u.nome);
           const displayMeta = existingMeta || { meta_salario: 0, meta_premio: 0, meta_qtd: 0 };
           return (
             <div key={u.id} onClick={() => { setModalType('meta'); setEditingItem(existingMeta ? existingMeta : { vendedor: u.nome }); }} className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 hover:border-blue-500 transition-all cursor-pointer shadow-xl">
               <h4 className="text-[14px] font-black uppercase text-blue-400 mb-6">{u.nome}</h4>
               <div className="space-y-4">
                 <div className="flex justify-between text-[10px] font-black uppercase text-gray-500"><span>Meta Salarial</span><span className="text-white">{FORMAT_BRL(displayMeta.meta_salario)}</span></div>
                 <div className="flex justify-between text-[10px] font-black uppercase text-gray-500"><span>Meta Prêmio</span><span className="text-white">{FORMAT_BRL(displayMeta.meta_premio)}</span></div>
                 <div className="flex justify-between text-[10px] font-black uppercase text-gray-500"><span>Quantidade</span><span className="text-white">{displayMeta.meta_qtd}</span></div>
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );

  const ConfiguracoesView = () => (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-10">
      <div className="flex justify-between items-center"><h2 className="text-4xl font-black uppercase text-gray-300 tracking-tighter">Configurações</h2><button onClick={() => { setModalType('empresa'); setEditingItem(null); }} className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-white hover:bg-white/10">Nova Seguradora</button></div>
      <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-xl">
        <h3 className="text-xl font-black uppercase text-blue-500 mb-8">Parceiros Cadastrados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {empresas.map(emp => (
            <div key={emp.id} className="bg-[#0f172a] p-6 rounded-2xl border border-gray-800 flex justify-between items-center group">
              <span className="text-sm font-black uppercase text-white">{emp.nome}</span>
              <button onClick={async () => { if(confirm("Remover seguradora?")) await cloud.apagar('empresas', emp.id!); }} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-trash"></i></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ModalForm = () => {
    const [vf, setVf] = useState<any>(editingItem || {});
    useEffect(() => {
      if ((modalType === 'venda' || modalType === 'indicacao') && !editingItem && user) {
        setVf({ vendedor: user.nome, status: modalType === 'venda' ? 'Fazer Vistoria' : 'NOVA INDICAÇÃO', suhai: false, valor: 0, comissao_cheia: 0, comissao_vendedor: 0, empresa: '', tel: '', cliente: '', veiculo: '', info: '' });
      } else if (editingItem) { setVf(editingItem); }
    }, [modalType, editingItem, user]);
    if (!modalType) return null;
    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        if (modalType === 'venda') await cloud.salvarVenda({ ...vf });
        if (modalType === 'indicacao') await cloud.salvarIndicacao({ ...vf });
        if (modalType === 'usuario') await cloud.salvarUsuario({ ...vf });
        if (modalType === 'empresa') await cloud.salvarEmpresa({ ...vf });
        if (modalType === 'meta') await cloud.salvarMeta({ ...vf });
        setModalType(null);
      } catch (err) { alert("Erro ao salvar dados."); }
    };
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300">
        <div className="bg-[#111827] p-10 rounded-[3.5rem] w-full max-w-xl border border-gray-800 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin">
          <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black uppercase text-white tracking-tighter">Gerenciar {modalType === 'venda' ? 'Produção' : modalType === 'indicacao' ? 'Lead' : modalType}</h3><button onClick={() => setModalType(null)} className="text-gray-500 hover:text-white transition"><i className="fas fa-times text-xl"></i></button></div>
          <form onSubmit={save} className="space-y-6">
            {(modalType === 'usuario' || modalType === 'empresa' || modalType === 'indicacao' || modalType === 'venda') && (
              <div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Nome Completo</label><input value={vf.cliente || vf.nome || ''} onChange={e => setVf({...vf, [modalType === 'usuario' || modalType === 'empresa' ? 'nome' : 'cliente']: e.target.value})} placeholder="NOME" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-blue-500" required /></div>
            )}
            {modalType === 'usuario' && (
              <div className="space-y-4"><input value={vf.login || ''} onChange={e => setVf({...vf, login: e.target.value})} placeholder="LOGIN" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase" required /><input type="password" value={vf.senha || ''} onChange={e => setVf({...vf, senha: e.target.value})} placeholder="SENHA" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none" required /><select value={vf.setor || 'VENDEDOR'} onChange={e => setVf({...vf, setor: e.target.value})} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase"><option value="VENDEDOR">VENDEDOR</option><option value="ADMIN">ADMIN</option></select><input type="number" value={vf.comissao || 0} onChange={e => setVf({...vf, comissao: Number(e.target.value)})} placeholder="COMISSÃO (%)" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none" /></div>
            )}
            {modalType === 'meta' && (
              <div className="space-y-4"><p className="text-xs font-black uppercase text-blue-400">Vendedor: {vf.vendedor}</p><input type="number" value={vf.meta_salario || 0} onChange={e => setVf({...vf, meta_salario: Number(e.target.value)})} placeholder="META SALARIAL (R$)" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none" /><input type="number" value={vf.meta_premio || 0} onChange={e => setVf({...vf, meta_premio: Number(e.target.value)})} placeholder="META PRÊMIO (R$)" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none" /><input type="number" value={vf.meta_qtd || 0} onChange={e => setVf({...vf, meta_qtd: Number(e.target.value)})} placeholder="META QUANTIDADE" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none" /></div>
            )}
            {modalType === 'indicacao' && (
               <div className="space-y-5"><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">WhatsApp / Tel</label><input value={vf.tel || ''} onChange={e => setVf({...vf, tel: e.target.value})} placeholder="(00) 00000-0000" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none focus:border-yellow-500" required /></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Veículo</label><input value={vf.veiculo || ''} onChange={e => setVf({...vf, veiculo: e.target.value})} placeholder="MODELO" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-yellow-500" required /></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Vendedor Atribuído</label><select disabled={!user?.isAdmin} value={vf.vendedor || user?.nome || ''} onChange={e => setVf({...vf, vendedor: e.target.value})} className={`w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase ${!user?.isAdmin ? 'opacity-50 cursor-not-allowed' : 'focus:border-yellow-500'}`}>{usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}</select></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Status do Funil</label><select value={vf.status || 'NOVA INDICAÇÃO'} onChange={e => setVf({...vf, status: e.target.value})} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-yellow-500">{INDICACAO_STATUS_MAP.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Notas Adicionais</label><textarea value={vf.info || ''} onChange={e => setVf({...vf, info: e.target.value})} placeholder="DETALHES..." className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none h-32 uppercase focus:border-yellow-500"></textarea></div><div className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-2xl border border-gray-800"><input type="checkbox" checked={vf.suhai || false} onChange={e => setVf({...vf, suhai: e.target.checked})} className="w-6 h-6 accent-green-500" /><label className="text-xs font-black uppercase text-green-500">Suhai Gold</label></div></div>
            )}
            {modalType === 'venda' && (
              <div className="space-y-5"><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">WhatsApp / Telefone</label><input value={vf.tel || ''} onChange={e => setVf({...vf, tel: e.target.value})} placeholder="(00) 00000-0000" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none focus:border-blue-500" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Vendedor Responsável</label><select disabled={!user?.isAdmin} value={vf.vendedor || user?.nome || ''} onChange={e => setVf({...vf, vendedor: e.target.value})} className={`w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase ${!user?.isAdmin ? 'opacity-50 cursor-not-allowed' : 'focus:border-blue-500'}`}>{usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}</select></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Status da Venda</label><select value={vf.status || 'Fazer Vistoria'} onChange={e => setVf({...vf, status: e.target.value})} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-blue-500">{VENDA_STATUS_MAP.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-500 uppercase ml-2">Companhia Seguradora</label><select value={vf.empresa || ''} onChange={e => setVf({...vf, empresa: e.target.value})} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-blue-500"><option value="">SELECIONE SEGURADORA</option>{empresas.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}</select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase ml-2">Prêmio Líquido (R$)</label><input type="number" step="0.01" value={vf.valor || 0} onChange={e => setVf({...vf, valor: Number(e.target.value)})} placeholder="0,00" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none focus:border-blue-500" /></div><div className="space-y-1"><label className="text-[10px] font-black text-yellow-500 uppercase ml-2">Comissão Cheia (R$)</label><input type="number" step="0.01" value={vf.comissao_cheia || 0} onChange={e => setVf({...vf, comissao_cheia: Number(e.target.value)})} placeholder="0,00" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none focus:border-yellow-500" /></div></div><div className="space-y-1"><label className="text-[10px] font-black text-green-500 uppercase ml-2">Sua Parte / Vendedor (R$)</label><input type="number" step="0.01" value={vf.comissao_vendedor || 0} onChange={e => setVf({...vf, comissao_vendedor: Number(e.target.value)})} placeholder="0,00" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none focus:border-green-500" /></div><div className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-2xl border border-gray-800"><input type="checkbox" checked={vf.suhai || false} onChange={e => setVf({...vf, suhai: e.target.checked})} className="w-6 h-6 accent-green-500" /><label className="text-xs font-black uppercase text-green-500">Marcar como Suhai Gold</label></div></div>
            )}
            <div className="flex gap-4 pt-8"><button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-800 p-6 rounded-[2rem] font-black uppercase text-white hover:bg-gray-700 transition-all">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 p-6 rounded-[2rem] font-black uppercase text-white shadow-xl shadow-blue-600/20 hover:scale-105 transition-all">Salvar Dados</button></div>
          </form>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="bg-[#111827] p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border border-gray-800 text-center animate-in zoom-in-95 duration-700">
          <h1 className="text-4xl font-black mb-1 uppercase tracking-tighter text-white font-mono">VM SEGUROS</h1><p className="text-gray-500 text-[10px] mb-12 uppercase font-black tracking-[0.4em]">Elite Cloud System</p>
          <div className="space-y-5"><input type="text" placeholder="LOGIN" className="w-full p-6 rounded-2xl border border-gray-800 bg-[#0f172a] text-white text-sm font-bold uppercase outline-none focus:border-blue-500" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} /><input type="password" placeholder="SENHA" className="w-full p-6 rounded-2xl border border-gray-800 bg-[#0f172a] text-white text-sm font-bold outline-none focus:border-blue-500" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleLogin()} /><button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-500 p-6 rounded-[2rem] font-black uppercase text-white transition-all shadow-2xl">Acessar CRM</button></div>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user!} onLogout={logout} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="max-w-[1600px] mx-auto h-full p-2">
        {activeSection === 'dashboard' && <Dashboard />}
        {activeSection === 'kanban-indicacoes' && <KanbanIndicacoes />}
        {activeSection === 'kanban-vendas' && <KanbanVendas />}
        {activeSection === 'comissao' && <Financeiro />}
        {activeSection === 'cadastrar-indicacao' && <FormLead />}
        {activeSection === 'vendedores' && <VendedoresView />}
        {activeSection === 'metas' && <MetasView />}
        {activeSection === 'lead-suhai-page' && <LeadSuhaiView />}
        {activeSection === 'performance' && <PerformanceTeamView />}
        {activeSection === 'configuracoes' && <ConfiguracoesView />}
        {activeSection === 'links-uteis' && (
          <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <a href="https://suhai.com.br" target="_blank" className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 flex items-center justify-between hover:border-green-500 transition-all"><span className="font-black uppercase text-white">Suhai Seguradora</span><i className="fas fa-external-link-alt text-gray-600"></i></a>
             <a href="https://vmsolutions.com.br" target="_blank" className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 flex items-center justify-between hover:border-blue-500 transition-all"><span className="font-black uppercase text-white">Portal VM Solutions</span><i className="fas fa-external-link-alt text-gray-600"></i></a>
          </div>
        )}
      </div>
      <ModalForm />
    </Layout>
  );
};

export default App;
