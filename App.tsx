
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

// --- VIEW DASHBOARD ---
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
    
    const baseVendas = (user?.isAdmin || user?.setor === 'RH') ? vendas : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
    
    const hojeVendas = baseVendas.filter(v => v.dataCriacao >= startOfDay.getTime());
    const mesVendasTotal = baseVendas.filter(v => v.dataCriacao >= startOfMonth);
    const mesVendasPagas = mesVendasTotal.filter(v => v.status === 'Pagamento Efetuado');
    
    const vHojeCount = hojeVendas.length;
    const pHojeTotal = hojeVendas.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const vMesTotal = mesVendasTotal.length;
    const pMesPagoTotal = mesVendasPagas.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    
    const mesVendasPerformance = mesVendasTotal.filter(v => ['Mandar Boletos', 'Falta Pagamento', 'Pagamento Efetuado'].includes(v.status));
    const prodMesCount = mesVendasPerformance.length;
    const prodMesPremio = mesVendasPerformance.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const prodMesComissao = mesVendasPerformance.reduce((acc, v) => acc + Number((user?.isAdmin || user?.setor === 'RH') ? (v.comissao_cheia || 0) : (v.comissao_vendedor || 0)), 0);

    const cMeta = metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS') || { meta_qtd: 270, meta_premio: 250000, meta_salario: 50000 };
    const uMeta = metas.find(m => (m.vendedor || '').toUpperCase() === uNome) || { meta_qtd: 1, meta_premio: 1, meta_salario: 1 };

    const funilVendas = VENDA_STATUS_MAP.map(status => {
      const count = mesVendasTotal.filter(v => v.status === status).length;
      const total = mesVendasTotal.length || 1;
      return { status, count, pct: Math.round((count / total) * 100) };
    });

    const filteredLeads = indicacoes.filter(i => ((user?.isAdmin || user?.setor === 'RH') ? true : (i.vendedor || '').trim().toUpperCase() === uNome));
    const funilLeads = INDICACAO_STATUS_MAP.map(status => {
      const count = filteredLeads.filter(i => i.status === status).length;
      const total = filteredLeads.length || 1;
      return { status, count, pct: Math.round((count / total) * 100) };
    });

    return { vHojeCount, pHojeTotal, vMesTotal, pMesPagoTotal, prodMesCount, prodMesPremio, prodMesComissao, cMeta, uMeta, funilVendas, funilLeads };
  }, [vendas, indicacoes, metas, user]);

  const metaRef = (user?.isAdmin || user?.setor === 'RH') ? stats.cMeta : stats.uMeta;
  const sPct = Math.min(Math.round((stats.prodMesCount / (metaRef.meta_qtd || 1)) * 100), 100);
  const pPct = Math.min(Math.round((stats.prodMesPremio / (metaRef.meta_premio || 1)) * 100), 100);
  const cPct = Math.min(Math.round((stats.prodMesComissao / (metaRef.meta_salario || 1)) * 100), 100);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <h2 className="text-4xl font-black uppercase text-white tracking-tighter">VOCÊ SÓ VENCE AMANHÃ SE NÃO DESISTIR HOJE!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111827] p-8 rounded-[2rem] border-l-4 border-l-blue-500 shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">VENDAS (HOJE)</p>
          <h3 className="text-6xl font-black text-white">{stats.vHojeCount}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">LANÇAMENTOS DO DIA</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[2rem] border-l-4 border-l-green-500 shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">PRÊMIO LÍQUIDO (HOJE)</p>
          <h3 className="text-4xl font-black text-green-500 font-mono">{FORMAT_BRL(stats.pHojeTotal)}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">TOTAL PRODUZIDO HOJE</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[2rem] border-l-4 border-l-yellow-600 shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">VENDAS (NO MÊS)</p>
          <h3 className="text-6xl font-black text-white">{stats.vMesTotal}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">TOTAL ACUMULADO MÊS</p>
        </div>
        <div className="bg-[#111827] p-8 rounded-[2rem] border-l-4 border-l-white shadow-xl">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-3">PRÊMIO LÍQUIDO (NO MÊS)</p>
          <h3 className="text-4xl font-black text-white font-mono">{FORMAT_BRL(stats.pMesPagoTotal)}</h3>
          <p className="text-gray-600 text-[8px] font-bold mt-2 uppercase">APENAS PAGAMENTOS CONFIRMADOS</p>
        </div>
      </div>

      <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-2xl relative overflow-hidden">
        <h3 className="text-xl font-black uppercase text-white mb-10 flex items-center gap-3">
          <i className="fas fa-chart-line text-purple-500"></i> PERFORMANCE CONSOLIDADA (VM SEGUROS)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-center">
          <div className="space-y-3">
            <p className="text-[9px] font-black text-gray-500 uppercase">VENDAS TOTAIS EMPRESA</p>
            <h4 className="text-2xl font-black text-white">{stats.prodMesCount} <span className="text-gray-600">/ {metaRef.meta_qtd}</span></h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full" style={{ width: `${sPct}%` }}></div></div>
            <p className="text-right text-[10px] font-black text-purple-500">{sPct}%</p>
          </div>
          <div className="space-y-3">
            <p className="text-[9px] font-black text-gray-500 uppercase">PRÊMIO BRUTO ACUMULADO</p>
            <h4 className="text-2xl font-black text-white">{FORMAT_BRL(stats.prodMesPremio)}</h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full" style={{ width: `${pPct}%` }}></div></div>
            <div className="flex justify-between"><span className="text-[8px] font-black text-gray-600 uppercase">META: {FORMAT_BRL(metaRef.meta_premio)}</span><span className="text-[10px] font-black text-green-500">{pPct}%</span></div>
          </div>
          <div className="space-y-3">
            <p className="text-[9px] font-black text-gray-500 uppercase">COMISSÃO BRUTA EMPRESA</p>
            <h4 className="text-2xl font-black text-white">{FORMAT_BRL(stats.prodMesComissao)}</h4>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-yellow-500 h-full" style={{ width: `${cPct}%` }}></div></div>
            <div className="flex justify-between"><span className="text-[8px] font-black text-gray-600 uppercase">META: {FORMAT_BRL(metaRef.meta_salario)}</span><span className="text-[10px] font-black text-yellow-500">{cPct}%</span></div>
          </div>
          <div className="flex justify-end pr-6 opacity-20"><i className="fas fa-building text-gray-400 text-7xl"></i></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800">
          <h3 className="text-xs font-black uppercase text-white mb-8 flex items-center gap-2"><i className="fas fa-filter text-blue-500"></i> FUNIL DE PRODUÇÃO</h3>
          <div className="space-y-6">
            {stats.funilVendas.map(f => (
              <div key={f.status} className="space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-gray-500">{f.status}</span><span className="text-white">{f.count} ({f.pct}%)</span></div>
                <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-blue-600 h-full" style={{ width: `${f.pct}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800">
          <h3 className="text-xs font-black uppercase text-white mb-8 flex items-center gap-2"><i className="fas fa-bolt text-yellow-500"></i> STATUS DOS LEADS</h3>
          <div className="space-y-6">
            {stats.funilLeads.map(f => (
              <div key={f.status} className="space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-gray-500">{f.status}</span><span className="text-white">{f.count} ({f.pct}%)</span></div>
                <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden"><div className="bg-yellow-500 h-full" style={{ width: `${f.pct}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- VIEW FINANCEIRO ---
const FinanceiroView: React.FC<{ vendas: Venda[], user: AuthUser | null }> = ({ vendas, user }) => {
  const filtered = useMemo(() => {
    const uNome = (user?.nome || '').trim().toUpperCase();
    const list = (user?.isAdmin || user?.setor === 'RH') ? vendas : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
    return list.filter(v => v.status === 'Pagamento Efetuado');
  }, [vendas, user]);

  const totalComissao = useMemo(() => filtered.reduce((acc, v) => acc + Number((user?.isAdmin || user?.setor === 'RH') ? (v.comissao_cheia || 0) : (v.comissao_vendedor || 0)), 0), [filtered, user]);
  const totalPremio = useMemo(() => filtered.reduce((acc, v) => acc + Number(v.valor || 0), 0), [filtered]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black uppercase text-[#10b981] tracking-tighter">FINANCEIRO</h2>
        <button onClick={() => window.print()} className="bg-[#10b981] text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 no-print shadow-lg hover:scale-105 transition-all">
          <i className="fas fa-file-pdf"></i> BAIXAR PRODUÇÃO
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#111827] p-12 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-[#10b981] shadow-2xl flex flex-col items-center justify-center">
          <p className="text-gray-500 text-[9px] font-black uppercase mb-4 tracking-widest">COMISSÃO ACUMULADA (PAGOS)</p>
          <h3 className="text-6xl font-black text-[#10b981] font-mono">{FORMAT_BRL(totalComissao)}</h3>
        </div>
        <div className="bg-[#111827] p-12 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-[#3b82f6] shadow-2xl flex flex-col items-center justify-center">
          <p className="text-gray-500 text-[9px] font-black uppercase mb-4 tracking-widest">PRÊMIO TOTAL PRODUZIDO</p>
          <h3 className="text-6xl font-black text-[#3b82f6] font-mono">{FORMAT_BRL(totalPremio)}</h3>
        </div>
      </div>
      <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl" id="financeiro-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="px-8 py-6 border-b border-gray-800">VENDEDOR</th>
                <th className="px-8 py-6 border-b border-gray-800">CLIENTE</th>
                <th className="px-8 py-6 border-b border-gray-800">PRÊMIO</th>
                <th className="px-8 py-6 border-b border-gray-800">COMISSÃO</th>
                <th className="px-8 py-6 border-b border-gray-800 text-right">DATA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6 text-blue-400 font-black text-[10px] uppercase">{(v.vendedor || '').toUpperCase()}</td>
                  <td className="px-8 py-6 text-white font-black text-[11px] uppercase">{v.cliente}</td>
                  <td className="px-8 py-6 text-gray-400 font-mono text-xs">{FORMAT_BRL(v.valor)}</td>
                  <td className="px-8 py-6 text-[#10b981] font-black font-mono text-xs">{FORMAT_BRL((user?.isAdmin || user?.setor === 'RH') ? v.comissao_cheia : v.comissao_vendedor)}</td>
                  <td className="px-8 py-6 text-right text-gray-500 font-mono text-[10px]">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- VIEW PERFORMANCE ---
const PerformanceView: React.FC<{ vendas: Venda[], usuarios: User[] }> = ({ vendas, usuarios }) => {
  const stats = useMemo(() => {
    const sellers = usuarios.filter(u => (u.setor || '') === 'VENDEDOR');
    const insurers = ["PORTO SEGURO", "ITURAN", "SUHAI SEGURADORA", "ALLIANZ", "TOKIO MARINE"];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const mesVendas = vendas.filter(v => v.dataCriacao >= startOfMonth && ['Mandar Boletos', 'Falta Pagamento', 'Pagamento Efetuado'].includes(v.status));

    const globalInsurers = insurers.map(name => ({ name, count: mesVendas.filter(v => (v.empresa || '').toUpperCase() === name).length }));
    const sellerData = sellers.map(u => {
      const uNome = (u.nome || '').trim().toUpperCase();
      const uMesVendas = mesVendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
      const insurersBreak = insurers.map(name => ({ name, count: uMesVendas.filter(v => (v.empresa || '').toUpperCase() === name).length }));
      return { nome: u.nome, total: uMesVendas.length, insurers: insurersBreak, comissao: uMesVendas.reduce((acc, v) => acc + Number(v.comissao_vendedor || 0), 0), premio: uMesVendas.reduce((acc, v) => acc + Number(v.valor || 0), 0) };
    }).sort((a, b) => b.total - a.total);

    return { globalInsurers, sellerData };
  }, [vendas, usuarios]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <h2 className="text-4xl font-black uppercase text-[#a855f7] tracking-tighter">PERFORMANCE TEAM</h2>
      <div className="bg-[#111827] p-10 rounded-[3rem] border border-gray-800 shadow-2xl">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3"><i className="fas fa-building text-purple-500"></i> PRODUÇÃO GLOBAL POR SEGURADORA (MÊS)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {stats.globalInsurers.map(ins => (
            <div key={ins.name} className="bg-[#0b0f1a] p-6 rounded-[2rem] border border-gray-800 text-center shadow-inner">
              <p className="text-[8px] font-black text-gray-600 uppercase mb-2">{ins.name}</p>
              <h4 className="text-4xl font-black text-white mb-1">{ins.count}</h4>
              <p className="text-[7px] font-bold text-purple-500 uppercase tracking-widest">APÓLICES EM PRODUÇÃO</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {stats.sellerData.map(s => (
          <div key={s.nome} className="bg-[#111827] rounded-[3rem] border border-gray-800 p-8 shadow-2xl relative group">
            <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 text-center">{s.nome}</h4>
            <div className="bg-[#0b0f1a] p-8 rounded-[2.5rem] text-center border border-gray-800 mb-10">
              <p className="text-[8px] font-black text-gray-600 uppercase mb-2 tracking-widest">PRODUÇÃO REAL (MÊS)</p>
              <h5 className="text-7xl font-black text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">{s.total}</h5>
            </div>
            <div className="space-y-4 mb-10 px-4">
              <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800 pb-2">QUEBRA POR EMPRESA</p>
              {s.insurers.map(ins => (
                <div key={ins.name} className="flex justify-between items-center px-2">
                  <span className="text-[9px] font-black text-gray-500 uppercase">{ins.name}</span>
                  <span className="text-xs font-black text-white">{ins.count}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 px-2">
               <div className="bg-[#0b0f1a] p-4 rounded-2xl border border-gray-800 text-center"><p className="text-[7px] font-black text-green-500 uppercase mb-1">C. PRODUZIDA</p><p className="text-[10px] font-black text-white font-mono">{FORMAT_BRL(s.comissao)}</p></div>
               <div className="bg-[#0b0f1a] p-4 rounded-2xl border border-gray-800 text-center"><p className="text-[7px] font-black text-blue-500 uppercase mb-1">PRÊMIO PRODUZIDO</p><p className="text-[10px] font-black text-white font-mono">{FORMAT_BRL(s.premio)}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- VIEW CANCELAMENTOS ---
const CancelamentosView: React.FC<{ 
  cancelamentos: Cancelamento[], 
  user: AuthUser | null,
  onAdd: () => void,
  onDelete: (id: string) => void
}> = ({ cancelamentos, user, onAdd, onDelete }) => {
  const filtered = useMemo(() => {
    if (user?.isAdmin || user?.setor === 'RH') return cancelamentos;
    const uNome = (user?.nome || '').trim().toUpperCase();
    return cancelamentos.filter(c => (c.vendedor || '').trim().toUpperCase() === uNome);
  }, [cancelamentos, user]);

  const totalCancelado = useMemo(() => filtered.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0), [filtered]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black uppercase text-red-500 tracking-tighter">CANCELAMENTOS</h2>
        <button onClick={onAdd} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-red-900/20 hover:scale-105 transition-all">
          <i className="fas fa-plus-circle mr-2"></i> NOVO CANCELAMENTO
        </button>
      </div>

      <div className="bg-[#111827] p-12 rounded-[2.5rem] border border-red-500/30 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        <p className="text-gray-500 text-[9px] font-black uppercase mb-4 tracking-widest">TOTAL COMISSÃO CANCELADA</p>
        <h3 className="text-7xl font-black text-red-500 font-mono tracking-tighter">{FORMAT_BRL(totalCancelado)}</h3>
      </div>

      <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="px-8 py-6 border-b border-gray-800">VENDEDOR</th>
                <th className="px-8 py-6 border-b border-gray-800">CLIENTE</th>
                <th className="px-8 py-6 border-b border-gray-800">EMPRESA</th>
                <th className="px-8 py-6 border-b border-gray-800">COMISSÃO PERDIDA</th>
                <th className="px-8 py-6 border-b border-gray-800">DATA</th>
                <th className="px-8 py-6 border-b border-gray-800 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6 text-red-400 font-black text-[10px] uppercase">{(c.vendedor || '').toUpperCase()}</td>
                  <td className="px-8 py-6 text-white font-black text-[11px] uppercase">{c.cliente}</td>
                  <td className="px-8 py-6 text-gray-500 font-bold text-[10px] uppercase">{c.empresa}</td>
                  <td className="px-8 py-6 text-red-500 font-black font-mono text-xs">{FORMAT_BRL(c.valor_comissao)}</td>
                  <td className="px-8 py-6 text-gray-500 font-mono text-[10px]">{new Date(c.dataCriacao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => { if(window.confirm('Excluir registro?')) onDelete(c.id!) }} className="text-gray-600 hover:text-red-500 transition-all p-2">
                      <i className="fas fa-trash"></i>
                    </button>
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

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const uNome = (user?.nome || '').trim().toUpperCase();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('TODOS');
  const [dateFilterVendas, setDateFilterVendas] = useState('');

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cancelamentos, setCancelamentos] = useState<Cancelamento[]>([]);

  const [modalType, setModalType] = useState<'venda' | 'indicacao' | 'usuario' | 'empresa' | 'meta' | 'cancelamento' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form de RH com independência (flag origem: 'RH')
  const [emissaoForm, setEmissaoForm] = useState<any>({ 
    cliente: '', tel: '', empresa: '', vendedor: '', status: 'Pagamento Efetuado', valor: 0, porcentagem_vendida: 0, comissao_cheia: 0, comissao_vendedor: 0, origem: 'RH' 
  });

  useEffect(() => {
    const unsubVendas = cloud.subscribeVendas(setVendas);
    const unsubUsers = cloud.subscribeUsuarios(setUsuarios);
    const unsubMetas = cloud.subscribeMetas(setMetas);
    const unsubIndicacoes = cloud.subscribeIndicacoes(setIndicacoes);
    const unsubEmpresas = cloud.subscribeEmpresas(setEmpresas);
    const unsubCancelamentos = cloud.subscribeCancelamentos(setCancelamentos);
    return () => { unsubVendas(); unsubUsers(); unsubMetas(); unsubIndicacoes(); unsubEmpresas(); unsubCancelamentos(); };
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
    if (nextIdx >= 0 && nextIdx < VENDA_STATUS_MAP.length) {
      await cloud.salvarVenda({ ...v, status: VENDA_STATUS_MAP[nextIdx] });
    }
  };

  const moveIndicacao = async (i: Indicacao, dir: 'left' | 'right') => {
    const idx = INDICACAO_STATUS_MAP.indexOf(i.status);
    const nextIdx = dir === 'left' ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < INDICACAO_STATUS_MAP.length) await cloud.updateStatus('indicacoes', i.id!, INDICACAO_STATUS_MAP[nextIdx]);
  };

  const filteredVendas = useMemo(() => {
    let list = (user?.isAdmin || user?.setor === 'RH') ? vendas : vendas.filter(v => (v.vendedor || '').trim().toUpperCase() === uNome);
    list = list.filter(v => (v as any).origem !== 'RH'); 
    
    if (user?.isAdmin && salesmanFilter !== 'TODOS') list = list.filter(v => (v.vendedor || '').trim().toUpperCase() === salesmanFilter.trim().toUpperCase());
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      list = list.filter(v => (v.cliente || '').toLowerCase().includes(low) || (v.vendedor || '').toLowerCase().includes(low));
    }
    if (dateFilterVendas) {
        list = list.filter(v => {
            const d = new Date(v.dataCriacao);
            return d.toISOString().split('T')[0] === dateFilterVendas;
        });
    }
    return list;
  }, [vendas, user, uNome, searchTerm, salesmanFilter, dateFilterVendas]);

  const filteredIndicacoes = useMemo(() => {
    let list = (user?.isAdmin || user?.setor === 'RH') ? indicacoes : indicacoes.filter(i => (i.vendedor || '').trim().toUpperCase() === uNome);
    if (user?.isAdmin && salesmanFilter !== 'TODOS') list = list.filter(i => (i.vendedor || '').trim().toUpperCase() === salesmanFilter.trim().toUpperCase());
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      list = list.filter(i => (i.cliente || '').toLowerCase().includes(low) || (i.vendedor || '').toLowerCase().includes(low));
    }
    return list;
  }, [indicacoes, user, uNome, searchTerm, salesmanFilter]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6">
        <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-white tracking-tighter">VM SEGUROS</h1>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2">Cloud CRM Elite</p>
        </div>
        
        <div className="bg-[#111827] w-full max-w-[320px] p-10 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-6 animate-in zoom-in duration-300">
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-600 uppercase ml-2">Acesso</label>
                <input 
                  className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none focus:border-blue-500 transition-all" 
                  placeholder="Seu login" 
                  value={loginForm.username} 
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-600 uppercase ml-2">Senha</label>
                <input 
                  type="password" 
                  className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-xs outline-none focus:border-blue-500 transition-all" 
                  placeholder="••••••••" 
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                />
            </div>
          </div>
          <button 
            onClick={handleLogin} 
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-blue-900/20 active:scale-95 transition-all hover:bg-blue-500"
          >
            Entrar no Sistema
          </button>
        </div>
        
        <p className="mt-8 text-[9px] font-bold text-gray-700 uppercase tracking-widest">&copy; 2024 VM Seguros Cloud</p>
      </div>
    );
  }

  return (
    <Layout user={user!} onLogout={() => { setIsAuthenticated(false); setUser(null); }} activeSection={activeSection} setActiveSection={setActiveSection}>
      {activeSection === 'dashboard' && <DashboardView vendas={vendas} indicacoes={indicacoes} metas={metas} user={user} />}
      {activeSection === 'comissao' && <FinanceiroView vendas={vendas} user={user} />}
      {activeSection === 'performance' && <PerformanceView vendas={vendas} usuarios={usuarios} />}
      {activeSection === 'cancelamentos' && <CancelamentosView cancelamentos={cancelamentos} user={user} onAdd={() => { setEditingItem({ cliente: '', empresa: '', vendedor: '', valor_comissao: 0 }); setModalType('cancelamento'); }} onDelete={(id) => cloud.apagar('cancelamentos', id)} />}
      
      {activeSection === 'vendedores' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-black uppercase text-red-500 tracking-tighter">EQUIPE</h2>
            <button onClick={() => { setEditingItem({ setor: 'VENDEDOR', comissao: 30 }); setModalType('usuario'); }} className="bg-red-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-red-900/20 hover:scale-105 transition-all">NOVO USUÁRIO</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {usuarios.map(u => (
              <div key={u.id} className="bg-[#111827] rounded-[2.5rem] p-10 border border-gray-800 relative group overflow-hidden transition-all hover:border-red-500/20 shadow-xl">
                <button onClick={() => { setEditingItem(u); setModalType('usuario'); }} className="absolute top-10 right-10 text-gray-600 hover:text-white transition-all"><i className="fas fa-edit text-xs"></i></button>
                <h3 className="text-2xl font-black uppercase text-white tracking-tighter">{u.nome}</h3>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">SETOR: {u.setor}</p>
                
                <div className="mt-12 flex justify-center">
                  <div className="bg-[#1e1414] text-red-500 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-900/20">
                    {u.comissao}% COMISSÃO
                  </div>
                </div>

                <button onClick={() => { if(window.confirm('Excluir usuário?')) cloud.apagar('usuarios', u.id!) }} className="absolute bottom-10 right-10 text-red-500/10 hover:text-red-500 transition-all"><i className="fas fa-trash-alt"></i></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'kanban-vendas' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex justify-between items-center">
             <h2 className="text-4xl font-black uppercase text-blue-500 tracking-tighter">PRODUÇÃO</h2>
             <div className="flex items-center gap-4">
               <div className="no-print"><input type="date" className="bg-[#111827] border border-gray-800 rounded-lg p-3 text-[10px] font-black uppercase text-gray-400 outline-none" value={dateFilterVendas} onChange={e => setDateFilterVendas(e.target.value)} /></div>
               <button onClick={() => { setEditingItem({ status: 'Fazer Vistoria', suhai: false, vendedor: uNome, valor: 0, comissao_cheia: 0, comissao_vendedor: 0 }); setModalType('venda'); }} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-xl hover:scale-105 transition-all">LANÇAR VENDA</button>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4 mb-8">
              <input type="text" placeholder="PESQUISAR PRODUÇÃO..." className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <select className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 outline-none" value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}>
                <option value="TODOS">TODOS VENDEDORES</option>
                {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome.toUpperCase()}>{u.nome.toUpperCase()}</option>)}
              </select>
           </div>
           <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-280px)]">
              {VENDA_STATUS_MAP.map(status => (
                <div key={status} className="kanban-column flex flex-col w-[350px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/50 p-4">
                  <h3 className="text-[10px] font-black uppercase text-gray-500 text-center mb-6 py-4 border-b border-gray-800/30 tracking-widest">{status}</h3>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                    {filteredVendas.filter(v => v.status === status).map(v => (
                      <div key={v.id} className="bg-[#111827] rounded-[2rem] p-8 border border-blue-900/20 shadow-xl relative group">
                        <input type="checkbox" className="absolute top-8 left-8 w-5 h-5" />
                        <button onClick={() => { setEditingItem(v); setModalType('venda'); }} className="absolute top-8 right-8 text-gray-600 hover:text-white transition"><i className="fas fa-edit text-xs"></i></button>
                        <div className="pl-6 pt-2">
                           <p className="text-sm font-black text-white uppercase mb-2">{v.cliente}</p>
                           <p className="text-[10px] font-bold text-blue-500 mb-1">{v.tel}</p>
                           <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{v.empresa || 'SUHAI SEGURADORA'}</p>
                           <p className="text-[8px] font-bold text-gray-600 mb-4">DATA: {new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</p>
                           
                           <div className="bg-[#0b0f1a]/50 p-6 rounded-2xl text-center border border-gray-800/50 mb-6">
                             <p className="text-[8px] font-black text-gray-500 uppercase mb-1">PRÊMIO LÍQUIDO</p>
                             <h4 className="text-2xl font-black text-white">{FORMAT_BRL(v.valor)}</h4>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-[#0b0f1a]/30 p-3 rounded-xl border border-gray-800 text-center">
                                <p className="text-[7px] font-black text-gray-600 uppercase">C. CHEIA</p>
                                <p className="text-[10px] font-black text-white">{FORMAT_BRL(v.comissao_cheia)}</p>
                              </div>
                              <div className="bg-[#0b0f1a]/30 p-3 rounded-xl border border-gray-800 text-center">
                                <p className="text-[7px] font-black text-green-500 uppercase">SUA PARTE</p>
                                <p className="text-[10px] font-black text-green-500">{FORMAT_BRL(v.comissao_vendedor)}</p>
                              </div>
                           </div>
                           
                           <div className="flex justify-between items-center pt-4 border-t border-gray-800/50">
                             <button onClick={() => moveVenda(v, 'left')} className="text-gray-600 hover:text-white"><i className="fas fa-chevron-left"></i></button>
                             <span className="text-[9px] font-black text-blue-500 uppercase">{v.vendedor}</span>
                             <button onClick={() => moveVenda(v, 'right')} className="text-gray-600 hover:text-white"><i className="fas fa-chevron-right"></i></button>
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

      {activeSection === 'kanban-indicacoes' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex justify-between items-center">
             <h2 className="text-4xl font-black uppercase text-yellow-500 tracking-tighter">LEADS</h2>
             <button onClick={() => setActiveSection('cadastrar-indicacao')} className="bg-yellow-500 text-black px-10 py-4 rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-yellow-900/20">NOVO LEAD</button>
           </div>
           <div className="grid grid-cols-2 gap-4 mb-8">
              <input type="text" placeholder="BUSCAR LEADS..." className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-white outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <select className="w-full bg-[#111827] border border-gray-800 px-6 py-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 outline-none" value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}>
                <option value="TODOS">TODOS VENDEDORES</option>
                {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome.toUpperCase()}>{u.nome.toUpperCase()}</option>)}
              </select>
           </div>
           <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-thin h-[calc(100vh-280px)]">
              {INDICACAO_STATUS_MAP.map(status => (
                <div key={status} className="kanban-column flex flex-col w-[350px] bg-[#0b0f1a]/50 rounded-[2.5rem] border border-gray-800/50 p-4">
                  <h3 className="text-[10px] font-black uppercase text-gray-500 text-center mb-6 py-4 border-b border-gray-800/30 tracking-widest">{status}</h3>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                    {filteredIndicacoes.filter(i => i.status === status).map(i => (
                      <div key={i.id} className="bg-[#111827] rounded-[2rem] p-8 border border-yellow-900/20 shadow-xl relative group">
                        <div className="absolute top-8 right-8 flex gap-3">
                           <button onClick={() => { setEditingItem({ ...i, leadIdToDelete: i.id, status: 'Fazer Vistoria', dataCriacao: Date.now() }); setModalType('venda'); }} className="text-green-500 hover:scale-110 transition"><i className="fas fa-check"></i></button>
                           <button onClick={() => { if(window.confirm('Excluir lead?')) cloud.apagar('indicacoes', i.id!) }} className="text-red-500/50 hover:text-red-500 transition"><i className="fas fa-trash-alt"></i></button>
                           <button onClick={() => { setEditingItem(i); setModalType('indicacao'); }} className="text-gray-600 hover:text-white transition"><i className="fas fa-edit"></i></button>
                        </div>
                        <p className="text-sm font-black text-white uppercase mb-2">{i.cliente}</p>
                        <p className="text-[10px] font-bold text-yellow-500 mb-1">{i.tel}</p>
                        <p className="text-[10px] font-black text-gray-500 uppercase mb-1">{i.veiculo}</p>
                        <p className="text-[8px] font-bold text-gray-600 mb-6">DATA: {new Date(i.dataCriacao).toLocaleDateString('pt-BR')}</p>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-800/50 mt-2">
                           <button onClick={() => moveIndicacao(i, 'left')} className="text-gray-600 hover:text-white"><i className="fas fa-chevron-left"></i></button>
                           <span className="text-[9px] font-black text-gray-500 uppercase">{i.vendedor || 'SEM VENDEDOR'}</span>
                           <button onClick={() => moveIndicacao(i, 'right')} className="text-gray-600 hover:text-white"><i className="fas fa-chevron-right"></i></button>
                        </div>
                        {i.suhai && <p className="text-center text-[8px] uppercase tracking-widest text-green-500 mt-3 s-suhai-pulse">SUHAI</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeSection === 'cadastrar-indicacao' && (
        <div className="flex items-center justify-center min-h-[calc(100vh-150px)] animate-in zoom-in duration-500">
           <div className="bg-[#111827] w-full max-w-xl rounded-[3rem] p-12 border border-gray-800 shadow-2xl relative">
              <h2 className="text-2xl font-black text-yellow-500 uppercase text-center mb-10 tracking-widest">DISTRIBUIR LEAD</h2>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-2">CLIENTE</label>
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none font-bold uppercase" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: e.target.value.toUpperCase()})} />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-600 ml-2">WHATSAPP</label>
                       <input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-600 ml-2">VEÍCULO / MODELO</label>
                       <input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none uppercase font-bold" value={editingItem?.veiculo || ''} onChange={e => setEditingItem({...editingItem, veiculo: e.target.value.toUpperCase()})} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-2">ATRIBUIR AO VENDEDOR</label>
                    <select className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none font-black uppercase" value={editingItem?.vendedor || ''} onChange={e => setEditingItem({...editingItem, vendedor: e.target.value})}>
                       <option value="">SELECIONE UM VENDEDOR</option>
                       {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome.toUpperCase()}>{u.nome.toUpperCase()}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center gap-3 bg-[#0b0f1a] p-4 rounded-xl border border-gray-800">
                    <input type="checkbox" className="w-5 h-5" checked={editingItem?.suhai || false} onChange={e => setEditingItem({...editingItem, suhai: e.target.checked})} />
                    <label className="text-[10px] font-black uppercase text-green-500">MARCAR COMO LEAD SUHAI</label>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-2">OBSERVAÇÕES ADICIONAIS</label>
                    <textarea className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none h-32 uppercase text-xs" placeholder="EX: CLIENTE INDICADO POR AMIGO..." value={editingItem?.info || ''} onChange={e => setEditingItem({...editingItem, info: e.target.value})} />
                 </div>
                 <button onClick={async () => { 
                    if(!editingItem?.cliente || !editingItem?.vendedor) return alert('Preencha os campos obrigatórios');
                    await cloud.salvarIndicacao({...editingItem, status: 'NOVA INDICAÇÃO', dataCriacao: Date.now()}); 
                    alert("Lead distribuído com sucesso!"); 
                    setEditingItem({});
                    setActiveSection('kanban-indicacoes');
                 }} className="w-full bg-yellow-500 p-6 rounded-3xl font-black uppercase text-black shadow-xl hover:bg-yellow-400 transition-all">CONFIRMAR ENVIO DO LEAD</button>
              </div>
           </div>
        </div>
      )}

      {activeSection === 'metas' && (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
          <h2 className="text-4xl font-black uppercase text-blue-500 tracking-tighter">METAS DOS VENDEDORES</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => {
              const m = metas.find(meta => meta.vendedor.toUpperCase() === u.nome.toUpperCase()) || { meta_salario: 0, meta_premio: 0, meta_qtd: 0 };
              return (
                <div key={u.id} className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h3 className="text-xl font-black text-white uppercase mb-8 tracking-tighter">{u.nome}</h3>
                  <div className="space-y-4 mb-10">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-gray-500">META SALARIAL</span><span className="text-white">{FORMAT_BRL(m.meta_salario)}</span></div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-gray-500">META PRÊMIO</span><span className="text-white">{FORMAT_BRL(m.meta_premio)}</span></div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase"><span className="text-gray-500">QUANTIDADE</span><span className="text-white">{m.meta_qtd} UNI</span></div>
                  </div>
                  <button onClick={() => { setEditingItem({ ...m, vendedor: u.nome }); setModalType('meta'); }} className="w-full bg-gray-800 p-4 rounded-xl font-black uppercase text-[9px] text-white hover:bg-gray-700 transition-all">CONFIGURAR METAS</button>
                </div>
              );
            })}
          </div>
          
          <h2 className="text-4xl font-black uppercase text-purple-500 tracking-tighter mt-16">META DA EMPRESA (VM SEGUROS)</h2>
          <div className="bg-[#111827] p-12 rounded-[3rem] border border-gray-800 relative flex flex-col items-center justify-center">
             <button onClick={() => { setEditingItem(metas.find(m => m.vendedor === 'EMPRESA_VM_SEGUROS') || { vendedor: 'EMPRESA_VM_SEGUROS', meta_salario: 0, meta_premio: 0, meta_qtd: 0 }); setModalType('meta'); }} className="absolute top-10 right-10 text-purple-500 hover:scale-125 transition"><i className="fas fa-edit text-2xl"></i></button>
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">OBJETIVOS GLOBAIS MENSAIS</p>
             <h3 className="text-5xl font-black text-white uppercase tracking-tighter">ESTRATÉGICO VM</h3>
          </div>
        </div>
      )}

      {activeSection === 'lead-suhai-page' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
           <h2 className="text-4xl font-black uppercase text-[#10b981] tracking-tighter">SUHAI GOLD - PAGOS</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#111827] p-12 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-[#10b981] shadow-2xl flex flex-col items-center justify-center">
                <p className="text-gray-500 text-[9px] font-black uppercase mb-4 tracking-widest">COMISSÃO SUHAI</p>
                <h3 className="text-7xl font-black text-[#10b981] font-mono tracking-tighter">{FORMAT_BRL(0)}</h3>
              </div>
              <div className="bg-[#111827] p-12 rounded-[2.5rem] border border-gray-800 border-l-4 border-l-[#3b82f6] shadow-2xl flex flex-col items-center justify-center">
                <p className="text-gray-500 text-[9px] font-black uppercase mb-4 tracking-widest">PRÊMIO TOTAL</p>
                <h3 className="text-7xl font-black text-[#3b82f6] font-mono tracking-tighter">{FORMAT_BRL(0)}</h3>
              </div>
           </div>
           <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                    <tr>
                      <th className="px-8 py-6 border-b border-gray-800">VENDEDOR</th>
                      <th className="px-8 py-6 border-b border-gray-800">CLIENTE</th>
                      <th className="px-8 py-6 border-b border-gray-800">PRÊMIO</th>
                      <th className="px-8 py-6 border-b border-gray-800">COMISSÃO</th>
                      <th className="px-8 py-6 border-b border-gray-800 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={5} className="p-16 text-center text-gray-700 uppercase font-black text-xs">AGUARDANDO TRANSAÇÕES SUHAI...</td></tr>
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {activeSection === 'configuracoes' && (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
           <div className="flex justify-between items-center">
              <h2 className="text-4xl font-black uppercase text-gray-400 tracking-tighter">CONFIGURAÇÕES</h2>
              <button onClick={() => { setEditingItem({ nome: '' }); setModalType('empresa'); }} className="bg-gray-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">NOVA SEGURADORA</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {empresas.map(emp => (
                <div key={emp.id} className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 flex justify-between items-center group">
                  <h4 className="text-lg font-black text-white uppercase tracking-tighter">{emp.nome}</h4>
                  <button onClick={() => { if(window.confirm('Excluir empresa?')) cloud.apagar('empresas', emp.id!) }} className="text-red-500/20 group-hover:text-red-500 transition-all p-2"><i className="fas fa-trash-alt"></i></button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* SEÇÃO RH CADASTRAR EMISSÃO - INDEPENDENTE */}
      {activeSection === 'cadastrar-emissao' && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] animate-in zoom-in duration-500">
           <div className="bg-[#111827] w-full max-w-2xl rounded-[3rem] p-12 border border-gray-800 shadow-2xl space-y-10">
              <h2 className="text-2xl font-black text-blue-400 uppercase text-center tracking-widest">CADASTRAR EMISSÃO (RH)</h2>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-2">NOME CLIENTE</label>
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none focus:border-blue-500 font-bold uppercase" value={emissaoForm.cliente || ''} onChange={e => setEmissaoForm({...emissaoForm, cliente: e.target.value.toUpperCase()})} />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-600 ml-2">TEL</label>
                       <input className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none" value={emissaoForm.tel || ''} onChange={e => setEmissaoForm({...emissaoForm, tel: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-600 ml-2">SEGURADORA</label>
                       <select className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none uppercase font-bold" value={emissaoForm.empresa || ''} onChange={e => setEmissaoForm({...emissaoForm, empresa: e.target.value})}>
                          <option value="">SELECIONE</option>
                          {empresas.map(emp => <option key={emp.id} value={emp.nome}>{emp.nome}</option>)}
                       </select>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-2">VENDEDOR RESPONSÁVEL</label>
                    <select className="w-full bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl text-white outline-none font-bold uppercase" value={emissaoForm.vendedor || ''} onChange={e => setEmissaoForm({...emissaoForm, vendedor: e.target.value})}>
                       <option value="">SELECIONE VENDEDOR</option>
                       {usuarios.filter(u => u.setor === 'VENDEDOR').map(u => <option key={u.id} value={u.nome.toUpperCase()}>{u.nome.toUpperCase()}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1 text-center">
                       <label className="text-[8px] font-black uppercase text-gray-600">PRÊMIO</label>
                       <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-center font-mono" value={emissaoForm.valor || 0} onChange={e => setEmissaoForm({...emissaoForm, valor: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1 text-center">
                       <label className="text-[8px] font-black uppercase text-yellow-500">% VEND</label>
                       <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-yellow-500 text-center font-black font-mono" value={emissaoForm.porcentagem_vendida || 0} onChange={e => setEmissaoForm({...emissaoForm, porcentagem_vendida: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1 text-center">
                       <label className="text-[8px] font-black uppercase text-gray-600">C. CHEIA</label>
                       <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white text-center font-mono" value={emissaoForm.comissao_cheia || 0} onChange={e => setEmissaoForm({...emissaoForm, comissao_cheia: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1 text-center">
                       <label className="text-[8px] font-black uppercase text-green-500">C. VEND</label>
                       <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-green-500 text-center font-black font-mono" value={emissaoForm.comissao_vendedor || 0} onChange={e => setEmissaoForm({...emissaoForm, comissao_vendedor: Number(e.target.value)})} />
                    </div>
                 </div>
                 <button onClick={async () => { 
                    if(!emissaoForm.cliente || !emissaoForm.vendedor) return alert('Campos obrigatórios faltando');
                    await cloud.salvarVenda({...emissaoForm, status: 'Pagamento Efetuado', dataCriacao: Date.now()} as Venda); 
                    alert("Lançamento RH concluído com sucesso!"); 
                    setEmissaoForm({ ...emissaoForm, cliente: '', tel: '', valor: 0, porcentagem_vendida: 0, comissao_cheia: 0, comissao_vendedor: 0 }); 
                 }} className="w-full bg-blue-600 p-6 rounded-3xl font-black uppercase text-white shadow-xl hover:bg-blue-500 transition-all">FINALIZAR EMISSÃO</button>
              </div>
           </div>
        </div>
      )}

      {/* RELATÓRIO RH - NOVO MODELO POR CARDS */}
      {activeSection === 'relatorio-vendas' && (
        <RelatorioVendasRHView vendas={vendas} usuarios={usuarios} />
      )}

      {/* MODAL UNIVERSAL PARA CADASTROS E EDICÕES */}
      {modalType && (
        <ModalWrapper title={`GERENCIAR ${modalType.toUpperCase()}`} onClose={() => setModalType(null)} onSave={async () => { 
          if(modalType === 'venda') {
            const { leadIdToDelete, ...data } = editingItem;
            await cloud.salvarVenda(data);
            if(leadIdToDelete) await cloud.apagar('indicacoes', leadIdToDelete);
          }
          if(modalType === 'indicacao') await cloud.salvarIndicacao(editingItem);
          if(modalType === 'usuario') await cloud.salvarUsuario(editingItem);
          if(modalType === 'meta') await cloud.salvarMeta(editingItem);
          if(modalType === 'cancelamento') await cloud.salvarCancelamento(editingItem);
          if(modalType === 'empresa') await cloud.salvarEmpresa(editingItem);
          setModalType(null); 
        }}>
           <div className="space-y-6">
              {modalType === 'usuario' && (
                 <>
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase font-bold" placeholder="Nome" value={editingItem?.nome || ''} onChange={e => setEditingItem({...editingItem, nome: (e.target.value || '').toUpperCase()})} />
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" placeholder="Login" value={editingItem?.login || ''} onChange={e => setEditingItem({...editingItem, login: e.target.value})} />
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" type="password" placeholder="Senha" value={editingItem?.senha || ''} onChange={e => setEditingItem({...editingItem, senha: e.target.value})} />
                    <select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold" value={editingItem?.setor || 'VENDEDOR'} onChange={e => setEditingItem({...editingItem, setor: e.target.value as any})}>
                       <option value="VENDEDOR">VENDEDOR</option>
                       <option value="ADMIN">ADMIN</option>
                       <option value="RH">RH</option>
                    </select>
                    <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" placeholder="Comissão %" value={editingItem?.comissao || 0} onChange={e => setEditingItem({...editingItem, comissao: Number(e.target.value)})} />
                 </>
              )}
              {modalType === 'venda' && (
                 <>
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white uppercase font-bold" placeholder="Cliente" value={editingItem?.cliente || ''} onChange={e => setEditingItem({...editingItem, cliente: (e.target.value || '').toUpperCase()})} />
                    <input className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" placeholder="Tel" value={editingItem?.tel || ''} onChange={e => setEditingItem({...editingItem, tel: e.target.value})} />
                    <select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold uppercase" value={editingItem?.empresa || ''} onChange={e => setEditingItem({...editingItem, empresa: e.target.value})}>
                       <option value="">SEGURADORA</option>
                       {empresas.map(emp => <option key={emp.id} value={emp.nome}>{emp.nome}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                       <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white" placeholder="Prêmio" value={editingItem?.valor || 0} onChange={e => setEditingItem({...editingItem, valor: Number(e.target.value)})} />
                       <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-bold" placeholder="C. Cheia" value={editingItem?.comissao_cheia || 0} onChange={e => setEditingItem({...editingItem, comissao_cheia: Number(e.target.value)})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <input type="number" className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-green-500 font-black" placeholder="C. Vend" value={editingItem?.comissao_vendedor || 0} onChange={e => setEditingItem({...editingItem, comissao_vendedor: Number(e.target.value)})} />
                       <select className="w-full bg-[#0b0f1a] border border-gray-800 p-4 rounded-xl text-white font-black uppercase" value={editingItem?.status || 'Fazer Vistoria'} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>
                          {VENDA_STATUS_MAP.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                 </>
              )}
           </div>
        </ModalWrapper>
      )}
    </Layout>
  );
};

// --- VIEW RELATORIO VENDAS RH - REFORMULADA ---
const RelatorioVendasRHView: React.FC<{ vendas: Venda[], usuarios: User[] }> = ({ vendas, usuarios }) => {
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);

  // Filtra apenas vendas que vieram do RH (independência)
  const rhVendas = useMemo(() => vendas.filter(v => (v as any).origem === 'RH'), [vendas]);

  // Lista de vendedores que possuem vendas registradas no RH
  const sellersWithSales = useMemo(() => {
    const names = Array.from(new Set(rhVendas.map(v => (v.vendedor || '').toUpperCase())));
    return names.sort();
  }, [rhVendas]);

  if (selectedSeller) {
    const sellerSales = rhVendas.filter(v => (v.vendedor || '').toUpperCase() === selectedSeller);
    const totalComissaoRealizada = sellerSales.reduce((acc, v) => acc + Number(v.comissao_vendedor || 0), 0);
    const totalComissaoCheia = sellerSales.reduce((acc, v) => acc + Number(v.comissao_cheia || 0), 0);

    return (
      <div className="space-y-10 animate-in slide-in-from-right duration-500">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={() => setSelectedSeller(null)} className="text-blue-400 hover:text-white transition"><i className="fas fa-arrow-left text-2xl"></i></button>
             <h2 className="text-4xl font-black uppercase text-blue-400 tracking-tighter">VENDAS RH: {selectedSeller}</h2>
          </div>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 no-print shadow-lg hover:scale-105 transition-all">
            <i className="fas fa-print"></i> IMPRIMIR LISTA
          </button>
        </div>

        <div className="bg-[#111827] rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0b0f1a]/50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                <tr>
                  <th className="px-8 py-6 border-b border-gray-800">DATA</th>
                  <th className="px-8 py-6 border-b border-gray-800">CLIENTE</th>
                  <th className="px-8 py-6 border-b border-gray-800">SEGURADORA</th>
                  <th className="px-8 py-6 border-b border-gray-800">PRÊMIO</th>
                  <th className="px-8 py-6 border-b border-gray-800 text-blue-400">C. CHEIA</th>
                  <th className="px-8 py-6 border-b border-gray-800">% VEND</th>
                  <th className="px-8 py-6 border-b border-gray-800 text-green-500">COMISSÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sellerSales.map(v => (
                  <tr key={v.id} className="text-white text-xs hover:bg-white/5 transition-colors">
                    <td className="px-8 py-4 font-mono">{new Date(v.dataCriacao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-8 py-4 font-black uppercase">{v.cliente}</td>
                    <td className="px-8 py-4 text-gray-400 uppercase">{v.empresa}</td>
                    <td className="px-8 py-4 font-mono">{FORMAT_BRL(v.valor)}</td>
                    <td className="px-8 py-4 font-mono text-blue-400">{FORMAT_BRL(v.comissao_cheia)}</td>
                    <td className="px-8 py-4 font-black text-yellow-500">{(v as any).porcentagem_vendida || 0}%</td>
                    <td className="px-8 py-4 font-mono font-bold text-green-500">{FORMAT_BRL(v.comissao_vendedor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-6">
          <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 border-l-4 border-l-blue-500 shadow-xl min-w-[300px]">
             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">TOTAL COMISSÃO CHEIA</p>
             <h3 className="text-3xl font-black text-white font-mono">{FORMAT_BRL(totalComissaoCheia)}</h3>
          </div>
          <div className="bg-[#111827] p-8 rounded-[2rem] border border-gray-800 border-l-4 border-l-green-500 shadow-xl min-w-[300px]">
             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">VALOR TOTAL COMISSÃO REALIZADA</p>
             <h3 className="text-4xl font-black text-green-500 font-mono tracking-tighter">{FORMAT_BRL(totalComissaoRealizada)}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <h2 className="text-4xl font-black uppercase text-blue-400 tracking-tighter">RELATÓRIO DE VENDAS (RH)</h2>
      
      {sellersWithSales.length === 0 ? (
        <div className="bg-[#111827] p-20 rounded-[3rem] border border-gray-800 text-center">
           <i className="fas fa-folder-open text-gray-800 text-6xl mb-6"></i>
           <p className="text-gray-500 font-black uppercase tracking-widest">Nenhuma venda lançada pelo RH ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {sellersWithSales.map(name => {
            const count = rhVendas.filter(v => (v.vendedor || '').toUpperCase() === name).length;
            const totalComissao = rhVendas.filter(v => (v.vendedor || '').toUpperCase() === name).reduce((acc, v) => acc + Number(v.comissao_vendedor || 0), 0);
            return (
              <div 
                key={name} 
                onClick={() => setSelectedSeller(name)}
                className="bg-[#111827] p-10 rounded-[2.5rem] border border-gray-800 cursor-pointer hover:border-blue-500/50 transition-all group relative overflow-hidden shadow-xl"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full group-hover:bg-blue-500/10 transition-all"></div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 group-hover:text-blue-400">{name}</h3>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Lançamentos RH: <span className="text-white">{count}</span></p>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Comissão Acumulada: <span className="text-green-500">{FORMAT_BRL(totalComissao)}</span></p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                   Acessar Lista <i className="fas fa-chevron-right text-[8px]"></i>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default App;
