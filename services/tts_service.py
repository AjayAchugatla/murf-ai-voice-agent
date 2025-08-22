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
            # Connect to Murf's WebSocket streaming endpoint with correct URL and auth
            murf_ws_url = f"wss://api.murf.ai/v1/speech/stream-input?api-key={api_key}&sample_rate=44100&channel_type=MONO&format=WAV"
            
            async with websockets.connect(murf_ws_url) as websocket:
                # Send voice configuration first
                voice_config_msg = {
                    "voice_config": {
                        "voiceId": voice,
                        "style": "Conversational",
                        "rate": 0,
                        "pitch": 0,
                        "variation": 1
                    }
                }
                await websocket.send(json.dumps(voice_config_msg))
                print(f"Sent voice config to Murf WebSocket")
                
                # Send text message
                text_msg = {
                    "text": text,
                    "end": True  # This closes the context
                }
                await websocket.send(json.dumps(text_msg))
                print(f"Sent text to Murf WebSocket: '{text[:50]}{'...' if len(text) > 50 else ''}'")
                
                # Collect all audio chunks
                audio_chunks = []
                try:
                    while True:
                        response = await websocket.recv()
                        data = json.loads(response)
                        print(f"Received from Murf: {data.keys() if isinstance(data, dict) else 'non-dict response'}")
                        
                        if "audio" in data:
                            audio_chunk = data["audio"]
                            audio_chunks.append(audio_chunk)
                            print(f"Received audio chunk ({len(audio_chunk)} characters)")
                            print(f"Audio chunk preview: {audio_chunk[:100]}...")  # Print first 100 chars
                        
                        if data.get("final"):
                            print("Received final audio chunk")
                            break
                            
                except websockets.exceptions.ConnectionClosed:
                    print("Murf WebSocket connection closed")
                
                # Combine all audio chunks
                if audio_chunks:
                    combined_base64 = ''.join(audio_chunks)
                    print(f"Combined audio: {len(combined_base64)} characters")
                    print(f"Complete Base64 Audio Data:")
                    print(f"{combined_base64}")
                    print(f"Base64 Audio Preview (first 200 chars): {combined_base64[:200]}...")
                    return combined_base64
                else:
                    raise Exception("No audio received from Murf WebSocket")
                    
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
