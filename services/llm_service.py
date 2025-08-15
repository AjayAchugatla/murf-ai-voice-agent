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


llm_service = LLMService()
