from fastapi import FastAPI,  Request, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from murf import Murf
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import assemblyai as aai
from google import genai
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
app = FastAPI()

# Fallback TTS response for errors
FALLBACK_AUDIO_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcCjiL0fPOeSsF"

# Fallback responses
FALLBACK_RESPONSES = {
    "stt_error": "I'm having trouble hearing you right now. Please try again in a moment.",
    "llm_error": "I'm having trouble thinking right now. Please try again in a moment.", 
    "tts_error": "I'm having trouble speaking right now, but I heard you.",
    "general_error": "I'm having trouble connecting right now. Please try again in a moment."
}

# Function to generate error voice messages
async def generate_error_voice(error_message: str) -> str:
    """Generate voice audio for error messages using Murf TTS"""
    try:
        if murf_client:
            error_audio = murf_client.text_to_speech.generate(
                text=error_message,
                voice_id="en-US-natalie",
            )
            return error_audio.audio_file
        else:
            return FALLBACK_AUDIO_URL
    except Exception as e:
        logger.error(f"Failed to generate error voice: {e}")
        return FALLBACK_AUDIO_URL

load_dotenv()
app = FastAPI()

# Initialize API clients with error handling
try:
    aai.settings.api_key = os.getenv("AssemblyAI_API_KEY")
    transcriber = aai.Transcriber()
    logger.info("AssemblyAI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize AssemblyAI: {e}")
    transcriber = None

try:
    murf_client = Murf(api_key=os.getenv("MURF_API_KEY"))
    logger.info("Murf client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Murf: {e}")
    murf_client = None

try:
    client = genai.Client()
    logger.info("Gemini client initialized successfully") 
except Exception as e:
    logger.error(f"Failed to initialize Gemini: {e}")
    client = None

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           
    allow_credentials=True,
    allow_methods=["*"],      
    allow_headers=["*"],      
)
class Input(BaseModel):
    text: str

sessionStorage = {}

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/tts")
async def text_to_speech(input: Input):
    try:
        if not murf_client:
            raise HTTPException(status_code=503, detail="TTS service unavailable")
            
        res = murf_client.text_to_speech.generate(
            text=input.text,
            voice_id="en-US-natalie",
        )
        return JSONResponse(content={
            "audio_url": res.audio_file,
        })
    except Exception as e:
        logger.error(f"TTS error: {e}")
        error_message = FALLBACK_RESPONSES["tts_error"]
        error_audio_url = await generate_error_voice(error_message)
        return JSONResponse(
            status_code=500,
            content={
                "error": "TTS service failed",
                "message": error_message,
                "query": "Text to speech conversion",
                "response": error_message,
                "audio_url": error_audio_url
            }
        )

@app.post("/upload-audio")
async def upload_audio(audioFile:UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, audioFile.filename)
    with open(file_location, "wb") as buffer:
        content = await audioFile.read()
        buffer.write(content)
    return JSONResponse(content={
        "name": audioFile.filename,
        "type": audioFile.content_type,
        "size": len(content)
    })

@app.post("/transcribe/file")
async def transcribe_file(audioFile:UploadFile = File(...)):
    data = await audioFile.read()
    transcript = transcriber.transcribe(data)
    return JSONResponse(content={
        "transcript": transcript.text,
    })

@app.post("/tts/echo")
async def text_to_speech_echo(audioFile: UploadFile = File(...)):
    data = await audioFile.read()
    transcript = transcriber.transcribe(data)
    res = murf_client.text_to_speech.generate(
        text=transcript.text,
        voice_id="en-US-natalie",
    )
    return JSONResponse(content={
        "audio_url": res.audio_file,
        "transcript": transcript.text,
    })
        
@app.post("/llm/query")
async def llm_query(audioFile: UploadFile = File(...)):
    data = await audioFile.read()
    transcript = transcriber.transcribe(data)
    response = client.models.generate_content(
    model="gemini-2.5-flash", contents=transcript.text)
    llmResponse = response.text
    audioResponse = murf_client.text_to_speech.generate(
        text=llmResponse,
        voice_id="en-US-natalie",
    )
    return JSONResponse(content={
        "query": transcript.text,
        "response": llmResponse,
        "audio_url": audioResponse.audio_file,
    })

@app.post("/agent/chat/{session_id}")
async def agent_chat(session_id: str, audioFile: UploadFile = File(...)):
    try:
        logger.info(f"Processing chat request for session: {session_id}")
        
        # Step 1: Speech-to-Text
        try:
            if not transcriber:
                raise Exception("STT service unavailable")
                
            data = await audioFile.read()
            if len(data) == 0:
                raise Exception("Empty audio file")
                
            transcript = transcriber.transcribe(data)
            if not transcript.text:
                raise Exception("Could not transcribe audio")
                
            user_message = transcript.text
            logger.info(f"STT successful: {user_message[:50]}...")
            
        except Exception as e:
            logger.error(f"STT error: {e}")
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
        
        # Step 2: Update conversation history
        try:
            if session_id in sessionStorage:
                sessionStorage[session_id].append({"role": "user", "content": user_message})
            else:
                sessionStorage[session_id] = [{"role": "user", "content": user_message}]
                
            # Build conversation context
            conversation_text = ""
            for msg in sessionStorage[session_id]:
                if msg["role"] == "user":
                    conversation_text += f"User: {msg['content']}\n"
                else:
                    conversation_text += f"Assistant: {msg['content']}\n"
                    
        except Exception as e:
            logger.error(f"Session management error: {e}")
            # Continue with just the current message
            conversation_text = f"User: {user_message}\n"
        
        # Step 3: LLM Processing
        try:
            if not client:
                raise Exception("LLM service unavailable")
                
            resp = client.models.generate_content(
                model="gemini-2.5-flash", contents=conversation_text
            )
            
            if not resp.text:
                raise Exception("Empty LLM response")
                
            llm_response = resp.text
            logger.info(f"LLM successful: {llm_response[:50]}...")
            
        except Exception as e:
            logger.error(f"LLM error: {e}")
            llm_response = FALLBACK_RESPONSES["llm_error"]
        
        # Step 4: Update conversation with assistant response
        try:
            sessionStorage[session_id].append({"role": "assistant", "content": llm_response})
        except Exception as e:
            logger.error(f"Failed to update session with assistant response: {e}")
        
        # Step 5: Text-to-Speech
        try:
            if not murf_client:
                raise Exception("TTS service unavailable")
                
            audioResponse = murf_client.text_to_speech.generate(
                text=llm_response,
                voice_id="en-US-natalie",
            )
            
            if not audioResponse.audio_file:
                raise Exception("TTS generated empty audio")
                
            audio_url = audioResponse.audio_file
            logger.info("TTS successful")
            
        except Exception as e:
            logger.error(f"TTS error: {e}")
            # Try to generate error voice message, if that fails too, use fallback
            try:
                audio_url = await generate_error_voice(FALLBACK_RESPONSES["tts_error"])
            except:
                audio_url = FALLBACK_AUDIO_URL
            # Note: We still return the original LLM response text
        
        return JSONResponse(content={
            "query": user_message,
            "response": llm_response,
            "audio_url": audio_url,
        })
        
    except Exception as e:
        logger.error(f"Unexpected error in agent_chat: {e}")
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
