// DOM Elements
const recordButton = document.getElementById('recordButton');
const queryElement = document.getElementById('query');
const responseAudioElement = document.getElementById('responseAudio');

let mediaRecorder;
let isRecording = false;
let isProcessing = false;
let chunks = [];

// Show/hide elements
function showElement(element) {
    element?.classList.remove('hidden');
}

function hideElement(element) {
    element?.classList.add('hidden');
}

function showError(message) {
    console.error(message);
    alert(message);
}

// Toggle recording function
function toggleRecording() {
    if (isProcessing) return;

    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

// Update button state
function updateButtonState(state) {
    if (!recordButton) return;

    const btnIcon = recordButton.querySelector('.btn-icon');
    const btnText = recordButton.querySelector('.btn-text');

    if (!btnIcon || !btnText) return;

    recordButton.className = 'record-btn';

    switch (state) {
        case 'idle':
            btnIcon.textContent = '🎤';
            btnText.textContent = 'Start Recording';
            recordButton.disabled = false;
            isRecording = false;
            isProcessing = false;
            break;
        case 'recording':
            btnIcon.textContent = '⏹️';
            btnText.textContent = 'Stop Recording';
            recordButton.classList.add('recording');
            recordButton.disabled = false;
            isRecording = true;
            isProcessing = false;
            break;
        case 'processing':
            btnIcon.textContent = '⏳';
            btnText.textContent = 'Processing...';
            recordButton.classList.add('processing');
            recordButton.disabled = true;
            isRecording = false;
            isProcessing = true;
            break;
    }
}

// Reset UI state
function resetUI() {
    hideElement(queryElement);
    updateButtonState('idle');
}

const startRecording = () => {
    resetUI();
    updateButtonState('recording');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Audio recording is not supported in your browser. Please use a modern browser like Chrome or Firefox.");
        updateButtonState('idle');
        return;
    }

    navigator.mediaDevices
        .getUserMedia({
            audio: true,
        })
        .then((stream) => {
            try {
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.onstop = async (e) => {
                    updateButtonState('processing');

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
                        updateButtonState('idle');
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
                    updateButtonState('idle');
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();

            } catch (error) {
                console.error("MediaRecorder creation failed:", error);
                showError("Could not start recording. Please check your microphone permissions.");
                updateButtonState('idle');
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
            updateButtonState('idle');
        });
}

const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

const agentChat = async (blob) => {
    const formData = new FormData();
    formData.append('audioFile', blob, 'agent_chat_audio.webm');
    const sessionId = '1';

    try {
        const response = await fetch(`http://localhost:8000/agent/chat/${sessionId}`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.audio_url) {
            queryElement.textContent = `Query: ${data.query || 'Processing...'}`;
            responseAudioElement.src = data.audio_url;
            showElement(queryElement);

            responseAudioElement.onerror = () => {
                console.error('Audio playback failed');
                updateButtonState('idle');
            };

            responseAudioElement.onended = () => {
                // Auto-start next recording after AI response finishes
                setTimeout(() => {
                    if (!isRecording && !isProcessing) {
                        startRecording();
                    }
                }, 500);
            };

            try {
                await responseAudioElement.play();
                updateButtonState('idle');
            } catch (playError) {
                console.error('Audio play error:', playError);
                updateButtonState('idle');
            }
        } else {
            throw new Error('No audio response received');
        }

    } catch (error) {
        console.error('Error in agent chat:', error);
        showError('Failed to process your request. Please try again.');
        updateButtonState('idle');
    }
}

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
    updateButtonState('idle');

    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    alert('Conversation stopped');
}

// Initialize the button state when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (recordButton) {
        updateButtonState('idle');
    }
});