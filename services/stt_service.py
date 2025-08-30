import assemblyai as aai
import os
import tempfile
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
        
        # Save bytes to temporary file since AssemblyAI expects file path
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe using file path
            transcript = self.transcriber.transcribe(temp_file_path)
            
            if transcript.error:
                raise Exception(f"Transcription failed: {transcript.error}")
            
            if not transcript.text:
                raise Exception("Could not transcribe audio - no text returned")
            
            return transcript.text
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass

stt_service = STTService()
