import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5000';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
});

const getApiErrorMessage = (error, fallbackMessage) => {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (error?.message === 'Network Error') {
    return `Backend is unreachable at ${apiBaseUrl}. Start the Flask server or update VITE_API_BASE_URL.`;
  }
  return fallbackMessage;
};

export const scanReceipt = async (imageFile) => {
  const formData = new FormData();
  formData.append('receipt', imageFile);

  try {
    const response = await api.post('/api/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to scan the receipt right now.'));
  }
};

export const getPredictions = async (userId, expenses) => {
  try {
    const response = await api.post('/api/predict', {
      user_id: userId,
      expenses,
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to generate predictions right now.'));
  }
};

export const getApiBaseUrl = () => apiBaseUrl;
