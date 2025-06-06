const API_BASE_URL = 'https://tubetor-backend-234898757030.us-central1.run.app';

export const chatWithLlm = async(message, appToken) => {
  const payload = {
    message: message,
  };

  //console.log('🔄 Calling chat API with payload:', payload);

  const response = await fetch(`${API_BASE_URL}/chat-with-llm`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${appToken}`,
    },
    body: JSON.stringify(payload),
  });

  //console.log('📡 API response status:', response.status);

  // Just throw with status info - let handler decide what to do
  if (!response.ok) {
    const error = new Error(`API request failed`);
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }

  const data = await response.json();
  //console.log('📦 API response data:', data);
  
  if (!data || !data.reply) {
    const error = new Error("No response from API");
    error.status = 'NO_RESPONSE';
    throw error;
  }
  
  return data;
}

export const verifyGoogleToken = async (idToken) => {
  const response = await fetch(`${API_BASE_URL}/auth/google/verify-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_token: idToken }),
  });

  const data = await response.json();
  if (!response.ok || !data.user || !data.appSessionToken) {
    throw new Error("Sorry, log in was not sucessful.");
  }
  return data;
};

export const verifyGoogleAccessToken = async (token) => {
  //console.log(`${API_BASE_URL}/auth/google/verify-access-token`)
  const payload = { access_token: token };
  const response = await fetch(`${API_BASE_URL}/auth/google/verify-access-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  //console.log("Response status:", response.status);
  //console.log("Response status text:", response.statusText);
  //console.log("Response ok:", response.ok);
  //console.log("Response headers:", Object.fromEntries(response.headers));
  
  const data = await response.json();
  //console.log("Response data:", data);
  //console.log("=== End Debug ===");
  
  if (!response.ok || !data.user || !data.appSessionToken) {
    console.error("Error details:", {
      status: response.status,
      ok: response.ok,
      hasUser: !!data.user,
      hasToken: !!data.appSessionToken,
      responseData: data
    });
    throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
  }
  return data;
};