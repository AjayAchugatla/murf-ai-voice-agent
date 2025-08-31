# 🎙️ Murf AI Voice Agent

A modern, production-ready voice-to-voice conversational AI agent with a sleek dark interface and robust architecture. Talk naturally with AI and get spoken responses in real-time.

## ✨ Features

### Core Voice Capabilities
- **Voice Conversations** - Speak naturally and get AI responses in voice
- **Real-time Processing** - Fast speech recognition and response generation with optimized audio buffering
- **Session Management** - Maintains conversation context across interactions
- **Smart Audio Handling** - Intelligent audio buffering to meet AssemblyAI duration requirements

### AI-Powered Skills
- **Internet Search** - Ask questions and get real-time web search results via Tavily API
- **Weather Lookup** - Get current weather conditions for any location using Open-Meteo API
- **Website Navigation** - Voice commands to open websites (YouTube, Google, GitHub, etc.)
- **Natural Conversations** - Context-aware responses powered by Google Gemini 2.5 Flash

### User Interface & Experience
- **Modern UI** - Dark theme with glass-morphism design and smooth animations
- **In-Browser Configuration** - Secure API key management with visual status indicators  
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Conversation History** - View and clear conversation logs with elegant chat bubbles
- **Visual Status Feedback** - Real-time status indicators for connection, listening, thinking, and speaking states

### Technical Excellence
- **Type Safety** - Pydantic schemas for robust API validation
- **Service Architecture** - Clean separation of concerns with dedicated service classes
- **Production Ready** - Optimized code with comprehensive error handling and logging

## 🏗️ Architecture

### Service-Based Design
- **STT Service** - AssemblyAI speech-to-text integration with intelligent audio buffering
- **LLM Service** - Google Gemini AI processing with integrated skill routing
- **TTS Service** - Murf AI text-to-speech generation with streaming audio
- **Search Service** - Tavily API integration for real-time internet search
- **Weather Service** - Open-Meteo API integration for weather information
- **Type Safety** - Pydantic models for request/response validation

### Tech Stack
- **Backend**: FastAPI (Python) with WebSocket support and Pydantic validation
- **Frontend**: HTML5, CSS3, JavaScript with manual CSS (no frameworks)
- **Speech-to-Text**: AssemblyAI with optimized audio chunking
- **AI Model**: Google Gemini 2.5 Flash with function calling
- **Text-to-Speech**: Murf AI with real-time streaming
- **Search**: Tavily API for web search capabilities
- **Weather**: Open-Meteo API for weather data

## 🚀 Quick Setup

### Prerequisites
- Python 3.8+
- Modern web browser with microphone access

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/AjayAchugatla/murf-ai-voice-agent.git
cd murf-ai-voice-agent
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure API keys**

Copy the example environment file and add your API keys:
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
# AssemblyAI Configuration (Speech-to-Text)
AssemblyAI_API_KEY=your_assemblyai_api_key_here

# Google Gemini Configuration (Language Model)  
GOOGLE_API_KEY=your_google_gemini_api_key_here

# Murf AI Configuration (Text-to-Speech)
MURF_API_KEY=your_murf_api_key_here

# Tavily Configuration (Internet Search) - Optional
TAVILY_API_KEY=your_tavily_api_key_here
```

4. **Run the application**
```bash
uvicorn main:app --reload
```

5. **Open in browser**
```
http://localhost:8000
```

## 🎮 Usage

### Getting Started
1. **Open the web interface** at `http://localhost:8000`
2. **Configure API keys** by clicking the settings gear icon in the top-right corner
3. **Grant microphone access** when prompted by your browser

### Voice Commands & Capabilities
1. **Start Recording**: Click the microphone button to begin voice input
2. **Natural Conversations**: Speak naturally - the AI maintains context across the conversation
3. **Internet Search**: Ask questions like "What's happening with AI today?" or "Search for Python tutorials"
4. **Weather Queries**: Ask "What's the weather in New York?" or "How's the weather today?"
5. **Website Navigation**: Say "Open YouTube" or "Go to GitHub" to open websites
6. **Stop Recording**: Click the microphone button again to stop and process your voice

### Example Voice Commands
- *"What's the latest news about space exploration?"* - Internet search
- *"What's the weather like in Tokyo right now?"* - Weather lookup
- *"Open YouTube"* - Website navigation  
- *"Tell me a joke"* - Natural conversation
- *"How do I deploy a FastAPI application?"* - Technical questions with search
- *"Clear the conversation"* - Reset chat history

## 📁 Project Structure

```
murf-ai-voice-agent/
├── main.py              # FastAPI server with WebSocket support and skill routing
├── schemas.py           # Pydantic models for type safety and validation
├── services/            # Service layer architecture
│   ├── __init__.py      # Service exports
│   ├── stt_service.py   # AssemblyAI speech-to-text with audio buffering
│   ├── llm_service.py   # Google Gemini LLM with function calling
│   └── tts_service.py   # Murf AI text-to-speech with streaming
├── templates/           
│   └── index.html       # Modern voice interface with configuration modal
├── static/
│   ├── style.css        # Manual CSS with glass-morphism design
│   ├── script.js        # Voice recording with WebSocket and modal handling
│   └── audio-processor.js  # AudioWorklet for optimized audio processing
│   └── script.js        # Voice recording with WebSocket and modal handling
│   └── audio-processor.js  # AudioWorklet for optimized audio processing
├── uploads/             # Temporary audio file storage
├── .env                 # API configuration (create from .env.example)
├── .env.example         # Environment template with all API keys
├── requirements.txt     # Python dependencies
└── README.md           # Comprehensive documentation
```

