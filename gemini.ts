
import { GoogleGenAI, Type } from "@google/genai";

export const gemini = {
  async gerarPitchVenda(lead: { cliente: string; veiculo: string; info: string }) {
    // Inicializa dentro da função para garantir que não quebre o app no import
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Analise este lead de seguro e crie um pitch de venda persuasivo e profissional para o WhatsApp. 
    Cliente: ${lead.cliente}
    Veículo: ${lead.veiculo}
    Contexto: ${lead.info}
    Retorne o texto formatado com emojis adequados e foco em proteção e confiança.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        }
      });

      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  },

  async sugerirStatus(historico: string) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Com base no histórico: "${historico}", qual o status mais provável do funil? Responda apenas com uma das opções: WHATSAPP, COTAÇÃO REALIZADA ou COBRAR ATENÇÃO.`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return null;
    }
  }
};
