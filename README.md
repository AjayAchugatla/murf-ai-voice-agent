# 🎙️ Murf AI Voice Agent

A modern voice-to-voice conversational AI agent with a sleek dark interface. Talk naturally with AI and get spoken responses in real-time.

## ✨ Features

- **Voice Conversations** - Speak naturally and get AI responses in voice
- **Modern UI** - Dark theme with glass-morphism design and smooth animations  
- **Real-time Processing** - Fast speech recognition and response generation
- **Session Management** - Maintains conversation context
- **Responsive Design** - Works on desktop, tablet, and mobile

## �️ Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Speech-to-Text**: AssemblyAI
- **AI Model**: Google Gemini 2.5 Flash
- **Text-to-Speech**: Murf AI

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
Create a `.env` file:
```env
AssemblyAI_API_KEY=your_assemblyai_key
GOOGLE_API_KEY=your_gemini_key  
MURF_API_KEY=your_murf_key
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

1. Click the **toggle button** to start/stop recording
2. Speak clearly into your microphone
3. The AI will process your speech and respond with voice
4. Continue the conversation naturally

## 📁 Project Structure

```
murf-ai-voice-agent/
├── main.py              # FastAPI server
├── templates/           
│   └── index.html       # Voice interface
├── static/
│   ├── style.css        # Modern dark theme styling
│   └── script.js        # Voice recording functionality
├── uploads/             # Temporary audio files
├── .env                 # API keys (create this)
├── requirements.txt     # Dependencies
└── README.md           # Documentation
```

## � API Keys Setup

### AssemblyAI
- Sign up at [AssemblyAI](https://www.assemblyai.com/)
- Get your API key from the dashboard

### Google Gemini  
- Visit [Google AI Studio](https://aistudio.google.com/)
- Create a project and generate an API key

### Murf AI
- Register at [Murf AI](https://murf.ai/)
- Subscribe to get API access

## 🚀 Deployment

**Local Development:**
```bash
uvicorn main:app --reload
```

**Production:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```


Made with ❤️ by [Ajay Achugatla](https://github.com/AjayAchugatla)