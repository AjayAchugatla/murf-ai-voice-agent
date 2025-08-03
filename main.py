from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from murf import Murf
import os
# import httpx
load_dotenv()
app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/tts")
async def text_to_speech(text: str = Form(...)):
    client = Murf(
        api_key=os.getenv("MURF_API_KEY")
    )
    res = client.text_to_speech.generate(
        text=text,
        voice_id="en-US-natalie",
    )
    return res.audio_file