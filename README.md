# TabAI - AI-Powered Browser Extension

<div align="center">
  <img src="intro.gif" alt="TabAI Demo" width="800"/>
</div>

TabAI is an intelligent browser extension that brings AI capabilities directly to your web browsing experience. It combines a Chrome extension frontend with a FastAPI backend to provide seamless AI-powered interactions, file processing, and web automation.

## 🚀 Features

### Core Functionality
- **AI Chat Interface**: Interactive chat with Google Gemini 2.0 Flash LLM
- **File Processing**: Upload and process various file types (PDF, images, documents)
- **Web Search Integration**: Enhanced responses with real-time web search
- **Agent Mode**: Automated web page interaction and task execution
- **DOM Manipulation**: Advanced page analysis and element interaction
- **Google Authentication**: Secure OAuth2 integration with Google accounts

### Browser Extension Features
- **Floating Widget**: Draggable and resizable chat interface
- **Content Script Integration**: Works on any webpage
- **Popup Interface**: Extension management and settings
- **State Management**: Persistent chat history and user preferences
- **File Upload**: Direct file processing from the browser
- **Real-time Notifications**: User feedback and status updates

### Backend Services
- **Authentication API**: Google OAuth2 token verification
- **LLM Processing**: Google Gemini integration with image support
- **Database Management**: PostgreSQL with SQLAlchemy ORM
- **CORS Support**: Cross-origin resource sharing for extension
- **Logging System**: Comprehensive application logging

## 🛠 Tech Stack

### Frontend (Browser Extension)
- **Framework**: React 19.1.0 with TypeScript
- **Extension Framework**: WXT (Web Extension Toolkit)
- **Styling**: Tailwind CSS 4.1.10
- **Icons**: Lucide React
- **State Management**: Custom hooks and context
- **Build Tool**: Vite with WXT configuration

### Backend (API Server)
- **Framework**: FastAPI 0.115.12
- **Database**: PostgreSQL with SQLAlchemy 2.0.28
- **Authentication**: Google OAuth2 with PyJWT
- **AI Integration**: Google Gemini API (genai 1.20.0)
- **Database Migrations**: Alembic 1.13.1
- **Environment**: Python 3.x with Pydantic settings

### Development & Deployment
- **Containerization**: Docker
- **Database Migrations**: Alembic
- **Environment Management**: Python-dotenv
- **Logging**: Custom logging utilities
- **CORS**: FastAPI CORS middleware

## 📁 Project Structure

```
tabai/
├── backend/                 # FastAPI backend server
│   ├── app/
│   │   ├── api/            # API endpoints (auth, llm)
│   │   ├── core/           # Core configuration and security
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions
│   ├── migrations/         # Database migrations
│   └── requirements.txt    # Python dependencies
├── frontend/               # Chrome extension
│   ├── entrypoints/
│   │   ├── background/     # Service worker
│   │   ├── content/        # Content scripts
│   │   └── popup/          # Extension popup
│   ├── common/             # Shared types and utilities
│   └── package.json        # Node.js dependencies
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL database
- Google Cloud Console project (for OAuth2 and Gemini API)

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   Create `.env.dev` file:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/tabai_db
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback
   APP_SECRET_KEY=your_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   APP_ENV=dev
   ```

3. **Database Setup**
   ```bash
   # Create database
   python scripts/create_db.py
   
   # Run migrations
   alembic upgrade head
   ```

4. **Start Backend Server**
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Development Mode**
   ```bash
   npm run dev
   ```

3. **Build Extension**
   ```bash
   npm run build
   ```

4. **Load Extension in Chrome**
   - Open Chrome Extensions page (`chrome://extensions/`)
   - Enable Developer mode
   - Click "Load unpacked" and select the `output/chrome-mv3` folder

## 🔧 Configuration

### Extension Permissions
The extension requires the following permissions:
- `storage`: For persistent state management
- `identity`: For Google OAuth2 authentication
- `activeTab`: For page content access
- `scripting`: For content script injection

### API Endpoints

#### Authentication
- `POST /auth/google/verify-token` - Verify Google ID token
- `POST /auth/google/access-token` - Exchange access token

#### LLM Processing
- `POST /chat` - Basic chat with LLM
- `POST /chat/with-image` - Chat with image support
- `POST /chat/with-search` - Chat with web search

## 🎯 Key Features Explained

### AI Chat Interface
- **Multi-modal Support**: Text and image processing
- **Context Awareness**: Maintains conversation history
- **Search Integration**: Optional web search for enhanced responses
- **Agent Mode**: Automated task execution on web pages

### File Processing
- **Multiple Formats**: PDF, images, documents
- **Content Extraction**: Automatic text extraction from files
- **Context Integration**: Files become part of chat context

### DOM Manipulation
- **Element Detection**: Identifies clickable elements
- **Automation**: Programmatic page interaction
- **State Tracking**: Monitors page changes and updates

### State Management
- **Persistent Storage**: Chat history and settings
- **Cross-tab Sync**: State synchronization across browser tabs
- **Real-time Updates**: Live state updates and notifications

## 🔒 Security

