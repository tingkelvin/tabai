// background.js - Background script to handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message in background:', message);

  switch (message.type) {
    case 'CHAT_MESSAGE':
      handleChatMessage(message.data, sendResponse);
      break;
    
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      break;
    
    case 'SAVE_SETTINGS':
      handleSaveSettings(message.data, sendResponse);
      break;
    
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }

  // Return true to indicate that the response is sent asynchronously
  return true;
});

// Handle chat messages - replace with your AI API call
async function handleChatMessage(data, sendResponse) {
  try {
    console.log('Processing chat message:', data.message);
    
    // Example: Call to external AI API
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-3.5-turbo',
    //     messages: [{ role: 'user', content: data.message }]
    //   })
    // });
    // const result = await response.json();
    
    // For now, simulate AI response
    const aiResponse = generateMockAIResponse(data.message);
    
    sendResponse({
      success: true,
      content: aiResponse,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    sendResponse({
      success: false,
      error: error.message,
      content: "I'm sorry, I encountered an error processing your message."
    });
  }
}

// Mock AI response generator (replace with actual AI integration)
function generateMockAIResponse(userMessage) {
  const responses = [
    "That's an interesting question! Let me help you with that.",
    "I understand what you're asking. Here's what I think...",
    "Great question! Based on what you've mentioned, I'd suggest...",
    "I can definitely help with that. Let me break it down for you.",
    "That's a thoughtful inquiry. Here's my perspective..."
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  return `${randomResponse} (You asked: "${userMessage}")`;
}

// Handle settings retrieval
function handleGetSettings(sendResponse) {
  chrome.storage.sync.get(['chatSettings'], (result) => {
    sendResponse({
      success: true,
      settings: result.chatSettings || {}
    });
  });
}

// Handle settings saving
function handleSaveSettings(data, sendResponse) {
  chrome.storage.sync.set({ chatSettings: data.settings }, () => {
    sendResponse({
      success: true,
      message: 'Settings saved successfully'
    });
  });
}