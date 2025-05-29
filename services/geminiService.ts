import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT } from '../constants';

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("Gemini API key (process.env.API_KEY) is not configured.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const getGeminiRouteNarrative = async (
  startLocation: string, 
  endLocation: string, 
  language: 'th' | 'en' = 'th' // Default to Thai if not specified
): Promise<string | undefined> => {
  try {
    const client = getAiClient();
    const model = GEMINI_MODEL_TEXT;

    let prompt: string;

    if (language === 'th') {
      prompt = `
        คุณคือมัคคุเทศก์ผู้ชายที่เป็นมิตรและน่าสนใจ
        โปรดบรรยายเส้นทางสั้นๆ และเห็นภาพชัดเจนสำหรับการขับรถจำลองจาก "${startLocation}" ไปยัง "${endLocation}" เป็นภาษาไทย
        จินตนาการว่าคุณกำลังอธิบายการเดินทางให้คนที่จะ 'ขับ' ผ่าน Street View
        เน้นจุดเลี้ยวสำคัญ จุดสังเกต หรือภาพที่น่าสนใจที่พวกเขาอาจเห็นสักสองสามแห่ง
        ให้เรื่องเล่าโดยรวมค่อนข้างสั้น เน้นประสบการณ์มากกว่าคำแนะนำแบบเลี้ยวต่อเลี้ยวที่ละเอียดถี่ถ้วน
        ทำให้ฟังดูเหมือนการขับรถเสมือนจริงที่น่ารื่นรมย์
        ตัวอย่างสไตล์ (เป็นภาษาอังกฤษเพื่อให้เห็นภาพรวม): "As we set off from the bustling Times Square, you'll see the vibrant billboards all around. We'll then head down 7th Avenue, catching a glimpse of Central Park on our right. Look out for the iconic Flatiron Building as we make a left turn..."
        กรุณาตอบเป็นภาษาไทยเท่านั้น
      `;
    } else { // English prompt
      prompt = `
        You are a friendly and engaging tour guide.
        Please provide a short, vivid narrative for a simulated drive from "${startLocation}" to "${endLocation}" in English.
        Imagine you're describing the journey to someone who will be 'driving' it via Street View.
        Focus on key turns, landmarks, or interesting visuals they might see.
        Keep the overall narrative relatively brief, emphasizing the experience rather than exhaustive turn-by-turn directions.
        Make it sound like a pleasant virtual drive.
        Example style: "As we set off from the bustling Times Square, you'll see the vibrant billboards all around. We'll then head down 7th Avenue, catching a glimpse of Central Park on our right. Look out for the iconic Flatiron Building as we make a left turn..."
        Please respond in English only.
      `;
    }

    const response: GenerateContentResponse = await client.models.generateContent({
      model: model,
      contents: prompt, 
    });

    const text = response.text;
    if (text) {
      return text.trim();
    }
    return undefined;

  } catch (error) {
    console.error("Error fetching Gemini route narrative:", error);
    const errorMessage = language === 'th' 
      ? `เกิดข้อผิดพลาดในการสร้างเรื่องเล่า: ${(error as Error).message} แผนที่เส้นทางจะยังคงใช้งานได้`
      : `Error generating narrative: ${(error as Error).message}. Route map will still be available.`;
    return errorMessage;
  }
};
