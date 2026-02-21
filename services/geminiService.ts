
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, AttendanceRecord, PayrollRecord, AIAnalysis } from "../types";

// Always initialize GoogleGenAI with a named parameter using process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHRInsights = async (
  employees: Employee[],
  attendance: AttendanceRecord[],
  payroll: PayrollRecord[]
): Promise<AIAnalysis> => {
  // Use gemini-3-pro-preview for complex reasoning tasks like HR data analysis
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Siz HR analitikasiga ixtisoslashgan sun'iy intellektsiz. Quyidagi jonli ish haqi va davomat ma'lumotlarini tahlil qiling.
    Xodimlar: ${JSON.stringify(employees)}
    Oxirgi davomat: ${JSON.stringify(attendance.slice(-30))}
    Oxirgi ish haqi to'lovlari: ${JSON.stringify(payroll.slice(-10))}

    Ma'lumotlar asosida quyidagilarni taqdim eting:
    1. Kelgusi oy uchun ish haqi xarajatlari bashorati.
    2. Noodatiy davomat shakllarini aniqlang.
    3. Ish haqi yoki xodimlar tarkibini optimallashtirish uchun 3 ta aniq tavsiya.
    4. Noodatiy xulq-atvor haqida ogohlantirishlar.
    5. Dashboard uchun qisqa (1-2 gap) umumiy xulosa.

    Javobni FAQAT JSON formatida va o'zbek tilida qaytaring.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prediction: { type: Type.STRING },
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            optimizations: { type: Type.ARRAY, items: { type: Type.STRING } },
            behaviorAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
            dashboardSummary: { type: Type.STRING }
          },
          required: ["prediction", "patterns", "optimizations", "behaviorAlerts", "dashboardSummary"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AIAnalysis;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return {
      prediction: "Hozirgi vaqtda prognozni hisoblab bo'lmadi.",
      patterns: ["Ma'lumotlar tahlili muvaffaqiyatsiz tugadi"],
      optimizations: ["Ish haqi ma'lumotlari to'liqligini tekshiring"],
      behaviorAlerts: ["AI xizmati hozirda mavjud emas"],
      dashboardSummary: "Tahlil jarayonida xatolik yuz berdi."
    };
  }
};
