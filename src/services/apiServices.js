const API_BASE_URL = 'http://192.168.1.136:8000';

export const chatWithLlm = async (message, transcriptContext, appToken) => {
  const payload = {
    message: `${transcriptContext}\n my question is ${message}`,
  };

  const response = await fetch(`${API_BASE_URL}/chat-with-llm`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${appToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `I cannot process your question, please try again.`;
    if (response.status === 429)
      errorMessage =
        "You are sending too many requests, please wait a moment before trying again.";
    if (response.status === 500)
      errorMessage = "I canot process this, please try again later.";
    if (response.status === 401) {
      // Throw a specific error for 401 to easily identify it in the hook
      const authError = new Error("Unauthorized: Your session has expired.");
      authError.status = 401; // Attach the status for easier checking
      throw authError;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data || !data.reply) {
    throw new Error("I have no response...");
  }
  return data;
};

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
  const payload = { access_token: token };
  const response = await fetch(`${API_BASE_URL}/auth/google/verify-access-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("Response status:", response.status);
  console.log("Response status text:", response.statusText);
  console.log("Response ok:", response.ok);
  console.log("Response headers:", Object.fromEntries(response.headers));
  
  const data = await response.json();
  console.log("Response data:", data);
  console.log("=== End Debug ===");
  
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