// DOM Elements
const textInput = document.getElementById('text');
const generateBtn = document.getElementById('generateAudio');
const audioSection = document.getElementById('audioSection');
const audioElement = document.getElementById('audio');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

let currentAudioUrl = null;


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
        audioElement.src = currentAudioUrl;
        showElement(audioSection);
    } catch (error) {
        console.error('Error generating audio:', error);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Audio';
    }
};
