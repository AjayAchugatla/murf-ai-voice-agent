from google import genai
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
class LLMService:
    def __init__(self):
        self.client: Optional[genai.Client] = None
        self.model_name = "gemini-2.5-flash"
        self._initialize_client()
    
    def _initialize_client(self):
        try:
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise Exception("GOOGLE_API_KEY not found in environment")
            
            self.client = genai.Client()
        except Exception as e:
            print(f"Failed to initialize LLM service: {e}")
            self.client = None
    
    def is_available(self) -> bool:
        return self.client is not None
    
    async def generate_response(self, prompt: str) -> str:
        if not self.client:
            raise Exception("LLM service unavailable")
        
        if not prompt or prompt.strip() == "":
            raise Exception("Empty prompt provided")
        
        response = self.client.models.generate_content(
            model=self.model_name, 
            contents=prompt
        )
        
        if not response.text:
            raise Exception("Empty LLM response")
        
        return response.text

    async def generate_streaming_response(self, prompt: str):
        """Generate streaming response from LLM"""
        if not self.client:
            raise Exception("LLM service unavailable")
        
        if not prompt or prompt.strip() == "":
            raise Exception("Empty prompt provided")
        
        try:
            # Use the streaming API if available
            response = self.client.models.generate_content_stream(
                model=self.model_name, 
                contents=prompt
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"Streaming failed, falling back to regular generation: {e}")
            # Fallback to regular generation
            regular_response = await self.generate_response(prompt)
            yield regular_response


llm_service = LLMService()
