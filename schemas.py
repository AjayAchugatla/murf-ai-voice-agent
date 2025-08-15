from pydantic import BaseModel, Field
from typing import Optional

class TranscriptionResponse(BaseModel):
    """Schema for transcription responses"""
    transcript: str = Field(..., description="Transcribed text from audio")

class TTSEchoResponse(BaseModel):
    """Schema for TTS echo responses (transcribe + speak)"""
    audio_url: str = Field(..., description="URL of the generated audio file")
    transcript: str = Field(..., description="Original transcribed text")

class LLMQueryResponse(BaseModel):
    """Schema for LLM query responses"""
    query: str = Field(..., description="User's original query")
    response: str = Field(..., description="LLM generated response")
    audio_url: str = Field(..., description="URL of the audio response")

class AgentChatResponse(BaseModel):
    """Schema for agent chat responses"""
    query: str = Field(..., description="User's transcribed message")
    response: str = Field(..., description="Agent's response")
    audio_url: str = Field(..., description="URL of the audio response")

class ErrorResponse(BaseModel):
    """Schema for error responses"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    query: str = Field(..., description="User query that caused the error")
    response: str = Field(..., description="Fallback response message")
    audio_url: str = Field(..., description="URL of the error audio message")
