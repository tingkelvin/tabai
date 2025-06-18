const API_BASE_URL = "http://localhost:8000";

const createHeaders = (appToken, includeContentType = true) => {
  const headers = {
    accept: "application/json",
    Authorization: `Bearer ${appToken}`,
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const handleApiResponse = async (response, errorContext = "API request") => {
  console.log(`📡 ${errorContext} response status:`, response.status);

  if (!response.ok) {
    let errorDetail = "Unknown error";
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || errorDetail;
    } catch (e) {
      // If we can't parse error JSON, use status text
      errorDetail = response.statusText;
    }

    const error = new Error(`${errorContext} failed: ${errorDetail}`);
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }

  const data = await response.json();
  console.log(`📦 ${errorContext} response data:`, data);

  if (!data || !data.reply) {
    const error = new Error(`No response from ${errorContext}`);
    error.status = "NO_RESPONSE";
    throw error;
  }

  return data;
};

// ===================================
// 1. Basic Chat (Original function)
// ===================================

export const chatWithLlm = async (message, appToken) => {
  const payload = {
    message: message,
  };

  console.log("🔄 Calling basic chat API with payload:", payload);

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: createHeaders(appToken),
    body: JSON.stringify(payload),
  });

  return handleApiResponse(response, "Basic chat");
};

// ===================================
// 2. Chat with Search
// ===================================

export const chatWithSearch = async (message, appToken, options = {}) => {
  const payload = {
    message: message,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || null,
  };

  console.log("🔄 Calling chat with search API with payload:", payload);

  const response = await fetch(`${API_BASE_URL}/chat/search`, {
    method: "POST",
    headers: createHeaders(appToken),
    body: JSON.stringify(payload),
  });

  return handleApiResponse(response, "Chat with search");
};

// ===================================
// 3. Chat with Base64 Images
// ===================================

export const chatWithImages = async (
  message,
  images,
  appToken,
  options = {}
) => {
  const payload = {
    message: message,
    images: images, // Array of {data: base64String, mime_type: string}
    use_search: options.useSearch || false,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || null,
  };

  console.log("🔄 Calling chat with images API with payload:", {
    ...payload,
    images: `${payload.images.length} images`,
  });

  const response = await fetch(`${API_BASE_URL}/chat/image`, {
    method: "POST",
    headers: createHeaders(appToken),
    body: JSON.stringify(payload),
  });

  return handleApiResponse(response, "Chat with images");
};

// ===================================
// 4. Chat with File Upload
// ===================================

export const chatWithUpload = async (
  message,
  files,
  appToken,
  options = {}
) => {
  const formData = new FormData();

  // Add text fields
  formData.append("message", message);
  formData.append("use_search", options.useSearch || false);
  formData.append("temperature", options.temperature || 0.7);

  if (options.maxTokens) {
    formData.append("max_tokens", options.maxTokens);
  }

  // Add files
  if (Array.isArray(files)) {
    files.forEach((file) => {
      formData.append("files", file);
    });
  } else {
    formData.append("files", files);
  }

  console.log("🔄 Calling chat with upload API with:", {
    message: message.substring(0, 50) + "...",
    fileCount: Array.isArray(files) ? files.length : 1,
    options,
  });

  const response = await fetch(`${API_BASE_URL}/chat/upload`, {
    method: "POST",
    headers: createHeaders(appToken, false), // Don't include Content-Type for FormData
    body: formData,
  });

  return handleApiResponse(response, "Chat with upload");
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
  console.log(`${API_BASE_URL}/auth/google/verify-access-token`)
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