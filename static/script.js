document.addEventListener("DOMContentLoaded", () => {
    let audioContext = null;
    let source = null;
    let processor = null;
    let isRecording = false;
    let socket = null;
    let heartbeatInterval = null;

    let audioQueue = [];
    let isPlaying = false;
    let currentAiMessageContentElement = null;
    let audioChunkIndex = 0;

    // Keep a reference to the current audio source
    let currentAudioSource = null;

    // Store API keys
    let apiKeys = {
        gemini: "",
        assemblyai: "",
        murf: "",
        tavily: "",
    };

    const recordBtn = document.getElementById("recordBtn");
    const statusDisplay = document.getElementById("statusDisplay");
    const chatDisplay = document.getElementById("chatDisplay");
    const chatContainer = document.getElementById("chatContainer");
    const clearBtnContainer = document.getElementById("clearBtnContainer");
    const clearBtn = document.getElementById("clearBtn");

    // Config elements
    const configBtn = document.getElementById("configBtn");
    const configModal = document.getElementById("configModal");
    const configOverlay = document.getElementById("configOverlay");
    const configSaveBtn = document.getElementById("configSaveBtn");
    const configCloseBtn = document.getElementById("configCloseBtn");
    const configCancelBtn = document.getElementById("configCancelBtn");

    // Status management
    const updateStatus = (status, message) => {
        statusDisplay.className = `status-indicator status-${status}`;
        statusDisplay.innerHTML = `
      <div style="width: 8px; height: 8px; background: currentColor; border-radius: 50%;"></div>
      <span>${message}</span>
    `;
    };

    // API Configuration
    const openConfigModal = () => {
        document.getElementById("geminiKey").value = apiKeys.gemini || "";
        document.getElementById("assemblyaiKey").value = apiKeys.assemblyai || "";
        document.getElementById("murfKey").value = apiKeys.murf || "";
        document.getElementById("tavilyKey").value = apiKeys.tavily || "";

        configModal.style.display = "block";
        setTimeout(() => {
            configModal.style.opacity = "1";
            const modalContent = configModal.querySelector(".glass-effect");
            if (modalContent) {
                modalContent.style.transform = "scale(1)";
            }
        }, 10);
    };

    const closeConfigModal = () => {
        configModal.style.opacity = "0";
        const modalContent = configModal.querySelector(".glass-effect");
        if (modalContent) {
            modalContent.style.transform = "scale(0.95)";
        }
        setTimeout(() => {
            configModal.style.display = "none";
        }, 300);
    };

    const saveApiKeys = () => {
        const newKeys = {
            gemini: document.getElementById("geminiKey").value.trim(),
            assemblyai: document.getElementById("assemblyaiKey").value.trim(),
            murf: document.getElementById("murfKey").value.trim(),
            tavily: document.getElementById("tavilyKey").value.trim(),
        };

        Object.keys(newKeys).forEach((key) => {
            if (newKeys[key]) {
                localStorage.setItem(`api_key_${key}`, newKeys[key]);
                apiKeys[key] = newKeys[key];
            } else {
                localStorage.removeItem(`api_key_${key}`);
                apiKeys[key] = "";
            }
        });

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "update_api_keys", keys: newKeys }));
        }

        updateConfigStatus();
        closeConfigModal();

        showNotification("⚓ Keys Saved", "Yer API keys be updated, matey!", "success");
    };

    const loadApiKeys = () => {
        Object.keys(apiKeys).forEach((key) => {
            const stored = localStorage.getItem(`api_key_${key}`);
            if (stored) apiKeys[key] = stored;
        });
        updateConfigStatus();
    };

    const updateConfigStatus = () => {
        const indicators = {
            gemini: document.getElementById("geminiStatus"),
            assemblyai: document.getElementById("assemblyaiStatus"),
            murf: document.getElementById("murfStatus"),
            tavily: document.getElementById("tavilyStatus"),
        };

        Object.keys(indicators).forEach((key) => {
            if (indicators[key]) {
                const hasKey = !!apiKeys[key];
                indicators[key].style.background = hasKey ? "#10b981" : "#f87171";
                indicators[key].title = hasKey ? `${key} configured` : `${key} not configured`;
            }
        });
    };

    // Stop current playback
    const stopCurrentPlayback = () => {
        console.log("🤫 Astra: Quiet now, I be stoppin’ me voice, matey!");
        if (currentAudioSource) {
            currentAudioSource.stop();
            currentAudioSource = null;
        }
        audioQueue = [];
        isPlaying = false;
    };

    // Play chunks
    const playNextChunk = () => {
        if (!audioQueue.length || !audioContext || audioContext.state === "closed") {
            if (isPlaying) {
                console.log("✅ Astra: Arrr, all me audio be spoken!");
            }
            isPlaying = false;
            currentAudioSource = null;
            return;
        }

        console.log(`➡️ Astra: Playing me next audio chunk. ${audioQueue.length - 1} left in the queue.`);
        isPlaying = true;
        const chunk = audioQueue.shift();

        audioContext.decodeAudioData(
            chunk,
            (buffer) => {
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = buffer;
                sourceNode.connect(audioContext.destination);
                sourceNode.start();

                currentAudioSource = sourceNode;
                sourceNode.onended = () => {
                    currentAudioSource = null;
                    playNextChunk();
                };
            },
            (error) => {
                console.error("☠️ Error decoding audio data:", error);
                playNextChunk();
            }
        );
    };

    const startRecording = async () => {
        console.log("🎤 Astra: Hoist the mic, matey! Let’s be talkin’ now.");

        if (!apiKeys.assemblyai || !apiKeys.gemini || !apiKeys.murf) {
            showNotification("Missing Keys", "Ye be needin’ all yer API keys!", "error");
            openConfigModal();
            return;
        }

        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                alert("Yer browser be not supportin’ the Web Audio API.");
                return;
            }
        }

        if (audioContext.state === "suspended") await audioContext.resume();

        if (!navigator.mediaDevices?.getUserMedia) {
            alert("No mic available, matey!");
            return;
        }

        isRecording = true;
        updateUIForRecording(true);

        try {
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

            socket.onopen = async () => {
                console.log("🔌 Astra: Arrr! WebSocket be open, ready fer chat!");
                updateStatus("connecting", "Establishing Connection...");

                socket.send(JSON.stringify({ type: "update_api_keys", keys: apiKeys }));
                heartbeatInterval = setInterval(() => {
                    if (socket?.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: "ping" }));
                    }
                }, 25000);

                socket.send(JSON.stringify({ type: "start_transcription" }));

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    source = audioContext.createMediaStreamSource(stream);
                    processor = audioContext.createScriptProcessor(4096, 1, 1);

                    processor.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        const targetSampleRate = 16000;
                        const sourceSampleRate = audioContext.sampleRate;
                        const ratio = sourceSampleRate / targetSampleRate;
                        const newLength = Math.floor(inputData.length / ratio);
                        const downsampledData = new Float32Array(newLength);
                        for (let i = 0; i < newLength; i++) {
                            downsampledData[i] = inputData[Math.floor(i * ratio)];
                        }
                        const pcmData = new Int16Array(downsampledData.length);
                        for (let i = 0; i < pcmData.length; i++) {
                            const sample = Math.max(-1, Math.min(1, downsampledData[i]));
                            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                        }
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(pcmData.buffer);
                        }
                    };

                    source.connect(processor);
                    processor.connect(audioContext.destination);
                    recordBtn.mediaStream = stream;

                    updateStatus("listening", "Listening...");
                } catch (micError) {
                    alert("☠️ No access to the mic, matey!");
                    await stopRecording();
                }
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case "transcription":
                        if (data.end_of_turn && data.text) {
                            addToChatLog(data.text, "user");
                            updateStatus("thinking", "Processing...");
                            currentAiMessageContentElement = null;
                        }
                        break;
                    case "llm_chunk":
                        if (data.data) {
                            if (!currentAiMessageContentElement) {
                                currentAiMessageContentElement = addToChatLog("", "ai");
                            }
                            currentAiMessageContentElement.textContent += data.data;
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                        break;
                    case "audio_start":
                        updateStatus("speaking", "Talkin’ back, matey...");
                        audioQueue = [];
                        audioChunkIndex = 0;
                        break;
                    case "audio_interrupt":
                        stopCurrentPlayback();
                        updateStatus("listening", "Listening...");
                        break;
                    case "audio":
                        if (data.data) {
                            const audioData = atob(data.data);
                            const byteNumbers = new Array(audioData.length);
                            for (let i = 0; i < audioData.length; i++) {
                                byteNumbers[i] = audioData.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            audioQueue.push(byteArray.buffer);
                            if (!isPlaying) playNextChunk();
                        }
                        break;
                    case "audio_end":
                        updateStatus("listening", "Listening...");
                        break;
                    case "error":
                        updateStatus("error", `Error: ${data.message}`);
                        showNotification("Error", data.message, "error");
                        break;
                }
            };

            socket.onclose = () => {
                updateStatus("ready", "Connection Closed");
                console.log("💔 Astra: Our connection be sunk, matey.");
                stopRecording(false);
            };
        } catch (err) {
            alert("☠️ Failed to start recording session, matey!");
            await stopRecording();
        }
    };

    const stopRecording = async () => {
        if (!isRecording) return;
        console.log("🛑 Astra: I be stoppin’ the recordin’, matey!");
        isRecording = false;
        stopCurrentPlayback();
        if (processor) processor.disconnect();
        if (source) source.disconnect();
        if (recordBtn.mediaStream) {
            recordBtn.mediaStream.getTracks().forEach((track) => track.stop());
            recordBtn.mediaStream = null;
        }
        if (socket?.readyState === WebSocket.OPEN) socket.close();
        socket = null;
        updateUIForRecording(false);
    };

    const updateUIForRecording = (isRec) => {
        if (isRec) {
            recordBtn.classList.add("recording");
            chatDisplay.style.display = "block";
        } else {
            recordBtn.classList.remove("recording");
            updateStatus("ready", "Ready to Connect");
        }
    };

    const addToChatLog = (text, sender) => {
        const messageElement = document.createElement("div");
        messageElement.className = `chat-message ${sender === "user" ? "user-message" : "ai-message"}`;

        const prefixDiv = document.createElement("div");
        prefixDiv.className = `message-prefix ${sender === "user" ? "user-prefix" : "ai-prefix"}`;
        prefixDiv.textContent = sender === "user" ? "You" : "Astra 🏴‍☠️";

        const contentSpan = document.createElement("div");
        contentSpan.className = "message-content";
        contentSpan.textContent = text;

        messageElement.appendChild(prefixDiv);
        messageElement.appendChild(contentSpan);
        chatContainer.appendChild(messageElement);

        // Hide empty state when first message is added
        const emptyState = document.querySelector('.chat-empty-state');
        if (emptyState && chatContainer.children.length > 0) {
            emptyState.style.display = 'none';
        }

        if (chatContainer.children.length > 0) {
            clearBtn.style.display = "inline-flex";
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;

        return contentSpan;
    };

    clearBtn.addEventListener("click", () => {
        chatContainer.innerHTML = "";
        clearBtn.style.display = "none";

        // Show empty state when chat is cleared
        const emptyState = document.querySelector('.chat-empty-state');
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
    });

    recordBtn.addEventListener("click", () => {
        if (isRecording) stopRecording();
        else startRecording();
    });

    configBtn.addEventListener("click", openConfigModal);
    configCloseBtn.addEventListener("click", closeConfigModal);
    configCancelBtn.addEventListener("click", closeConfigModal);
    configSaveBtn.addEventListener("click", saveApiKeys);
    configOverlay.addEventListener("click", closeConfigModal);

    window.addEventListener("beforeunload", () => {
        if (isRecording) stopRecording();
    });

    loadApiKeys();
    clearBtn.style.display = "none";
});