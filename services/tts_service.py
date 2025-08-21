from murf import Murf
import os
import json
import websockets
import asyncio
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

    async def generate_streaming_speech(self, text: str, voice_id: Optional[str] = None) -> str:
        """Generate speech using Murf's WebSocket streaming API and return base64 audio"""
        if not text or text.strip() == "":
            raise Exception("Empty text provided")
        
        api_key = os.getenv("MURF_API_KEY")
        if not api_key:
            raise Exception("MURF_API_KEY not found in environment")
        
        voice = voice_id or self.default_voice_id
        
        try:
            # Connect to Murf's WebSocket streaming endpoint
            # Note: Replace with actual Murf WebSocket URL when available
            murf_ws_url = "wss://api.murf.ai/v1/speech/stream"  # Hypothetical URL
            
            # Create WebSocket connection with authentication
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            async with websockets.connect(murf_ws_url, additional_headers=headers) as websocket:
                # Send TTS request
                request_data = {
                    "text": text,
                    "voice_id": voice,
                    "format": "mp3",
                    "sample_rate": 22050
                }
                
                await websocket.send(json.dumps(request_data))
                print(f" Sent TTS request to Murf: '{text[:50]}{'...' if len(text) > 50 else ''}'")
                
                # Receive the audio response
                response = await websocket.recv()
                response_data = json.loads(response)
                
                if response_data.get("status") == "success" and response_data.get("audio_base64"):
                    base64_audio = response_data["audio_base64"]
                    print(f" Received base64 audio from Murf ({len(base64_audio)} characters)")
                    print(f"Base64 Audio: {base64_audio[:100]}...")  # Print first 100 chars
                    return base64_audio
                else:
                    raise Exception(f"Murf TTS error: {response_data.get('error', 'Unknown error')}")
                    
        except websockets.exceptions.ConnectionClosed as e:
            print(f"Murf WebSocket connection closed: {e}")
            # Fallback to regular API
            print("Falling back to regular Murf API...")
            return await self.generate_speech(text, voice_id)
            
        except Exception as e:
            print(f"Error in Murf streaming TTS: {e}")
            # Fallback to regular API
            print("Falling back to regular Murf API...")
            return await self.generate_speech(text, voice_id)


# Global TTS service instance
tts_service = TTSService()
