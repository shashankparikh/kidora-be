require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function analyzeChildPhoto(imageBytes) {

    const prompt = `
Analyze this child's photo.

Return ONLY valid JSON.

Format:

{
  "hair": "",
  "eyes": "",
  "skinTone": "",
  "face": "",
  "expression": "",
  "clothing": "",
  "accessories": [],
  "estimatedAge": "",
  "stylePrompt": ""
}

Keep descriptions short.

Do not identify the child.

Describe only visible physical characteristics for use in generating consistent children's storybook illustrations.
`;

    const response = await ai.models.generateContent({

        model: "gemini-3.1-flash-lite",

        contents: [
            {
                text: prompt
            },
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBytes.toString("base64")
                }
            }
        ]

    });

    let text = response.text.trim();

    text = text.replace(/```json/g, "");
    text = text.replace(/```/g, "");

    return JSON.parse(text);

}

module.exports = {
    analyzeChildPhoto
};