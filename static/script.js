// DOM Elements
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
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

function showError(message) {
    alert(message);
    console.error(message);
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
    hideElement(queryElement);
    hideElement(responseAudioElement);
}


const recordAudio = () => {
    resetUI();
    startButton.disabled = true;
    stopButton.disabled = false;

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

const agentChat = async (blob) => {
    const formData = new FormData();
    formData.append('audioFile', blob, 'agent_chat_audio.webm');
    const sessionId = '1';

    try {
        startButton.disabled = true;

        const response = await fetch(`http://localhost:8000/agent/chat/${sessionId}`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        if (data.audio_url) {
            queryElement.textContent = `Query: ${data.query || 'Processing...'}`;
            responseAudioElement.src = data.audio_url;
            showElement(responseAudioElement);
            showElement(queryElement);
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
        showError('Failed to process your request. Please try again.');
        resetButtonState();
    }
}

function resetButtonState() {
    startButton.disabled = false;
}

responseAudioElement.addEventListener('ended', () => {
    recordAudio();
})

const stopConversation = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
    }

    if (responseAudioElement && !responseAudioElement.paused) {
        responseAudioElement.pause();
        responseAudioElement.currentTime = 0;
    }

    resetUI();

    startButton.disabled = false;
    stopButton.disabled = true;
    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    alert('Conversation stopped');
}