from fastapi import FastAPI, Request, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    TranscriptionResponse, TTSEchoResponse,
    LLMQueryResponse, AgentChatResponse, ErrorResponse
)
from services import stt_service, tts_service, llm_service


load_dotenv()
app = FastAPI(
    title="Murf AI Voice Agent",
    description="AI-powered voice agent with speech-to-text, LLM processing, and text-to-speech capabilities",
    version="1.0.0"
)

FALLBACK_AUDIO_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsF"


FALLBACK_RESPONSES = {
    "stt_error": "I'm having trouble hearing you right now. Please try again in a moment.",
    "llm_error": "I'm having trouble thinking right now. Please try again in a moment.", 
    "tts_error": "I'm having trouble speaking right now, but I heard you.",
    "general_error": "I'm having trouble connecting right now. Please try again in a moment."
}

async def generate_error_voice(error_message: str) -> str:
    """Generate voice audio for error messages using TTS service"""
    try:
        if tts_service.is_available():
            return await tts_service.generate_speech(error_message)
        else:
            return FALLBACK_AUDIO_URL
    except Exception as e:
        return FALLBACK_AUDIO_URL



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           
    allow_credentials=True,
    allow_methods=["*"],      
    allow_headers=["*"],      
)

sessionStorage = {}

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/transcribe/file", response_model=TranscriptionResponse)
async def transcribe_file(audioFile: UploadFile = File(...)):
    data = await audioFile.read()
    transcript = await stt_service.transcribe_audio(data)
    return TranscriptionResponse(
        transcript=transcript
    )

@app.post("/tts/echo", response_model=TTSEchoResponse)
async def text_to_speech_echo(audioFile: UploadFile = File(...)):
    data = await audioFile.read()
    transcript = await stt_service.transcribe_audio(data)
    audio_url = await tts_service.generate_speech(transcript)
    return TTSEchoResponse(
        audio_url=audio_url,
        transcript=transcript
    )
        
@app.post("/llm/query", response_model=LLMQueryResponse)
async def llm_query(audioFile: UploadFile = File(...)):
    data = await audioFile.read()
    transcript = await stt_service.transcribe_audio(data)
    llm_response = await llm_service.generate_response(transcript)
    audio_url = await tts_service.generate_speech(llm_response)
    return LLMQueryResponse(
        query=transcript,
        response=llm_response,
        audio_url=audio_url
    )

@app.post("/agent/chat/{session_id}", response_model=AgentChatResponse, responses={500: {"model": ErrorResponse}})
async def agent_chat(session_id: str, audioFile: UploadFile = File(...)):
    try:    
        try:
            if not stt_service.is_available():
                raise Exception("STT service unavailable")
                
            data = await audioFile.read()
            user_message = await stt_service.transcribe_audio(data)            
            
        except Exception as e:            
            error_message = FALLBACK_RESPONSES["stt_error"]
            error_audio_url = await generate_error_voice(error_message)
            return JSONResponse(
                status_code=500,
                content={
                    "error": "STT failed",
                    "message": error_message,
                    "query": "Audio transcription failed",
                    "response": error_message,
                    "audio_url": error_audio_url
                }
            )
        try:
            if session_id in sessionStorage:
                sessionStorage[session_id].append({"role": "user", "content": user_message})
            else:
                sessionStorage[session_id] = [{"role": "user", "content": user_message}]
                
            conversation_text = ""
            for msg in sessionStorage[session_id]:
                if msg["role"] == "user":
                    conversation_text += f"User: {msg['content']}\n"
                else:
                    conversation_text += f"Assistant: {msg['content']}\n"
                    
        except Exception as e:            
            conversation_text = f"User: {user_message}\n"
        
        try:
            if not llm_service.is_available():
                raise Exception("LLM service unavailable")
                
            llm_response = await llm_service.generate_response(conversation_text)            
            
        except Exception as e:            
            llm_response = FALLBACK_RESPONSES["llm_error"]
        try:
            sessionStorage[session_id].append({"role": "assistant", "content": llm_response})
        except Exception as e:
            pass
        try:
            if not tts_service.is_available():
                raise Exception("TTS service unavailable")
                
            audio_url = await tts_service.generate_speech(llm_response)            
            
        except Exception as e:            
            try:
                audio_url = await generate_error_voice(FALLBACK_RESPONSES["tts_error"])
            except:
                audio_url = FALLBACK_AUDIO_URL
        
        return AgentChatResponse(
            query=user_message,
            response=llm_response,
            audio_url=audio_url
        )
        
    except Exception as e:        
        error_message = FALLBACK_RESPONSES["general_error"]
        error_audio_url = await generate_error_voice(error_message)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Service temporarily unavailable",
                "message": error_message,
                "query": "Error processing request",
                "response": error_message,
                "audio_url": error_audio_url
            }
        )
