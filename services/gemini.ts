
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const gemini = {
  async gerarPitchVenda(lead: { cliente: string; veiculo: string; info: string }) {
    const prompt = `Analise este lead de seguro e crie um pitch de venda persuasivo e profissional para o WhatsApp. 
    Cliente: ${lead.cliente}
    Veículo: ${lead.veiculo}
    Contexto: ${lead.info}
    Retorne o texto formatado com emojis adequados e foco em proteção e confiança.`;

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
  },

  async sugerirStatus(historico: string) {
    // Exemplo de análise de sentimento/intenção para classificar o lead
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Com base no histórico: "${historico}", qual o status mais provável do funil? Responda apenas com uma das opções: WHATSAPP, COTAÇÃO REALIZADA ou COBRAR ATENÇÃO.`,
    });
    return response.text;
  }
};
