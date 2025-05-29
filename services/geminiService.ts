
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT } from '../constants';

let ai: GoogleGenAI | null = null; // Singleton instance for GoogleGenAI client

/**
 * Initializes and returns the GoogleGenAI client.
 * Throws an error if the API key is not configured.
 * @returns {GoogleGenAI} The initialized GoogleGenAI client.
 */
const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    // API_KEY is expected to be set in the environment (e.g., via a build process or server-side).
    // For purely client-side apps without a build step, this 'process.env.API_KEY' will likely be undefined
    // unless manually set on the window object or replaced during a build.
    if (!process.env.API_KEY) {
      throw new Error("Gemini API key (process.env.API_KEY) is not configured.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

/**
 * Fetches a narrative for a route from the Gemini API.
 * @param {string} startLocation - The starting location of the route.
 * @param {string} endLocation - The ending location of the route.
 * @param {'th' | 'en'} language - The desired language for the narrative ('th' for Thai, 'en' for English).
 * @returns {Promise<string | undefined>} A promise that resolves with the narrative string, or undefined/error message if it fails.
 */
export const getGeminiRouteNarrative = async (
  startLocation: string, 
  endLocation: string, 
  language: 'th' | 'en' = 'th' // Default to Thai
): Promise<string | undefined> => {
  try {
    const client = getAiClient(); // Get the initialized AI client
    const model = GEMINI_MODEL_TEXT; // Use the specified Gemini model

    // Construct the prompt based on the selected language.
    // The prompt asks Gemini to act as a tour guide and provide a vivid, brief narrative.
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

    // Call the Gemini API to generate content
    const response: GenerateContentResponse = await client.models.generateContent({
      model: model,
      contents: prompt, 
    });

    const text = response.text; // Extract the text from the response
    if (text) {
      return text.trim(); // Return the trimmed narrative
    }
    return undefined; // Return undefined if no text is available

  } catch (error) {
    console.error("Error fetching Gemini route narrative:", error);
    // Provide a user-friendly error message in the selected language
    const errorMessage = language === 'th' 
      ? `เกิดข้อผิดพลาดในการสร้างเรื่องเล่า: ${(error as Error).message} แผนที่เส้นทางจะยังคงใช้งานได้`
      : `Error generating narrative: ${(error as Error).message}. Route map will still be available.`;
    return errorMessage; // Return the error message (application will still function for mapping)
  }
};
