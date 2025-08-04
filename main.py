from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from murf import Murf
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           
    allow_credentials=True,
    allow_methods=["*"],      
    allow_headers=["*"],      
)
class Input(BaseModel):
    text: str

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/tts")
async def text_to_speech(input : Input):
    client = Murf(
        api_key=os.getenv("MURF_API_KEY")
    )
    res = client.text_to_speech.generate(
        text=input.text,
        voice_id="en-US-natalie",
    )
    return JSONResponse(content={
        "audio_url": res.audio_file,
    })