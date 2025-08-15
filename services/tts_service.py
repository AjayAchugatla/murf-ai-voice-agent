from murf import Murf
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class TTSService:    
    def __init__(self):
        self.client: Optional[Murf] = None
        self.default_voice_id = "en-US-natalie"
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Murf AI client"""
        try:
            api_key = os.getenv("MURF_API_KEY")
            if not api_key:
                raise Exception("MURF_API_KEY not found in environment")
            
            self.client = Murf(api_key=api_key)
        except Exception as e:
            print(f"Failed to initialize TTS service: {e}")
            self.client = None
    
    def is_available(self) -> bool:
        return self.client is not None
    
    async def generate_speech(self, text: str, voice_id: Optional[str] = None) -> str:
        if not self.client:
            raise Exception("TTS service unavailable")
        
        if not text or text.strip() == "":
            raise Exception("Empty text provided")
        
        voice = voice_id or self.default_voice_id
        
        response = self.client.text_to_speech.generate(
            text=text,
            voice_id=voice,
        )
        
        if not response.audio_file:
            raise Exception("TTS generated empty audio")
        
        return response.audio_file


# Global TTS service instance
tts_service = TTSService()
