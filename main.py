import asyncio
import logging
from fastapi import FastAPI, Request, File, UploadFile, WebSocket
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
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


load_dotenv()
logger.info("Starting Murf AI Voice Agent application")

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
    logger.info(f"Root endpoint accessed from {request.client.host}")
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/transcribe/file", response_model=TranscriptionResponse)
async def transcribe_file(audioFile: UploadFile = File(...)):
    logger.info(f"Transcription request received - file: {audioFile.filename}, size: {audioFile.size}")
    data = await audioFile.read()
    transcript = await stt_service.transcribe_audio(data)
    logger.info(f"Transcription completed - length: {len(transcript)} characters")
    return TranscriptionResponse(
        transcript=transcript
    )

@app.post("/tts/echo", response_model=TTSEchoResponse)
async def text_to_speech_echo(audioFile: UploadFile = File(...)):
    logger.info(f"TTS Echo request received - file: {audioFile.filename}, size: {audioFile.size}")
    data = await audioFile.read()
    transcript = await stt_service.transcribe_audio(data)
    logger.info(f"TTS Echo transcription: {transcript[:100]}...")
    audio_url = await tts_service.generate_speech(transcript)
    logger.info(f"TTS Echo completed - audio URL generated")
    return TTSEchoResponse(
        audio_url=audio_url,
        transcript=transcript
    )
        
@app.post("/llm/query", response_model=LLMQueryResponse)
async def llm_query(audioFile: UploadFile = File(...)):
    logger.info(f"LLM query request received - file: {audioFile.filename}, size: {audioFile.size}")
    data = await audioFile.read()
    transcript = await stt_service.transcribe_audio(data)
    logger.info(f"LLM query transcription: {transcript[:100]}...")
    llm_response = await llm_service.generate_response(transcript)
    logger.info(f"LLM response generated: {llm_response[:100]}...")
    audio_url = await tts_service.generate_speech(llm_response)
    logger.info(f"LLM query completed - audio URL generated")
    return LLMQueryResponse(
        query=transcript,
        response=llm_response,
        audio_url=audio_url
    )

@app.post("/agent/chat/{session_id}", response_model=AgentChatResponse, responses={500: {"model": ErrorResponse}})
async def agent_chat(session_id: str, audioFile: UploadFile = File(...)):
    logger.info(f"Agent chat request - session: {session_id}, file: {audioFile.filename}, size: {audioFile.size}")
    try:    
        try:
            if not stt_service.is_available():
                raise Exception("STT service unavailable")
                
            data = await audioFile.read()
            user_message = await stt_service.transcribe_audio(data)
            logger.info(f"Session {session_id} - User message: {user_message[:100]}...")
            
        except Exception as e:
            logger.error(f"Session {session_id} - STT error: {e}")
            error_message = FALLBACK_RESPONSES["stt_error"]
            error_audio_url = await generate_error_voice(error_message)
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error="STT failed",
                    message=error_message,
                    query="Audio transcription failed",
                    response=error_message,
                    audio_url=error_audio_url
                )
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
            logger.info(f"Session {session_id} - LLM response: {llm_response[:100]}...")
            
        except Exception as e:
            logger.error(f"Session {session_id} - LLM error: {e}")
            llm_response = FALLBACK_RESPONSES["llm_error"]
        try:
            sessionStorage[session_id].append({"role": "assistant", "content": llm_response})
        except Exception as e:
            pass
        try:
            if not tts_service.is_available():
                raise Exception("TTS service unavailable")
                
            audio_url = await tts_service.generate_speech(llm_response)
            logger.info(f"Session {session_id} - TTS audio generated successfully")
            
        except Exception as e:
            logger.error(f"Session {session_id} - TTS error: {e}")
            try:
                audio_url = await generate_error_voice(FALLBACK_RESPONSES["tts_error"])
            except:
                audio_url = FALLBACK_AUDIO_URL
        
        logger.info(f"Session {session_id} - Agent chat completed successfully")
        return AgentChatResponse(
            query=user_message,
            response=llm_response,
            audio_url=audio_url
        )
        
    except Exception as e:
        logger.error(f"Session {session_id} - General error: {e}")
        error_message = FALLBACK_RESPONSES["general_error"]
        error_audio_url = await generate_error_voice(error_message)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Service temporarily unavailable",
                message=error_message,
                query="Error processing request",
                response=error_message,
                audio_url=error_audio_url
            )
        )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established for audio streaming")
    
    try:
        assembly_ws = await stt_service.connect_to_assemblyai()
        logger.info("Connected to AssemblyAI streaming service")

        async def receive_audio():
            try:
                while True:
                    pcm_chunk = await websocket.receive_bytes()
                    if pcm_chunk and len(pcm_chunk) > 0:
                        await assembly_ws.send(pcm_chunk)
                    
            except Exception as e:
                logger.warning(f"Error receiving WebSocket data: {e}")

        async def send_transcripts():
            import json
            try:
                while True:
                    result = await assembly_ws.recv()
                    try:
                        data = json.loads(result)
                        if data.get("type") == "Turn" and data.get("transcript"):
                            transcript_text = data["transcript"]
                            print(f"Transcript: {transcript_text}")

                            if data.get("end_of_turn", False):
                                print(f"Turn Complete: {transcript_text}")
                                llm_response = await llm_service.generate_response(transcript_text)
                                print(f"LLM Response: {llm_response}")
                                # turn_message = {
                                #     "type": "turn_complete",
                                #     "transcript": transcript_text,
                                #     "confidence": data.get("end_of_turn_confidence", 0),
                                #     "turn_order": data.get("turn_order", 0)
                                # }
                                # await websocket.send_text(json.dumps(turn_message))
                        
                        elif data.get("type") == "PartialTranscript" and data.get("text"):
                            transcript_text = data["text"]
                            print(f"Partial: {transcript_text}")

                            partial_message = {
                                "type": "partial_transcript",
                                "transcript": transcript_text
                            }
                            await websocket.send_text(json.dumps(partial_message))
                        
                        elif data.get("type") == "FinalTranscript" and data.get("text"):
                            transcript_text = data["text"]
                            print(f"Final: {transcript_text}")
                            final_message = {
                                "type": "final_transcript", 
                                "transcript": transcript_text
                            }
                            await websocket.send_text(json.dumps(final_message))

                        elif data.get("transcript"):
                            transcript_text = data["transcript"]
                            print(f"Transcript: {transcript_text}")

                    except json.JSONDecodeError:
                        logger.debug(f"Non-JSON message: {result}")
                        
            except Exception as e:
                logger.error(f"Error receiving transcripts: {e}")

        await asyncio.gather(receive_audio(), send_transcripts())
        
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        try:
            await assembly_ws.close()
        except:
            pass
