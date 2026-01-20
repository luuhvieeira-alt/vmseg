
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

  // Global Data State
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  // Selection State
  const [selectedVendas, setSelectedVendas] = useState<string[]>([]);
  const [selectedIndicacoes, setSelectedIndicacoes] = useState<string[]>([]);

  // Modals
  const [modalType, setModalType] = useState<'venda' | 'indicacao' | 'usuario' | 'empresa' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'venda' | 'indicacao' } | null>(null);

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
      const found = usuarios.find(u => u.login === uI && u.senha === pI);
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
  };

  const filteredVendas = useMemo(() => {
    let list = user?.isAdmin ? vendas : vendas.filter(v => v.vendedor === user?.nome);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(v => 
        v.cliente.toLowerCase().includes(lower) || 
        v.vendedor.toLowerCase().includes(lower) ||
        v.empresa?.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [vendas, user, searchTerm]);

  const filteredIndicacoes = useMemo(() => {
    let list = user?.isAdmin ? indicacoes : indicacoes.filter(i => i.vendedor === user?.nome);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(i => 
        i.cliente.toLowerCase().includes(lower) || 
        i.veiculo.toLowerCase().includes(lower) ||
        i.vendedor.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [indicacoes, user, searchTerm]);

  // --- Drag and Drop Logic ---
  const onDragStart = (e: React.DragEvent, id: string, type: 'venda' | 'indicacao') => {
    setDraggedItem({ id, type });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, newStatus: string, type: 'venda' | 'indicacao') => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== type) return;
    
    const collection = draggedItem.type === 'venda' ? 'vendas' : 'indicacoes';
    try {
      await cloud.updateStatus(collection, draggedItem.id, newStatus);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
    setDraggedItem(null);
  };

  const toggleSelectVenda = (id: string) => {
    setSelectedVendas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectIndicacao = (id: string) => {
    setSelectedIndicacoes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkDeleteVendas = async () => {
    if (!selectedVendas.length) return;
    if (confirm(`Excluir ${selectedVendas.length} registros?`)) {
      for (const id of selectedVendas) await cloud.apagar('vendas', id);
      setSelectedVendas([]);
    }
  };

  const bulkDeleteIndicacoes = async () => {
    if (!selectedIndicacoes.length) return;
    if (confirm(`Excluir ${selectedIndicacoes.length} leads?`)) {
      for (const id of selectedIndicacoes) await cloud.apagar('indicacoes', id);
      setSelectedIndicacoes([]);
    }
  };

  // --- Views ---

  const Dashboard = () => {
    const today = new Date().setHours(0, 0, 0, 0);
    const vHoje = filteredVendas.filter(v => v.dataCriacao >= today);
    const comissaoHoje = vHoje.reduce((a, b) => a + Number(user?.isAdmin ? (b.comissao_cheia || 0) : (b.comissao_vendedor || 0)), 0);
    const targets = user?.isAdmin ? usuarios : [user!];

    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Cockpit</h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Performance Operacional</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-[#111827] p-8 rounded-[2rem] border border-blue-900/30 shadow-2xl relative overflow-hidden group">
            <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Vendas (Hoje)</p>
            <h2 className="text-6xl font-black text-white">{vHoje.length}</h2>
          </div>
          <div className="bg-[#111827] p-8 rounded-[2rem] border border-green-900/30 shadow-2xl relative overflow-hidden group">
            <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Comissão (Hoje)</p>
            <h2 className="text-6xl font-black text-green-500">{FORMAT_BRL(comissaoHoje)}</h2>
          </div>
          <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 shadow-2xl relative overflow-hidden group">
            <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Leads Ativos</p>
            <h2 className="text-6xl font-black text-white">{filteredIndicacoes.length}</h2>
          </div>
        </div>

        <h2 className="text-xl font-black uppercase mb-8 text-white tracking-tighter border-l-4 border-blue-600 pl-4">Metas do Vendedor</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {targets.map(u => {
            const meta = metas.find(m => m.vendedor === u.nome) || { meta_salario: 1, meta_premio: 1, meta_qtd: 1 };
            const userVendas = vendas.filter(v => v.vendedor === u.nome && v.status === 'Pagamento Efetuado');
            const realC = userVendas.reduce((a, b) => a + Number(b.comissao_vendedor || 0), 0);
            const pC = Math.min((realC / (meta.meta_salario || 1)) * 100, 100);

            return (
              <div key={u.id} className="bg-[#111827] p-8 rounded-3xl border border-gray-800 hover:border-blue-500/30 transition-all">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[12px] font-black uppercase text-blue-400">{u.nome}</h4>
                  <span className="text-[10px] font-bold text-gray-600">{pC.toFixed(0)}%</span>
                </div>
                <div className="bg-[#1e293b] rounded-full h-3 w-full overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-1000" style={{ width: `${pC}%` }}></div>
                </div>
                <div className="mt-4 flex justify-between text-[9px] font-black uppercase text-gray-500">
                  <span>Atual: {FORMAT_BRL(realC)}</span>
                  <span>Meta: {FORMAT_BRL(meta.meta_salario)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const KanbanIndicacoes = () => (
    <div className="animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-yellow-500 tracking-tighter">Leads</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase">Arraste os cartões para mudar o status</p>
        </div>
        <div className="flex gap-4">
          {selectedIndicacoes.length > 0 && (
             <button onClick={bulkDeleteIndicacoes} className="bg-red-600/20 text-red-500 border border-red-600/30 px-6 py-3 rounded-2xl font-black text-[11px] uppercase transition-all hover:bg-red-600 hover:text-white">
                <i className="fas fa-trash-alt mr-2"></i> Excluir ({selectedIndicacoes.length})
             </button>
          )}
          <button onClick={() => { setModalType('indicacao'); setEditingItem(null); }} className="bg-yellow-500 hover:bg-yellow-400 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-black transition-all shadow-lg shadow-yellow-500/20">Novo Lead</button>
        </div>
      </div>
      
      <div className="relative mb-6">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
        <input 
          type="text" 
          placeholder="BUSCAR POR NOME, VEÍCULO OU VENDEDOR..." 
          className="w-full bg-[#111827] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-yellow-500 transition-all uppercase"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 scrollbar-thin">
        {INDICACAO_STATUS_MAP.map(status => (
          <div 
            key={status} 
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status, 'indicacao')}
            className={`kanban-column rounded-[2.5rem] p-5 border flex flex-col transition-all duration-300 ${draggedItem?.type === 'indicacao' ? 'bg-yellow-500/5 border-yellow-500/40 shadow-2xl' : 'bg-[#0f172a] border-gray-800'}`}
          >
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-6 text-center tracking-[0.2em]">{status}</h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              {filteredIndicacoes.filter(i => i.status === status).map(i => (
                <div 
                  key={i.id} 
                  draggable
                  onDragStart={(e) => onDragStart(e, i.id!, 'indicacao')}
                  onClick={() => { setModalType('indicacao'); setEditingItem(i); }} 
                  className="group bg-[#111827] border border-gray-800 p-6 rounded-[2rem] border-l-4 border-l-yellow-500 hover:scale-[1.02] transition-all cursor-grab active:cursor-grabbing shadow-xl relative"
                >
                   <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIndicacoes.includes(i.id!)} onChange={() => toggleSelectIndicacao(i.id!)} className="w-4 h-4 rounded accent-yellow-500" />
                   </div>
                   <div className="absolute top-4 right-4">
                      <div className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={async (e) => { e.stopPropagation(); if(confirm("Deseja excluir este lead?")) await cloud.apagar('indicacoes', i.id!); }}><i className="fas fa-trash"></i></div>
                   </div>
                  <h4 className="text-[12px] font-black uppercase text-white mb-1 mt-4">{i.cliente}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-4">{i.veiculo}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-blue-400 font-black"><i className="fab fa-whatsapp mr-1 text-green-500"></i> {i.tel}</span>
                    {i.suhai && <span className="s-suhai-pulse text-[12px]">S</span>}
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
          <p className="text-[10px] font-bold text-gray-500 uppercase">Movimente livremente entre as colunas</p>
        </div>
        <div className="flex gap-4">
          {selectedVendas.length > 0 && (
             <button onClick={bulkDeleteVendas} className="bg-red-600/20 text-red-500 border border-red-600/30 px-6 py-3 rounded-2xl font-black text-[11px] uppercase transition-all hover:bg-red-600 hover:text-white">
                <i className="fas fa-trash-alt mr-2"></i> Excluir ({selectedVendas.length})
             </button>
          )}
          <button onClick={() => { setModalType('venda'); setEditingItem(null); }} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-white transition-all shadow-lg shadow-blue-500/20">Lançar Venda</button>
        </div>
      </div>

      <div className="relative mb-6">
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
        <input 
          type="text" 
          placeholder="BUSCAR CLIENTE, EMPRESA OU VENDEDOR..." 
          className="w-full bg-[#111827] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all uppercase"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 scrollbar-thin">
        {VENDA_STATUS_MAP.map(status => (
          <div 
            key={status} 
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status, 'venda')}
            className={`kanban-column rounded-[2.5rem] p-5 border flex flex-col transition-all duration-300 ${draggedItem?.type === 'venda' ? 'bg-blue-600/5 border-blue-600/40 shadow-2xl' : 'bg-[#0f172a] border-gray-800'}`}
          >
            <h3 className="text-[10px] font-black uppercase text-gray-500 mb-6 text-center tracking-[0.2em]">{status}</h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              {filteredVendas.filter(v => v.status === status).map(v => (
                <div 
                  key={v.id} 
                  draggable
                  onDragStart={(e) => onDragStart(e, v.id!, 'venda')}
                  onClick={() => { setModalType('venda'); setEditingItem(v); }} 
                  className="group bg-[#111827] border border-gray-800 p-6 rounded-[2rem] border-l-4 border-l-blue-600 hover:scale-[1.02] transition-all cursor-grab active:cursor-grabbing shadow-xl relative"
                >
                  <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedVendas.includes(v.id!)} onChange={() => toggleSelectVenda(v.id!)} className="w-4 h-4 rounded accent-blue-500" />
                   </div>
                   <div className="absolute top-4 right-4">
                      <div className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={async (e) => { e.stopPropagation(); if(confirm("Deseja excluir este registro?")) await cloud.apagar('vendas', v.id!); }}><i className="fas fa-trash"></i></div>
                   </div>
                  <div className="flex justify-between items-start mb-1 mt-4">
                    <h4 className="text-[12px] font-black uppercase text-white leading-tight pr-4">{v.cliente}</h4>
                    {v.suhai && <i className="fas fa-star text-green-500 text-[10px]"></i>}
                  </div>
                  <p className="text-[10px] text-blue-500 font-black mb-1"><i className="fab fa-whatsapp mr-1"></i>{v.tel}</p>
                  <p className="text-[9px] text-gray-500 font-black uppercase mb-4 border-b border-gray-800 pb-2">{v.empresa || 'Sem Empresa'}</p>
                  
                  <div className="bg-[#0f172a] p-4 rounded-2xl mb-4 border border-gray-800 text-center shadow-inner">
                    <p className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest">Prêmio Total</p>
                    <p className="text-[16px] font-black text-white">{FORMAT_BRL(v.valor)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#0f172a] p-3 rounded-xl border border-gray-800 text-center">
                      <p className="text-[7px] font-black text-blue-500 uppercase mb-1">C. Cheia</p>
                      <p className="text-[11px] font-bold text-gray-400">{FORMAT_BRL(v.comissao_cheia)}</p>
                    </div>
                    <div className="bg-green-500/5 p-3 rounded-xl border border-green-500/20 text-center">
                      <p className="text-[7px] font-black text-green-500 uppercase mb-1">C. Vend.</p>
                      <p className="text-[11px] font-bold text-green-400">{FORMAT_BRL(v.comissao_vendedor)}</p>
                    </div>
                  </div>

                  {/* VENDEDOR NA BASE DO CARD */}
                  <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">Vendedor</span>
                    <span className="text-[10px] font-black uppercase text-blue-400">{v.vendedor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const Financeiro = () => {
    const concluido = filteredVendas.filter(v => v.status === 'Pagamento Efetuado');
    const totalComissao = concluido.reduce((a, b) => a + Number(user?.isAdmin ? (b.comissao_cheia || 0) : (b.comissao_vendedor || 0)), 0);
    
    return (
      <div className="animate-in fade-in duration-500">
        <h2 className="text-4xl font-black uppercase text-green-500 mb-10 tracking-tighter">Financeiro</h2>
        <div className="bg-[#111827] p-12 rounded-[3rem] border border-green-900/30 text-center mb-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
          <p className="text-gray-500 text-[11px] font-black uppercase mb-2 tracking-[0.3em]">Total Sua Parte (Vendas Pagas)</p>
          <h2 className="text-7xl font-black text-green-500 tracking-tighter">{FORMAT_BRL(totalComissao)}</h2>
        </div>
        <div className="bg-[#111827] rounded-[2rem] border border-gray-800 overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-gray-400 text-[10px] uppercase font-black">
              <tr>
                <th className="p-6">Data</th>
                <th className="p-6">Cliente</th>
                <th className="p-6">Prêmio</th>
                <th className="p-6">Sua Parte / Vendedor</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold uppercase">
              {concluido.map(v => (
                <tr key={v.id} className="border-b border-gray-800 hover:bg-gray-800/20 transition-colors">
                  <td className="p-6 text-gray-500 font-mono">{new Date(v.dataCriacao).toLocaleDateString()}</td>
                  <td className="p-6 text-white">
                    <div>{v.cliente}</div>
                    <div className="text-[9px] text-gray-500">{v.empresa || 'Empresa não definida'}</div>
                  </td>
                  <td className="p-6 text-gray-400">{FORMAT_BRL(v.valor)}</td>
                  <td className="p-6 font-black">
                    <span className="text-green-500">{FORMAT_BRL(user?.isAdmin ? v.comissao_cheia : v.comissao_vendedor)}</span>
                    <span className="ml-4 text-[10px] text-green-600/60 font-black">({v.vendedor})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const DistribuirLeads = () => {
    const [f, setF] = useState({ cliente: '', tel: '', veiculo: '', vendedor: '', suhai: false, info: '' });
    const send = async (e: React.FormEvent) => {
      e.preventDefault();
      await cloud.salvarIndicacao({ ...f, status: 'NOVA INDICAÇÃO', dataCriacao: Date.now() } as any);
      alert('Lead distribuído com sucesso!');
      setF({ cliente: '', tel: '', veiculo: '', vendedor: '', suhai: false, info: '' });
    };
    return (
      <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
        <div className="bg-[#111827] p-12 rounded-[3rem] border border-gray-800 shadow-2xl">
          <h2 className="text-2xl font-black uppercase text-yellow-500 mb-10 text-center tracking-tighter">Direcionar Oportunidade</h2>
          <form onSubmit={send} className="space-y-5">
            <input value={f.cliente} onChange={e => setF({...f, cliente: e.target.value})} placeholder="NOME DO CLIENTE" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white uppercase font-bold outline-none focus:border-blue-500" required />
            <input value={f.tel} onChange={e => setF({...f, tel: e.target.value})} placeholder="WHATSAPP (DDD + NÚMERO)" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none focus:border-blue-500" required />
            <input value={f.veiculo} onChange={e => setF({...f, veiculo: e.target.value})} placeholder="MODELO DO VEÍCULO" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white uppercase font-bold outline-none focus:border-blue-500" required />
            <select value={f.vendedor} onChange={e => setF({...f, vendedor: e.target.value})} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white uppercase font-bold outline-none" required>
              <option value="">Vendedor Responsável...</option>
              {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
            </select>
            <textarea value={f.info} onChange={e => setF({...f, info: e.target.value})} placeholder="OBSERVAÇÕES ADICIONAIS" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white uppercase font-bold h-32 outline-none"></textarea>
            <div className="flex items-center gap-4 p-5 bg-[#0f172a] border border-gray-800 rounded-2xl">
              <input type="checkbox" checked={f.suhai} onChange={e => setF({...f, suhai: e.target.checked})} className="w-6 h-6 accent-green-500" id="suhai-check" />
              <label htmlFor="suhai-check" className="text-[11px] font-black uppercase text-green-500 cursor-pointer">Marcar como Lead Suhai</label>
            </div>
            <button type="submit" className="w-full bg-yellow-500 p-6 rounded-[2rem] font-black uppercase text-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-yellow-500/20">Distribuir Lead Agora</button>
          </form>
        </div>
      </div>
    );
  };

  const VendedoresView = () => (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black uppercase text-red-500 tracking-tighter">Equipe</h2>
        <button onClick={() => { setModalType('usuario'); setEditingItem(null); }} className="bg-red-600 hover:bg-red-500 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-white transition-all shadow-lg shadow-red-500/20">Novo Usuário</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {usuarios.map(u => (
          <div key={u.id} onClick={() => { setModalType('usuario'); setEditingItem(u); }} className="bg-[#111827] p-8 rounded-[2.5rem] border border-gray-800 border-l-8 border-l-red-600 hover:scale-[1.03] transition-all cursor-pointer shadow-xl relative overflow-hidden">
            <div className="absolute top-4 right-4 text-red-500/20 text-3xl"><i className="fas fa-user-tie"></i></div>
            <h4 className="text-[14px] font-black uppercase text-white mb-2">{u.nome}</h4>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 uppercase font-black">Setor: <span className="text-gray-300">{u.setor}</span></p>
              <p className="text-[10px] text-gray-500 uppercase font-black">Login: <span className="text-gray-300">{u.login}</span></p>
              <div className="mt-4 inline-block bg-red-600/10 text-red-500 px-3 py-1 rounded-lg text-[11px] font-black">{u.comissao}% Comissão</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const MetasView = () => {
    const [sel, setSel] = useState('');
    const [mf, setMf] = useState({ salario: 0, premio: 0, qtd: 0 });
    
    useEffect(() => {
       if (sel) {
          const current = metas.find(m => m.vendedor === sel);
          if (current) setMf({ salario: current.meta_salario, premio: current.meta_premio, qtd: current.meta_qtd });
          else setMf({ salario: 0, premio: 0, qtd: 0 });
       }
    }, [sel, metas]);

    const save = async () => {
       if(!sel) return alert("Selecione um vendedor");
       await cloud.salvarMeta({ vendedor: sel, meta_salario: mf.salario, meta_premio: mf.premio, meta_qtd: mf.qtd });
       alert('Metas atualizadas!');
    };
    return (
      <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-6 duration-500">
        <div className="bg-[#111827] p-12 rounded-[3rem] border border-gray-800 shadow-2xl text-center">
          <i className="fas fa-bullseye text-5xl text-blue-500 mb-8"></i>
          <h2 className="text-3xl font-black uppercase text-white mb-10 tracking-tighter">Gestão de Metas</h2>
          <div className="space-y-6 text-left">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Integrando Performance</label>
            <select value={sel} onChange={e => setSel(e.target.value)} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase">
              <option value="">Escolher colaborador...</option>
              {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
            </select>
            
            <div className="space-y-4">
              <div className="bg-[#0f172a] p-5 rounded-2xl border border-gray-800">
                <label className="text-[10px] font-black text-blue-400 uppercase mb-2 block">Meta Salário / Renda (R$)</label>
                <input type="number" value={mf.salario} placeholder="0,00" onChange={e => setMf({...mf, salario: Number(e.target.value)})} className="w-full bg-transparent border-none text-white text-xl outline-none font-mono" />
              </div>
              <div className="bg-[#0f172a] p-5 rounded-2xl border border-gray-800">
                <label className="text-[10px] font-black text-green-400 uppercase mb-2 block">Meta Prêmio Líquido (R$)</label>
                <input type="number" value={mf.premio} placeholder="0,00" onChange={e => setMf({...mf, premio: Number(e.target.value)})} className="w-full bg-transparent border-none text-white text-xl outline-none font-mono" />
              </div>
              <div className="bg-[#0f172a] p-5 rounded-2xl border border-gray-800">
                <label className="text-[10px] font-black text-yellow-500 uppercase mb-2 block">Meta Quantidade Vendas</label>
                <input type="number" value={mf.qtd} placeholder="0" onChange={e => setMf({...mf, qtd: Number(e.target.value)})} className="w-full bg-transparent border-none text-white text-xl outline-none font-mono" />
              </div>
            </div>

            <button onClick={save} className="w-full bg-blue-600 p-6 rounded-[2rem] font-black uppercase text-white shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all mt-6">Confirmar Objetivos</button>
          </div>
        </div>
      </div>
    );
  };

  const LeadSuhaiView = () => {
    // FILTRO RIGOROSO: Apenas Suhai E status Pagamento Efetuado
    const suhaiRecords = filteredVendas.filter(v => v.suhai && v.status === 'Pagamento Efetuado');
    const totalComissao = suhaiRecords.reduce((acc, v) => acc + (user?.isAdmin ? v.comissao_cheia : v.comissao_vendedor), 0);
    const totalPremio = suhaiRecords.reduce((acc, v) => acc + v.valor, 0);

    return (
      <div className="animate-in fade-in duration-500">
        <h2 className="text-4xl font-black uppercase text-green-500 mb-10 tracking-tighter">Suhai Gold - Pagos</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
           <div className="bg-[#111827] p-8 rounded-[2rem] border border-green-500/30 shadow-2xl relative overflow-hidden group">
              <p className="text-gray-500 text-[10px] font-black uppercase mb-1 tracking-widest">Total Comissão (Pagos Suhai)</p>
              <h2 className="text-5xl font-black text-green-500 tracking-tighter">{FORMAT_BRL(totalComissao)}</h2>
           </div>
           <div className="bg-[#111827] p-8 rounded-[2rem] border border-blue-500/30 shadow-2xl relative overflow-hidden group">
              <p className="text-gray-500 text-[10px] font-black uppercase mb-1 tracking-widest">Prêmio Líquido Total</p>
              <h2 className="text-5xl font-black text-blue-500 tracking-tighter">{FORMAT_BRL(totalPremio)}</h2>
           </div>
        </div>

        <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0f172a] text-gray-400 text-[10px] uppercase font-black">
                   <tr>
                      <th className="p-6 border-b border-gray-800">Vendedor</th>
                      <th className="p-6 border-b border-gray-800">Cliente</th>
                      <th className="p-6 border-b border-gray-800">Prêmio</th>
                      <th className="p-6 border-b border-gray-800">Sua Parte</th>
                      <th className="p-6 border-b border-gray-800 text-center">Status</th>
                   </tr>
                </thead>
                <tbody className="text-xs font-bold uppercase">
                   {suhaiRecords.map(v => (
                      <tr key={v.id} className="border-b border-gray-800 hover:bg-gray-800/20 transition-all group">
                         <td className="p-6">
                            <span className="bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-full text-[9px] font-black border border-blue-500/20">
                               {v.vendedor}
                            </span>
                         </td>
                         <td className="p-6">
                            <div className="text-white text-sm font-black mb-1">{v.cliente}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{v.tel}</div>
                         </td>
                         <td className="p-6 text-gray-400 font-mono">{FORMAT_BRL(v.valor)}</td>
                         <td className="p-6 font-black text-green-500 font-mono text-sm">{FORMAT_BRL(user?.isAdmin ? v.comissao_cheia : v.comissao_vendedor)}</td>
                         <td className="p-6">
                            <div className="flex justify-center">
                               <span className="text-[9px] font-black uppercase px-4 py-1.5 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">PAGO</span>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  };

  const ModalForm = () => {
    const [vf, setVf] = useState<any>(editingItem || {});
    
    useEffect(() => {
      if (modalType === 'venda' && !editingItem && user) {
        setVf({ vendedor: user.nome, status: 'Fazer Vistoria', suhai: false, valor: 0, comissao_cheia: 0, comissao_vendedor: 0, empresa: '' });
      }
    }, [modalType, editingItem, user]);

    if (!modalType) return null;

    const save = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        if (modalType === 'venda') await cloud.salvarVenda({ ...vf, dataCriacao: vf.dataCriacao || Date.now() });
        if (modalType === 'indicacao') await cloud.salvarIndicacao({ ...vf, dataCriacao: vf.dataCriacao || Date.now() });
        if (modalType === 'usuario') await cloud.salvarUsuario({ ...vf });
        if (modalType === 'empresa') await cloud.salvarEmpresa({ ...vf });
        setModalType(null);
      } catch (err) { alert("Erro ao salvar."); }
    };

    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300">
        <div className="bg-[#111827] p-10 rounded-[3.5rem] w-full max-w-xl border border-gray-800 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Gerenciar {modalType}</h3>
            <button onClick={() => setModalType(null)} className="text-gray-500 hover:text-white transition"><i className="fas fa-times text-xl"></i></button>
          </div>
          
          <form onSubmit={save} className="space-y-6">
            <div className="space-y-4">
               <input value={vf.cliente || vf.nome || ''} onChange={e => setVf({...vf, [modalType === 'usuario' || modalType === 'empresa' ? 'nome' : 'cliente']: e.target.value})} placeholder="NOME COMPLETO" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none uppercase focus:border-blue-500" required />
               {(modalType === 'venda' || modalType === 'indicacao') && (
                 <>
                  <input value={vf.tel || ''} onChange={e => setVf({...vf, tel: e.target.value})} placeholder="WHATSAPP / CELULAR" className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold outline-none" required />
                  {modalType === 'venda' && (
                    <select value={vf.empresa || ''} onChange={e => setVf({...vf, empresa: e.target.value})} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold uppercase outline-none focus:border-blue-500" required>
                       <option value="">Selecionar Seguradora...</option>
                       {empresas.map(emp => <option key={emp.id} value={emp.nome}>{emp.nome}</option>)}
                    </select>
                  )}
                 </>
               )}
            </div>

            {modalType === 'venda' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input type="number" step="0.01" value={vf.valor || ''} onChange={e => setVf({...vf, valor: Number(e.target.value)})} placeholder="PRÊMIO TOTAL (R$)" className="p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-mono outline-none" required />
                   <input type="number" step="0.01" value={vf.comissao_cheia || ''} onChange={e => setVf({...vf, comissao_cheia: Number(e.target.value)})} placeholder="COMISSÃO TOTAL (R$)" className="p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-mono outline-none" required />
                   <input type="number" step="0.01" value={vf.comissao_vendedor || ''} onChange={e => setVf({...vf, comissao_vendedor: Number(e.target.value)})} placeholder=" SUA PARTE (R$)" className="p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-mono outline-none" required />
                   <select value={vf.status || 'Fazer Vistoria'} onChange={e => setVf({...vf, status: e.target.value})} className="p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold uppercase outline-none">
                      {VENDA_STATUS_MAP.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div className="flex items-center gap-4 p-5 bg-[#0f172a] border border-gray-800 rounded-2xl">
                  <input type="checkbox" checked={vf.suhai || false} onChange={e => setVf({...vf, suhai: e.target.checked})} className="w-6 h-6 accent-green-500" id="m-suhai" />
                  <label htmlFor="m-suhai" className="text-[10px] font-black uppercase text-green-500">Parceria Suhai Gold</label>
                </div>
                <select value={vf.vendedor || ''} onChange={e => setVf({...vf, vendedor: e.target.value})} disabled={!user?.isAdmin} className="w-full p-5 bg-[#0f172a] border border-gray-800 rounded-2xl text-white font-bold uppercase outline-none" required>
                  <option value="">Vendedor...</option>
                  {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-4 pt-8">
              <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-gray-800 p-6 rounded-[2rem] font-black uppercase text-white hover:bg-gray-700 transition-all">Cancelar</button>
              <button type="submit" className="flex-1 bg-blue-600 p-6 rounded-[2rem] font-black uppercase text-white shadow-xl shadow-blue-600/20 hover:scale-105 transition-all">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="bg-[#111827]/80 backdrop-blur-xl p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border border-gray-800 text-center animate-in zoom-in-95 duration-700">
          <h1 className="text-4xl font-black mb-1 uppercase tracking-tighter text-white font-mono">VM SEGUROS</h1>
          <p className="text-gray-500 text-[10px] mb-12 uppercase font-black tracking-[0.4em]">Elite Cloud CRM</p>
          <div className="space-y-5">
            <input type="text" placeholder="LOGIN" className="w-full p-6 rounded-2xl border border-gray-800 bg-[#0f172a] text-white text-sm font-bold uppercase outline-none focus:border-blue-500" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="SENHA" className="w-full p-6 rounded-2xl border border-gray-800 bg-[#0f172a] text-white text-sm font-bold outline-none focus:border-blue-500" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-500 p-6 rounded-[2rem] font-black uppercase transition-all shadow-2xl shadow-blue-600/30 text-white active:scale-95">Autenticar</button>
          </div>
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
        {activeSection === 'cadastrar-indicacao' && <DistribuirLeads />}
        {activeSection === 'vendedores' && <VendedoresView />}
        {activeSection === 'metas' && <MetasView />}
        {activeSection === 'lead-suhai-page' && <LeadSuhaiView />}
        {activeSection === 'configuracoes' && (
          <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-black uppercase text-gray-300">Ajustes</h2>
              <button onClick={() => { setModalType('empresa'); setEditingItem(null); }} className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl font-black text-[11px] uppercase text-white hover:bg-white/10">Nova Seguradora</button>
            </div>
            <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800">
              <h3 className="text-xl font-black uppercase text-blue-500 mb-8 tracking-tighter">Empresas Parceiras</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {empresas.map(emp => (
                  <div key={emp.id} className="bg-[#0f172a] p-6 rounded-2xl border border-gray-800 flex justify-between items-center group">
                    <span className="text-sm font-black uppercase text-white">{emp.nome}</span>
                    <button onClick={async () => { if(confirm("Remover?")) await cloud.apagar('empresas', emp.id!); }} className="text-red-500 opacity-0 group-hover:opacity-100"><i className="fas fa-trash"></i></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <ModalForm />
    </Layout>
  );
};

export default App;
