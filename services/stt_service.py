import assemblyai as aai
import os
import io
from typing import Optional
from dotenv import load_dotenv
import websockets
import logging

logger = logging.getLogger(__name__)

ASSEMBLYAI_REALTIME_URL = "wss://streaming.assemblyai.com/v3/ws?sample_rate=16000"

load_dotenv()
class STTService:
    def __init__(self):
        self.transcriber: Optional[aai.Transcriber] = None
        self._initialize_client()
    
    def _initialize_client(self):
        try:
            api_key = os.getenv("AssemblyAI_API_KEY")
            if not api_key:
                raise Exception("AssemblyAI_API_KEY not found in environment")
            
            aai.settings.api_key = api_key
            self.transcriber = aai.Transcriber()
        except Exception as e:
            print(f"Failed to initialize STT service: {e}")
            self.transcriber = None
    
    def is_available(self) -> bool:
        return self.transcriber is not None
    
    async def transcribe_audio(self, audio_data: bytes) -> str:
        if not self.transcriber:
            raise Exception("STT service unavailable")
        
        if len(audio_data) == 0:
            raise Exception("Empty audio file")
        
        transcript = self.transcriber.transcribe(audio_data)
        
        if not transcript.text:
            raise Exception("Could not transcribe audio")
        
        return transcript.text

    async def connect_to_assemblyai(self):
        api_key = os.getenv("AssemblyAI_API_KEY")
        if not api_key:
            raise Exception("AssemblyAI_API_KEY not found in environment")

        import websockets
        
        headers = {
            "Authorization": api_key
        }
        return await websockets.connect(
            ASSEMBLYAI_REALTIME_URL,
            additional_headers=headers
        )

stt_service = STTService()