- **OAuth2 Authentication**: Secure Google authentication
- **JWT Tokens**: Secure session management
- **CORS Protection**: Configured cross-origin policies
- **Input Validation**: Pydantic model validation
- **Environment Variables**: Secure configuration management

## 🧠 DOM Understanding & Agent Intelligence

TabAI's agent system provides sophisticated web page understanding and automation capabilities through advanced DOM analysis and interaction.

### DOM Tree Analysis
The agent builds a comprehensive understanding of web pages through:

#### **Interactive Element Detection**
- **Clickable Elements**: Automatically identifies buttons, links, form inputs, and interactive components
- **Element Highlighting**: Visual highlighting system with numbered indices for precise targeting
- **Viewport Analysis**: Detects elements within and outside the current viewport
- **Accessibility Support**: Recognizes ARIA attributes and semantic HTML elements

#### **DOM Tree Construction**
```typescript
// The agent builds a hierarchical DOM tree with:
interface ElementDomNode {
    tagName: string;           // HTML tag name
    xpath: string;            // XPath for precise element location
    attributes: Record<string, string>; // All element attributes
    isInteractive: boolean;    // Whether element can be interacted with
    isInViewport: boolean;     // Visibility within current viewport
    highlightIndex: number;   // Unique identifier for agent targeting
    viewportCoordinates: CoordinateSet; // Precise positioning data
}
```

#### **Element Identification System**
- **CSS Selectors**: Enhanced CSS selector generation for reliable element targeting
- **XPath Support**: Fallback XPath-based element location
- **Hash-based Identification**: SHA256 hashing for element uniqueness and change detection
- **Iframe Support**: Cross-frame element detection and interaction

### Agent Action System

#### **Supported Actions**
1. **Click Actions**: Precise clicking of buttons, links, and interactive elements
2. **Fill Actions**: Text input into form fields with validation
3. **Select Actions**: Dropdown and select element manipulation
4. **Scroll Actions**: Page navigation and viewport management

#### **Action Execution Flow**
```typescript
// Agent processes user requests and generates action sequences
interface AgentAction {
    id: number;              // Element highlight index
    type: 'click' | 'fill' | 'select' | 'scroll';
    value?: string;          // Text to fill or option to select
}

// Example agent response:
{
    "reasoning": "I need to fill the email field and click submit",
    "actions": [
        { "id": 5, "type": "fill", "value": "user@example.com" },
        { "id": 12, "type": "click" }
    ]
}
```

### Page State Management

#### **Dynamic Page Monitoring**
- **Change Detection**: Monitors DOM changes and page state updates
- **Stability Detection**: Waits for page stability before executing actions
- **State Persistence**: Maintains page state across navigation and interactions
- **Real-time Updates**: Live monitoring of page changes and element availability

#### **Context Awareness**
```typescript
interface PageState {
    url: string;                    // Current page URL
    title: string;                  // Page title
    domSnapshot: {                  // Complete DOM analysis
        root: ElementDomNode;       // Root DOM tree
        selectorMap: Map<number, ElementDomNode>; // Element lookup map
    };
    timestamp: number;              // State capture time
}
```

### Intelligent Element Interaction

#### **Multi-frame Support**
- **Iframe Detection**: Automatically handles nested iframes and shadow DOM
- **Cross-frame Navigation**: Seamless interaction across different frame contexts
- **Context Switching**: Maintains proper document context for element location

#### **Element Validation**
- **Visibility Checks**: Ensures elements are visible and interactable
- **Type Validation**: Validates action compatibility with element types
- **Error Recovery**: Graceful handling of missing or changed elements

#### **Performance Optimization**
- **Caching System**: Caches DOM queries and element positions
- **Lazy Loading**: On-demand element analysis and highlighting
- **Efficient Traversal**: Optimized DOM tree traversal algorithms
- **Memory Management**: Automatic cleanup of highlights and observers

### Agent Reasoning & Decision Making

#### **Context-Aware Actions**
The agent analyzes the current page state and user intent to:
- **Identify Relevant Elements**: Finds the most appropriate elements for the task
- **Generate Action Sequences**: Creates logical step-by-step action plans
- **Handle Edge Cases**: Manages dynamic content, popups, and navigation
- **Provide Feedback**: Explains reasoning behind each action

#### **Adaptive Behavior**
- **Learning from Context**: Understands page structure and common patterns
- **Error Handling**: Recovers from failed actions and provides alternatives
- **User Guidance**: Provides clear feedback on what actions will be performed
- **Safety Checks**: Validates actions before execution to prevent unintended consequences

This sophisticated DOM understanding system enables TabAI to interact with any website as intelligently as a human user, while providing the speed and precision of automated systems.

## 🚀 Deployment

### Backend Deployment
```bash
# Using Docker
docker build -t tabai-backend .
docker run -p 8000:8000 tabai-backend

# Or using the deployment script
./deploy.sh
```

### Extension Distribution
```bash
# Build for production
npm run build

# Create distribution package
npm run zip
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the GitHub Issues page
- Review the documentation in each module
- Contact the development team

---

**TabAI** - Bringing AI to your browser, one tab at a time! 🚀