import axios from 'axios';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY?.trim() || '';
let groqDisabledForSession = false;

const groqApi = axios.create({
  baseURL: 'https://api.groq.com/openai/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const isGroqConfigured = Boolean(groqApiKey);
export const canUseGroq = () => isGroqConfigured && !groqDisabledForSession;

const askGroq = async (prompt) => {
  if (!canUseGroq()) {
    throw new Error('Groq is not configured. Add VITE_GROQ_API_KEY in frontend/.env.');
  }

  try {
    const response = await groqApi.post(
      '/chat/completions',
      {
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
      }
    );

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    if (error?.response?.status === 400 || error?.response?.status === 401 || error?.response?.status === 403) {
      groqDisabledForSession = true;
    }
    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Error calling Groq API.';
    throw new Error(message);
  }
};

export default askGroq;
