
import React from 'react';
import { AuthUser } from '../types';

interface LayoutProps {
  user: AuthUser;
  onLogout: () => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt', color: '' },
  { id: 'kanban-indicacoes', label: 'Indicações', icon: 'fa-stream', color: '' },
  { id: 'kanban-vendas', label: 'Produção', icon: 'fa-columns', color: '' },
  { id: 'facebook-ads', label: 'Facebook Ads', icon: 'fa-brands fa-facebook', color: 'text-blue-500' },
  { id: 'comissao', label: 'Financeiro', icon: 'fa-percentage', color: 'text-green-500' },
  { id: 'cancelamentos', label: 'Cancelamentos', icon: 'fa-ban', color: 'text-red-500' },
];

const ADMIN_ITEMS: NavItem[] = [
  { id: 'cadastrar-indicacao', label: 'Distribuir Leads', icon: 'fa-plus-circle', color: 'text-yellow-500' },
  { id: 'vendedores', label: 'Vendedores', icon: 'fa-users', color: 'text-red-400' },
  { id: 'metas', label: 'Metas', icon: 'fa-bullseye', color: 'text-blue-400' },
  { id: 'lead-suhai-page', label: 'Lead Suhai', icon: 'fa-star', color: 'text-green-400' },
  { id: 'performance', label: 'Performance', icon: 'fa-chart-pie', color: 'text-purple-400' },
  { id: 'configuracoes', label: 'Configurações', icon: 'fa-cog', color: 'text-gray-400' },
];

const RH_ITEMS: NavItem[] = [
  { id: 'cadastrar-emissao', label: 'Cadastrar Emissão', icon: 'fa-file-signature', color: 'text-blue-300' },
  { id: 'relatorio-vendas', label: 'Relatório Vendas', icon: 'fa-file-invoice-dollar', color: 'text-green-300' },
  { id: 'falta-pagar', label: 'Falta Pagar', icon: 'fa-exclamation-triangle', color: 'text-yellow-400' },
];

const NavButton: React.FC<{ 
  item: NavItem; 
  activeSection: string; 
  setActiveSection: (id: string) => void;
}> = ({ item, activeSection, setActiveSection }) => (
  <button
    onClick={() => setActiveSection(item.id)}
    className={`flex items-center w-full p-3 rounded-xl text-[11px] font-bold uppercase transition-all duration-200 border-l-4 border-transparent ${
      activeSection === item.id 
      ? 'bg-[#374151] text-white border-blue-500' 
      : 'text-gray-400 hover:bg-[#1e293b] hover:text-white'
    } ${item.color}`}
  >
    <i className={`${item.icon.includes('fa-') && !item.icon.includes('fa- ') ? (item.icon.includes('fa-brands') ? '' : 'fas ') : ''}${item.icon} w-8`}></i>
    {item.label}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeSection, setActiveSection, children }) => {
  const isRH = user.setor === 'RH' || user.isAdmin;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-[#111827] border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-xl uppercase tracking-tighter font-mono">VM Seguros</span>
        </div>
        <div className="text-xs font-bold text-blue-400 bg-blue-900/20 px-4 py-2 rounded-full uppercase">
          {user.isAdmin ? user.nome : `${user.setor}: ${user.nome}`}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-[#111827] border-r border-gray-800 hidden md:block overflow-y-auto scrollbar-thin">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map(item => (
              <NavButton 
                key={item.id} 
                item={item} 
                activeSection={activeSection} 
                setActiveSection={setActiveSection} 
              />
            ))}
            
            {/* Botão PAGAMENTO liberado pelo RH para vendedores */}
            {user.setor === 'VENDEDOR' && user.folhaLiberada && (
              <button
                onClick={() => setActiveSection('pagamento')}
                className={`flex items-center w-full p-3 rounded-xl text-[11px] font-black uppercase transition-all duration-200 border-l-4 border-transparent mt-2 ${
                  activeSection === 'pagamento' 
                  ? 'bg-green-600/20 text-green-400 border-green-500 shadow-inner' 
                  : 'text-green-500/60 hover:bg-green-500/10 hover:text-green-400'
                }`}
              >
                <i className="fas fa-hand-holding-usd w-8"></i>
                PAGAMENTO
              </button>
            )}
            
            {user.isAdmin && (
              <div className="pt-2 mt-2 border-t border-gray-800 space-y-1">
                {ADMIN_ITEMS.map(item => (
                  <NavButton 
                    key={item.id} 
                    item={item} 
                    activeSection={activeSection} 
                    setActiveSection={setActiveSection} 
                  />
                ))}
              </div>
            )}

            <div className="pt-2 mt-2 border-t border-gray-800">
              <button 
                onClick={() => setActiveSection('links-uteis')}
                className={`flex items-center w-full p-3 rounded-xl text-[11px] font-bold uppercase transition-all duration-200 border-l-4 border-transparent ${activeSection === 'links-uteis' ? 'bg-[#374151] text-white border-blue-500' : 'text-gray-400 hover:bg-[#1e293b] hover:text-white'}`}
              >
                <i className="fas fa-link w-8"></i>Links Úteis
              </button>

              {/* ÁREA DO RH SEPARADA - RESTRITA */}
              {isRH && (
                <div className="pt-4 mt-4 border-t border-gray-700/50 animate-in fade-in duration-500">
                  <p className="px-3 mb-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">Setor RH</p>
                  {RH_ITEMS.map(item => (
                    <NavButton 
                      key={item.id} 
                      item={item} 
                      activeSection={activeSection} 
                      setActiveSection={setActiveSection} 
                    />
                  ))}
                </div>
              )}

              <button 
                onClick={onLogout}
                className="flex items-center w-full p-3 rounded-xl text-[11px] font-bold uppercase text-red-500 mt-4 hover:bg-red-500/10 transition-all"
              >
                <i className="fas fa-sign-out-alt w-8"></i>Sair
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto bg-[#0b0f1a] scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
