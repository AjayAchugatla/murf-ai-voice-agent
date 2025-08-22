// DOM Elements
const recordButton = document.getElementById('recordButton');
const responseAudioElement = document.getElementById('responseAudio');
const conversationHistory = document.getElementById('conversationHistory');

// State variables
let mediaRecorder;
let isRecording = false;
let isProcessing = false;
let isSpeaking = false;
let chunks = [];
let ws = null;
let audioContext = null;
let mediaStreamSource = null;
let processor = null;

// Utility functions
function showError(message) {
    console.error(message);
    alert(message);
}

// Message management
function addMessageToHistory(message, isUser = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    // Clean markdown formatting for AI messages
    const cleanedMessage = isUser ? message :
        message.replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/#{1,6}\s/g, '')
            .replace(/^\s*[-*+]\s/gm, '')
            .replace(/^\s*\d+\.\s/gm, '')
            .trim();

    messageDiv.textContent = cleanedMessage;

    // Remove placeholder if it exists
    const placeholder = conversationHistory.querySelector('.conversation-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    conversationHistory.appendChild(messageDiv);
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
}

function clearConversationHistory() {
    conversationHistory.innerHTML = `
        <div class="conversation-placeholder">
            <p>Your conversation will appear here...</p>
        </div>
    `;
}

// Button state management
function updateButtonState(state) {
    if (!recordButton) return;

    const btnIcon = recordButton.querySelector('.btn-icon');
    const btnText = recordButton.querySelector('.btn-text');

    if (!btnIcon || !btnText) return;

    recordButton.className = 'record-btn';

    switch (state) {
        case 'idle':
            btnIcon.textContent = 'REC';
            btnText.textContent = 'Start Recording';
            recordButton.disabled = false;
            isRecording = false;
            isProcessing = false;
            isSpeaking = false;
            break;
        case 'recording':
            btnIcon.textContent = 'STOP';
            btnText.textContent = 'Stop Recording';
            recordButton.classList.add('recording');
            recordButton.disabled = false;
            isRecording = true;
            isProcessing = false;
            break;
        case 'processing':
            btnIcon.textContent = '...';
            btnText.textContent = 'Processing...';
            recordButton.classList.add('processing');
            recordButton.disabled = true;
            isRecording = false;
            isProcessing = true;
            break;
        case 'speaking':
            btnIcon.textContent = '🔊';
            btnText.textContent = 'AI Speaking...';
            recordButton.classList.add('processing');
            recordButton.disabled = true;
            isRecording = false;
            isProcessing = true;
            isSpeaking = true;
            break;
    }
}

// Audio chunks storage
let audioChunks = [];

// Transcript message handling
function handleTranscriptMessage(message) {
    console.log("Received transcript message:", message);

    switch (message.type) {
        case 'turn_complete':
            console.log(`Turn ${message.turn_order} complete: "${message.transcript}"`);
            addMessageToHistory(message.transcript, true); // Add as user message
            break;

        case 'partial_transcript':
            // Real-time partial transcript - could show in a temporary element
            console.log(`Partial: "${message.transcript}"`);
            break;

        case 'final_transcript':
            console.log(`Final: "${message.transcript}"`);
            addMessageToHistory(message.transcript, true);
            break;

        case 'audio_chunk':
            console.log(`Received audio chunk: ${message.chunk_size} characters`);
            console.log(`Audio chunk acknowledgment: Successfully received base64 audio data`);
            audioChunks.push(message.audio_data);
            console.log(`Total audio chunks accumulated: ${audioChunks.length}`);
            break;

        case 'audio_complete':
            console.log(`Audio streaming complete! Total chunks: ${audioChunks.length}`);
            console.log(`Combined base64 audio length: ${audioChunks.join('').length} characters`);
            console.log(`Audio acknowledgment: All audio chunks received and accumulated successfully`);

            // Optionally clear chunks after processing
            // audioChunks = [];
            break;

        default:
            console.log("Unknown message type:", message.type);
    }
}


// Recording functions
function toggleRecording() {
    if (isProcessing || isSpeaking) return;

    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    updateButtonState('recording');

    if (!navigator.mediaDevices?.getUserMedia) {
        showError("Audio recording is not supported in your browser. Please use a modern browser like Chrome or Firefox.");
        updateButtonState('idle');
        return;
    }

    // Create WebSocket connection
    ws = new WebSocket("ws://localhost:8000/ws");

    // WebSocket event handlers
    ws.onopen = () => {
        console.log("WebSocket connected for PCM streaming");
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleTranscriptMessage(message);
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        showError("Connection error. Please try again.");
    };

    ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
    };

    navigator.mediaDevices
        .getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        })
        .then((stream) => {
            try {
                audioContext = new (window.AudioContext)({
                    sampleRate: 16000
                });
                mediaStreamSource = audioContext.createMediaStreamSource(stream);
                const bufferSize = 4096;
                processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

                processor.onaudioprocess = (audioProcessingEvent) => {
                    if (!isRecording || !ws || ws.readyState !== WebSocket.OPEN) {
                        return;
                    }

                    const inputBuffer = audioProcessingEvent.inputBuffer;
                    const inputData = inputBuffer.getChannelData(0);

                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const sample = Math.max(-1, Math.min(1, inputData[i]));
                        pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                    }

                    ws.send(pcmData.buffer);
                };

                mediaStreamSource.connect(processor);
                processor.connect(audioContext.destination);

                processor.audioStream = stream;

            } catch (error) {
                console.error("Audio processing setup failed:", error);
                showError("Could not start audio processing. Please try again.");
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

function stopRecording() {
    if (!isRecording) return;

    isRecording = false;
    updateButtonState('idle');

    // Clean up partial transcript display
    const partialElement = document.getElementById('partial-transcript');
    if (partialElement) {
        partialElement.remove();
    }

    if (processor) {
        processor.disconnect();
        processor = null;
    }

    if (mediaStreamSource) {
        mediaStreamSource.disconnect();
        mediaStreamSource = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (processor?.audioStream) {
        processor.audioStream.getTracks().forEach(track => track.stop());
    }

    if (ws) {
        ws.close();
        ws = null;
    }

    console.log("🛑 PCM audio streaming stopped");
}

// Agent communication
async function agentChat(blob) {
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
            // Add messages to conversation history
            if (data.query) {
                addMessageToHistory(data.query, true);
            }
            if (data.response) {
                addMessageToHistory(data.response, false);
            }

            responseAudioElement.src = data.audio_url;

            responseAudioElement.onerror = () => {
                console.error('Audio playback failed');
                isSpeaking = false;
                updateButtonState('idle');
            };

            responseAudioElement.onended = () => {
                isSpeaking = false;
                updateButtonState('idle');

                // Auto-start next recording after AI response finishes
                setTimeout(() => {
                    if (!isRecording && !isProcessing && !isSpeaking) {
                        startRecording();
                    }
                }, 500);
            };

            try {
                updateButtonState('speaking');
                await responseAudioElement.play();
            } catch (playError) {
                console.error('Audio play error:', playError);
                isSpeaking = false;
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


function stopConversation() {
    if (isRecording) {
        stopRecording();
    }

    // Clean up partial transcript display
    const partialElement = document.getElementById('partial-transcript');
    if (partialElement) {
        partialElement.remove();
    }

    if (processor) {
        processor.disconnect();
        processor = null;
    }

    if (mediaStreamSource) {
        mediaStreamSource.disconnect();
        mediaStreamSource = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    if (ws) {
        ws.close();
        ws = null;
    }

    if (responseAudioElement && !responseAudioElement.paused) {
        responseAudioElement.pause();
        responseAudioElement.currentTime = 0;
    }

    isSpeaking = false;
    updateButtonState('idle');
    clearConversationHistory();

    alert('Conversation stopped');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateButtonState('idle');
});