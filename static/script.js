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

// Enhanced error handling with user feedback
function showError(message, isTemporary = true) {
    errorText.textContent = message;
    showElement(errorMessage);

    if (isTemporary) {
        setTimeout(() => {
            hideElement(errorMessage);
        }, 5000);
    }
}

function showSuccess(message) {
    uploadSuccessMessage.textContent = message;
    uploadSuccessMessage.style.color = '#28a745';
    showElement(uploadSuccessMessage);
    setTimeout(() => {
        hideElement(uploadSuccessMessage);
    }, 3000);
}

// Network error detection
function isNetworkError(error) {
    return error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Failed to fetch');
}

// Retry mechanism for failed requests
async function retryRequest(requestFn, maxRetries = 2, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
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

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Audio recording is not supported in your browser. Please use a modern browser like Chrome or Firefox.");
        resetButtonState();
        return;
    }

    console.log("getUserMedia supported.");
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
        })
        .then((stream) => {
            try {
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.onstop = async (e) => {
                    console.log("Recording stopped.");

                    try {
                        const blob = new Blob(chunks, { type: "audio/webm" });
                        chunks = [];

                        if (blob.size === 0) {
                            throw new Error("Recording produced no audio data");
                        }

                        await agentChat(blob);

                    } catch (error) {
                        console.error("Error processing recording:", error);
                        showError("Failed to process your recording. Please try again.");
                        resetButtonState();
                    } finally {
                        // Always clean up the stream
                        stream.getTracks().forEach(track => {
                            track.stop();
                        });
                    }
                };

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error("MediaRecorder error:", error);
                    showError("Recording failed. Please check your microphone permissions.");
                    resetButtonState();
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                // startButton.textContent = 'Recording...';

            } catch (error) {
                console.error("MediaRecorder creation failed:", error);
                showError("Could not start recording. Please check your microphone permissions.");
                resetButtonState();
                stream.getTracks().forEach(track => track.stop());
            }
        })
        .catch((err) => {
            console.error(`getUserMedia error: ${err}`);
            let errorMessage = "Could not access your microphone. ";

            if (err.name === 'NotAllowedError') {
                errorMessage += "Please allow microphone access and try again.";
            } else if (err.name === 'NotFoundError') {
                errorMessage += "No microphone found. Please connect a microphone.";
            } else {
                errorMessage += "Please check your microphone settings.";
            }

            showError(errorMessage);
            resetButtonState();
        });
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

const agentChat = async (blob) => {
    const formData = new FormData();
    formData.append('audioFile', blob, 'agent_chat_audio.webm');
    const sessionId = '1';

    try {
        // Show loading state
        // startButton.textContent = 'Processing...';
        startButton.disabled = true;

        const response = await fetch(`http://localhost:8000/agent/chat/${sessionId}`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        // Handle both success and error responses
        // Server always returns audio_url (either response or error audio)
        // queryElement.textContent = `Query: ${data.query || 'Processing...'}`;

        // Always play the audio response (success or error audio)
        if (data.audio_url) {
            responseAudioElement.src = data.audio_url;
            showElement(responseAudioElement);
            showElement(queryElement);

            // Handle audio playback errors
            responseAudioElement.onerror = () => {
                console.error('Audio playback failed');
                resetButtonState();
            };

            try {
                await responseAudioElement.play();
            } catch (playError) {
                console.error('Audio play error:', playError);
                resetButtonState();
            }
        } else {
            resetButtonState();
        }

    } catch (error) {
        console.error('Error in agent chat:', error);
        resetButtonState();
    }
}

function resetButtonState() {
    // startButton.textContent = 'Start Recording';
    startButton.disabled = false;
}

responseAudioElement.addEventListener('ended', () => {
    recordAudio();
})

// Stop conversation function
const stopConversation = () => {
    // Stop any ongoing recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
    }

    // Stop any playing audio
    if (responseAudioElement && !responseAudioElement.paused) {
        responseAudioElement.pause();
        responseAudioElement.currentTime = 0;
    }

    // Reset UI state
    resetUI();

    // Reset button states
    startButton.disabled = false;
    stopButton.disabled = true;
    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    // Show confirmation
    alert('Conversation stopped');
}