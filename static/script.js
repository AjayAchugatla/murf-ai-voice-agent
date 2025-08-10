// DOM Elements
const textInput = document.getElementById('text');
const generateBtn = document.getElementById('generateAudio');
const audioSection = document.getElementById('audioSection');
const generatedAudioElement = document.getElementById('generatedAudio');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const recordedAudioElement = document.querySelector('#recordedAudio');
const uploadSuccessMessage = document.getElementById('uploadSuccessMessage');
const transcriptElement = document.getElementById('transcript');
const queryElement = document.getElementById('query');
const responseAudioElement = document.getElementById('responseAudio');

let mediaRecorder;

let currentAudioUrl = null;
let chunks = [];


// Show/hide elements
function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    showElement(errorMessage);
    setTimeout(() => {
        hideElement(errorMessage);
    }, 5000);
}

// Reset UI state
function resetUI() {
    hideElement(audioSection);
    hideElement(errorMessage);
    hideElement(uploadSuccessMessage);
    hideElement(transcriptElement);
    hideElement(queryElement);
    hideElement(responseAudioElement);
    generatedAudioElement.src = '';
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Audio';
}

// Generate audio function
const generateAudio = async () => {
    const text = textInput.value.trim();

    // Validation
    if (!text) {
        showError('Please enter some text to convert to speech.');
        return;
    }
    try {
        hideElement(audioSection);
        hideElement(errorMessage);
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';

        const response = await fetch("http://localhost:8000/tts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        currentAudioUrl = data.audio_url;

        // Show audio player
        generatedAudioElement.src = currentAudioUrl;
        showElement(audioSection);
    } catch (error) {
        console.error('Error generating audio:', error);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Audio';
    }
};

const recordAudio = () => {
    resetUI();
    startButton.disabled = true;
    stopButton.disabled = false;
    hideElement(recordedAudioElement.parentElement);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("getUserMedia supported.");
        navigator.mediaDevices
            .getUserMedia(
                // constraints - only audio needed for this app
                {
                    audio: true,
                },
            )
            .then((stream) => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.onstop = async (e) => {
                    console.log("Recording stopped.");
                    const blob = new Blob(chunks, { type: "audio/webm" });
                    chunks = [];
                    // const audioURL = window.URL.createObjectURL(blob);
                    // recordedAudioElement.src = audioURL;
                    // await sendToserver(blob);
                    // Show the container instead of just the audio element
                    // const recordedAudioSection = recordedAudioElement.parentElement;
                    // showElement(recordedAudioSection);
                    // Transcribe the audio
                    // await transcribeAudio(blob);
                    // await convertToMURF(blob);
                    await llmAudioResponse(blob);
                    stream.getTracks().forEach(track => {
                        track.stop();
                    });
                }
                mediaRecorder.start();
                mediaRecorder.ondataavailable = (e) => {
                    chunks.push(e.data);
                };

            })

            // Error callback
            .catch((err) => {
                console.error(`The following getUserMedia error occurred: ${err}`);
            });
    } else {
        console.log("getUserMedia not supported on your browser!");
    }

}

const stopRecording = () => {
    startButton.disabled = false;
    stopButton.disabled = true;
    mediaRecorder.stop();
}

const sendToserver = async (blob) => {
    const formData = new FormData();
    const name = 'recorded_audio_' + Date.now() + '.webm';
    formData.append('audioFile', blob, name);
    try {
        const resp = await fetch("http://localhost:8000/upload-audio", {
            method: "POST",
            body: formData
        });
        const respData = await resp.json();
        if (respData.name) {
            showElement(uploadSuccessMessage);
            uploadSuccessMessage.textContent = `Audio uploaded successfully: ${respData.name} - ${respData.size} bytes`;
        }
    } catch (error) {
        console.error('Error uploading audio:', error);
        showError('Failed to upload audio. Please try again.');
    }
}

const transcribeAudio = async (blob) => {
    try {
        const formData = new FormData();
        const name = 'transcribed_audio_' + Date.now() + '.webm';
        formData.append('audioFile', blob, name);

        const response = await fetch("http://localhost:8000/transcribe/file", {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (data.transcript) {
            transcriptElement.textContent = `Transcript: ${data.transcript}`;
            showElement(transcriptElement);
        } else {
            showError('Transcription failed. Please try again.');
        }
    } catch (error) {
        console.error('Error transcribing audio:', error);
        showError(`Transcription error: ${error.message}`);
    }
}

const convertToMURF = async (blob) => {
    const formData = new FormData();
    formData.append('audioFile', blob, 'murf_audio.webm');
    try {
        const response = await fetch("http://localhost:8000/tts/echo", {
            method: "POST",
            body: formData
        })
        const data = await response.json();
        recordedAudioElement.src = data.audio_url;
        showElement(recordedAudioElement);
    } catch (error) {
        console.error('Error converting audio to MURF:', error);
    }
}

const llmAudioResponse = async (blob) => {
    const formData = new FormData();
    formData.append('audioFile', blob, 'llm_audio.webm');
    try {
        console.log('Sending audio file to LLM endpoint...');
        const response = await fetch("http://localhost:8000/llm/query", {
            method: "POST",
            body: formData
        })
        console.log('LLM endpoint response:');
        const data = await response.json();
        queryElement.textContent = `Query: ${data.query}`;
        responseAudioElement.src = data.audio_url;
        showElement(responseAudioElement);
        showElement(queryElement);
    } catch (error) {
        console.error('Error converting audio to LLM response:', error);
    }
}