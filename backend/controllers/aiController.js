import { DoctorProfile, User } from '../models/index.js';
import { deriveCometChatUid, sendCometChatMessage } from '../services/cometchatService.js';

export const getAIResponse = async (message) => {
  if (!message || message.trim() === '') {
    throw new Error('Message content is required.');
  }

  // Fetch all active doctors to match names or specialties dynamically
  const doctors = await DoctorProfile.findAll({
    include: [{ model: User, as: 'user', where: { status: 'active' }, attributes: ['name'] }]
  });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('Groq API key is not configured.');
  }

  const doctorsListFormatted = doctors.map(doc => ({
    id: doc.id,
    name: doc.user.name,
    specialization: doc.specialization
  }));

  const systemInstruction = `You are the MediCare AI Assistant, an automated health assistant.
Your goal is to guide users to relevant medical specialists based on their symptoms or queries, and assist them in booking appointments.
Here is the current list of active doctors at MediCare:
${JSON.stringify(doctorsListFormatted, null, 2)}

Rules:
1. If the user describes symptoms that match a specialty (e.g. tight chest for Cardiology, headaches for Neurology, rash for Dermatology, joint pain for Orthopedics, pediatric/child query for Pediatrics, stomach/digestive query for Gastroenterology, sugar/thyroid for Endocrinology), recommend consulting with an appropriate doctor from the active doctors list.
2. If there are doctors for that specialty, set:
   - suggestedAction to "REDIRECT_BOOK"
   - suggestedParams to the matching doctor's ID, name, and specialization from the list.
3. If no doctor exists for the matching specialty in the list, state that no doctors are currently listed for that department, and do not redirect.
4. If the user expresses general interest in booking/scheduling an appointment but without a specific doctor or specialty, set:
   - suggestedAction to "REDIRECT_DIRECTORY"
   - suggestedParams to null
5. Always include a disclaimer at the end of your reply (but within the "reply" string) stating: "Disclaimer: I am an automated health assistant, not a doctor. If you are experiencing a severe medical emergency, please contact 911 or visit your nearest emergency room immediately."
6. You MUST respond with ONLY a raw JSON object matching this schema (do not wrap in markdown code blocks like \`\`\`json):
{
  "reply": "string (your helpful response text containing the disclaimer)",
  "suggestedAction": "REDIRECT_BOOK" | "REDIRECT_DIRECTORY" | null,
  "suggestedParams": {
    "doctorProfileId": "string",
    "specialization": "string",
    "doctorName": "string"
  } | null
}`;

  let retries = 3;
  let delay = 1000;
  let response;

  while (retries > 0) {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemInstruction
          },
          {
            role: 'user',
            content: message
          }
        ],
        response_format: {
          type: 'json_object'
        }
      })
    });

    if (response.status === 503 || response.status === 429) {
      console.warn(`[Groq API] Got status ${response.status}. Retrying in ${delay}ms... (attempts left: ${retries - 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries--;
      delay *= 2;
    } else {
      break;
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API Error: ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from Groq API.');
  }

  let rawText = text.trim();
  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }
  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed.reply !== 'string') {
    throw new Error('Invalid JSON structure returned by Groq API.');
  }

  return {
    reply: parsed.reply,
    suggestedAction: parsed.suggestedAction || null,
    suggestedParams: parsed.suggestedParams || null
  };
};

export const processAIChat = async (req, res, next) => {
  try {
    let message = req.body.message;

    // Support both web (message) and mobile (messages array)
    if (!message && Array.isArray(req.body.messages)) {
      const userMessages = req.body.messages.filter((m) => m.role === 'user');
      if (userMessages.length > 0) {
        message = userMessages[userMessages.length - 1].content;
      }
    }

    const response = await getAIResponse(message);
    const { reply, suggestedAction, suggestedParams } = response;

    if (req.user && req.user.id) {
      const receiverUid = deriveCometChatUid(req.user.id);
      const metadata = suggestedAction ? { suggestedAction, suggestedParams } : null;
      await sendCometChatMessage('medicare_ai_assistant', receiverUid, reply, metadata);
    }

    res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Message content is required.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};
