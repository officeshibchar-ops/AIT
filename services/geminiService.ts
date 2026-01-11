
import { GoogleGenAI } from "@google/genai";
import { RentRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProfessionalMessage = async (record: RentRecord): Promise<string> => {
  const paymentDetails = record.paymentMethod === 'Bank' 
    ? `via ${record.bankName} (${record.branch})`
    : record.paymentMethod === 'MFS' 
    ? `via MFS (${record.mfsNumber})`
    : "in Cash";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft a very short, polite, and professional SMS/WhatsApp payment confirmation message for a tenant named ${record.tenantName} for the month of ${record.rentMonth}. 
      Details: 
      - Flat: ${record.flatNumber}
      - Amount: ৳${record.rentAmount}
      - Method: Received ${paymentDetails}
      - Receipt ID: ${record.receiptNumber}
      Keep it under 150 characters if possible. Mention that the payment was received via AIT SOLUTION system.`,
    });
    return response.text || "Thank you for your rent payment!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Hi ${record.tenantName}, thank you for the rent payment of ৳${record.rentAmount} for ${record.rentMonth} received ${paymentDetails}. Receipt: ${record.receiptNumber}. Sent via AIT SOLUTION.`;
  }
};
