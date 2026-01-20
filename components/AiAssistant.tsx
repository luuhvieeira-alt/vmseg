
import React, { useState } from 'react';
import { gemini } from '../services/gemini';

interface AiAssistantProps {
  lead: { cliente: string; veiculo: string; info: string };
  onClose: () => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ lead, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await gemini.gerarPitchVenda(lead);
      setPitch(res || 'Não foi possível gerar o pitch no momento.');
    } catch (error) {
      console.error(error);
      setPitch('Erro ao conectar com a inteligência artificial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-[#111827]/95 backdrop-blur-xl border-l border-gray-800 z-[300] shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black uppercase text-blue-400 flex items-center gap-2">
          <i className="fas fa-robot"></i> AI Sales Partner
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        <div className="bg-[#1e293b] p-4 rounded-2xl border border-gray-700">
          <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Lead Selecionado</p>
          <p className="text-sm font-bold text-white uppercase">{lead.cliente}</p>
          <p className="text-[11px] text-blue-400">{lead.veiculo}</p>
        </div>

        {pitch ? (
          <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-500/30">
            <p className="text-[10px] uppercase font-bold text-blue-400 mb-3">Pitch Sugerido pela AI</p>
            <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {pitch}
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(pitch); alert('Copiado!'); }}
              className="mt-4 w-full bg-blue-600 p-3 rounded-xl text-[10px] font-bold uppercase transition hover:bg-blue-500"
            >
              <i className="fas fa-copy mr-2"></i> Copiar para WhatsApp
            </button>
          </div>
        ) : (
          <div className="text-center py-10">
            <i className="fas fa-magic text-4xl text-gray-700 mb-4"></i>
            <p className="text-xs text-gray-500 uppercase font-bold">A AI pode te ajudar a fechar este seguro.</p>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-800">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all ${
            loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 active:scale-95'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              Analisando...
            </>
          ) : (
            <>
              <i className="fas fa-bolt"></i> Gerar Estratégia
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AiAssistant;
