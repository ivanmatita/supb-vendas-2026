
import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceItem, Client, Invoice, Purchase } from "../types";

// Initialize Gemini
// Fix: Always use named parameter for apiKey initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateInvoiceDataFromText = async (
  promptText: string,
  existingClients: Client[]
): Promise<{
  clientId?: string;
  newClientName?: string;
  items: Omit<InvoiceItem, 'id' | 'total'>[];
  notes?: string;
}> => {
  const clientListString = existingClients.map(c => `${c.name} (ID: ${c.id})`).join(", ");

  const prompt = `
    Analyze the following request to create an invoice: "${promptText}".
    
    Existing Clients: [${clientListString}]

    Extract the following:
    1. If the client matches an existing client, provide the Client ID.
    2. If it's a new client, provide the Client Name.
    3. List of items (description, quantity, unit price).
    4. Any notes.

    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientId: { type: Type.STRING, description: "ID of existing client if found" },
            newClientName: { type: Type.STRING, description: "Name if it is a new client" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                },
                required: ["description", "quantity", "unitPrice"]
              }
            },
            notes: { type: Type.STRING }
          }
        }
      }
    });

    // Fix: Access .text property directly as it is not a method
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const analyzeFinancialHealth = async (invoiceSummary: string) => {
   try {
     const response = await ai.models.generateContent({
       model: "gemini-3-flash-preview",
       contents: `Atue como um consultor financeiro especialista em negócios em Angola. Analise estes dados de faturação resumidos e dê 3 conselhos curtos, profissionais e práticos em Português: ${invoiceSummary}`,
     });
     // Fix: Access .text property directly
     return response.text;
   } catch (error) {
     return "Não foi possível gerar insights no momento.";
   }
}

export const getAIBusinessAssistantResponse = async (
  userMessage: string, 
  context: { invoices: Invoice[], purchases: Purchase[], clients: Client[] }
) => {
  const summary = `
    Estado atual do negócio:
    - Total de faturas: ${context.invoices.length}
    - Faturas pendentes: ${context.invoices.filter(i => i.status === 'Pendente').length}
    - Clientes cadastrados: ${context.clients.length}
    - Total de compras registadas: ${context.purchases.length}
    - Receita Bruta Estimada: ${context.invoices.reduce((a, b) => a + b.total, 0)} Kz
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: `Você é o FaturaPro AI, um assistente virtual especialista no software de faturação IMATEC. 
        Você ajuda o utilizador a navegar no sistema, analisar dados financeiros e cumprir regras da AGT (Angola). 
        Contexto do utilizador: ${summary}. Responda de forma profissional e concisa em Português de Angola.`
      }
    });
    // Fix: Access .text property directly
    return response.text;
  } catch (error) {
    return "Desculpe, tive um problema ao processar sua pergunta. Tente novamente em instantes.";
  }
}
