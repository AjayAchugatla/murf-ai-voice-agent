import assemblyai as aai
import os
from typing import Optional
from dotenv import load_dotenv

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

stt_service = STTService()
