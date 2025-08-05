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
                mediaRecorder.onstop = (e) => {
                    console.log("Recording stopped.");
                    const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
                    chunks = [];
                    const audioURL = window.URL.createObjectURL(blob);
                    recordedAudioElement.src = audioURL;

                    // Show the container instead of just the audio element
                    const recordedAudioSection = recordedAudioElement.parentElement;
                    showElement(recordedAudioSection);

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