## 🔧 API Endpoints

The application provides clean, type-safe API endpoints with comprehensive validation:

### Core Voice Endpoints
- `GET /` - Modern web interface with configuration modal
- `WS /ws/{session_id}` - WebSocket for real-time voice conversations
- `POST /stt/transcribe` - Speech-to-text transcription with audio buffering
- `POST /tts/echo` - Text-to-speech with transcription echo
- `POST /llm/query` - LLM query processing with audio response

### Enhanced AI Capabilities
- `POST /agent/chat/{session_id}` - Full voice agent with integrated skills
- Built-in internet search via Tavily API integration
- Weather information via Open-Meteo API integration  
- Website opening commands with predefined URL mappings
- Context-aware conversation with memory across sessions

All endpoints return structured responses with proper error handling and logging.

## 🔑 API Keys Setup

### AssemblyAI (Speech-to-Text)
1. Sign up at [AssemblyAI](https://www.assemblyai.com/)
2. Get your API key from the dashboard
3. Add to `.env` as `AssemblyAI_API_KEY`

### Google Gemini (Language Model)
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create a project and generate an API key
3. Add to `.env` as `GOOGLE_API_KEY`

### Murf AI (Text-to-Speech)
1. Register at [Murf AI](https://murf.ai/)
2. Subscribe to get API access
3. Add to `.env` as `MURF_API_KEY`

### Tavily AI (Internet Search) - Optional
1. Sign up at [Tavily](https://tavily.com/)
2. Get your API key from the dashboard
3. Add to `.env` as `TAVILY_API_KEY`
4. **Note**: Without this key, search functionality will be disabled but all other features work normally

## 🎯 AI Skills & Capabilities

### Smart Voice Commands
The AI agent includes built-in skills that are automatically triggered based on your voice input:

#### 🔍 Internet Search
- **Trigger**: Questions about current events, recent information, or "search for..."
- **Examples**: 
  - *"What's the latest news about AI?"*
  - *"Search for Python FastAPI tutorials"*
  - *"What happened in the world today?"*
- **Powered by**: Tavily API for real-time web search

#### 🌤️ Weather Information  
- **Trigger**: Weather-related questions
- **Examples**:
  - *"What's the weather in London?"*
  - *"How's the weather today?"*
  - *"Will it rain in New York tomorrow?"*
- **Powered by**: Open-Meteo API for accurate weather data

#### 🌐 Website Navigation
- **Trigger**: "Open..." or "Go to..." commands
- **Supported Sites**: YouTube, Google, GitHub, Stack Overflow, Reddit, Wikipedia, and more
- **Examples**:
  - *"Open YouTube"*
  - *"Go to GitHub"*  
  - *"Navigate to Stack Overflow"*

#### 💬 Natural Conversations
- **Trigger**: General questions, casual conversation
- **Capabilities**: Context awareness, follow-up questions, explanations
- **Examples**:
  - *"Tell me about machine learning"*
  - *"Can you explain quantum computing?"*
  - *"What's the difference between AI and ML?"*

## 🚀 Development

**Local Development:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Production:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 🎯 Recent Updates

### Major Feature Additions (Latest)
- ✅ **Internet Search Integration** - Real-time web search using Tavily API for current information
- ✅ **Weather Lookup** - Get weather conditions for any location via Open-Meteo API
- ✅ **Website Navigation** - Voice commands to open popular websites (YouTube, Google, GitHub, etc.)
- ✅ **Audio Buffering Optimization** - Fixed AssemblyAI duration violations with intelligent audio chunking
- ✅ **In-Browser API Configuration** - Secure configuration modal with visual status indicators
- ✅ **Enhanced UI/UX** - Conversation history, status feedback, and improved responsive design

### Technical Improvements
- ✅ **WebSocket Integration** - Real-time bidirectional communication for voice conversations
- ✅ **Function Calling** - Google Gemini integration with structured skill routing
- ✅ **Audio Processing** - Custom AudioWorklet for optimized real-time audio handling
- ✅ **Error Handling** - Comprehensive error handling with graceful degradation
- ✅ **Manual CSS** - Removed framework dependencies for better performance and control

### Code Quality & Architecture  
- ✅ **Pydantic Schemas** - Added type safety with comprehensive validation models
- ✅ **Service Architecture** - Separated 3rd party integrations into dedicated service classes
- ✅ **Code Cleanup** - Removed unused imports, variables, and redundant code
- ✅ **Frontend Optimization** - Consolidated CSS, cleaned HTML structure, optimized JavaScript
- ✅ **Production Ready** - Optimized for deployment with proper configuration management

### Architecture Benefits
- **Maintainability** - Clean separation between API logic and service integrations
- **Testability** - Service classes can be easily mocked and tested
- **Type Safety** - Pydantic models prevent runtime errors and improve API documentation
- **Scalability** - Modular design allows easy addition of new services and skills
- **Reliability** - Comprehensive error handling, audio buffering, and graceful degradation


Made with ❤️ by [Ajay Achugatla](https://github.com/AjayAchugatla)