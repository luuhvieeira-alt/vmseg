
import { GoogleGenAI } from "@google/genai";

export const gemini = {
  async gerarPitchVenda(lead: { cliente: string; veiculo: string; info: string }) {
    // Always use process.env.API_KEY directly when initializing the GoogleGenAI client instance
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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

      // Access the .text property directly
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  },

  async sugerirStatus(historico: string) {
    // Always use process.env.API_KEY directly when initializing the GoogleGenAI client instance
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
