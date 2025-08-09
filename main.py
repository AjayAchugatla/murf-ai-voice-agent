from fastapi import FastAPI,  Request, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from murf import Murf
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import assemblyai as aai
from google import genai

load_dotenv()
app = FastAPI()
aai.settings.api_key = os.getenv("AssemblyAI_API_KEY")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

transcriber = aai.Transcriber()
murf_client = Murf(api_key=os.getenv("MURF_API_KEY"))
client = genai.Client()

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
    res = murf_client.text_to_speech.generate(
        text=input.text,
        voice_id="en-US-natalie",
    )
    return JSONResponse(content={
        "audio_url": res.audio_file,
    })

@app.post("/upload-audio")
async def upload_audio(audioFile:UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, audioFile.filename)
    with open(file_location, "wb") as buffer:
        content = await audioFile.read()
        buffer.write(content)
    return JSONResponse(content={
        "name": audioFile.filename,
        "type": audioFile.content_type,
        "size": len(content)
    })

@app.post("/transcribe/file")
async def transcribe_file(audioFile:UploadFile = File(...)):
    data = await audioFile.read()
    transcript = transcriber.transcribe(data)
    return JSONResponse(content={
        "transcript": transcript.text,
    })

@app.post("/tts/echo")
async def text_to_speech_echo(audioFile: UploadFile = File(...)):
    data = await audioFile.read()
    transcript = transcriber.transcribe(data)
    res = murf_client.text_to_speech.generate(
        text=transcript.text,
        voice_id="en-US-natalie",
    )
    return JSONResponse(content={
        "audio_url": res.audio_file,
        "transcript": transcript.text,
    })
        
@app.post("/llm/query")
async def llm_query(prompt:Input):
    response = client.models.generate_content(
    model="gemini-2.5-flash", contents=prompt)

    return JSONResponse(content={
        "response": response.text
    })