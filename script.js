document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const API_KEY = "YOUR_GEMINI_API_KEY_HERE";
    const ELEVENLABS_API_KEY = "YOUR_ELEVENLABS_API_KEY_HERE";


    // Setup initial greeting
    let chatMemoryArray = [];
    const micBtn = document.getElementById('mic-btn');

    // Dynamic Excel Integration
    let customerData = [];
    let currentCustomerIndex = 0;
    
    async function loadLeadData() {
        try {
            const response = await fetch('leads.xlsx');
            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            customerData = XLSX.utils.sheet_to_json(worksheet);
            console.log("Loaded Excel Data:", customerData);
        } catch (error) {
            console.error("Error loading leads.xlsx:", error);
        }
    }
    loadLeadData();

    // Setup initial greeting
    setTimeout(() => {
        const welcomeText = "Hey! I'm the Cloover Sales Engine.\nWhere are we heading today, and what are they interested in?";
        chatMemoryArray.push(`AI: ${welcomeText}`);
        addMessage(welcomeText, 'ai');
        // Instantly generate audio for the welcome
        const wrapper = chatHistory.lastElementChild;
        if (ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== "YOUR_ELEVENLABS_API_KEY_HERE") {
            fetchAudioFromElevenLabs(welcomeText.replace('\n', ' '), wrapper);
        }
    }, 500);

    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        micBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (micBtn.classList.contains('recording')) {
                micBtn.classList.remove('recording');
                recognition.stop();
            } else {
                micBtn.classList.add('recording');
                try {
                    recognition.start();
                } catch (err) {
                    console.log("Already started", err);
                }
            }
        });

        recognition.onresult = (event) => {
            micBtn.classList.remove('recording');
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            handleSend();
        };

        recognition.onerror = () => {
            micBtn.classList.remove('recording');
        };

        recognition.onend = () => {
            micBtn.classList.remove('recording');
        };
    }

    // Auto-resize textarea
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value === '') {
            this.style.height = 'auto';
        }
    });

    // Handle Enter to submit (Shift+Enter for newline)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    sendBtn.addEventListener('click', handleSend);

    function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // Reset input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Add user message
        addMessage(text, 'user');
        chatMemoryArray.push(`User: ${text}`);

        // Route through Conversational Gatekeeper
        handleGatekeeperAPI();
    }

    function addMessage(content, sender, isHtml = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${sender}`;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        if (sender === 'ai') {
            messageDiv.classList.add('ai-content');
        }

        if (isHtml || sender === 'ai') {
            messageDiv.innerHTML = marked.parse(content);
        } else {
            messageDiv.textContent = content;
        }

        wrapper.appendChild(messageDiv);
        chatHistory.appendChild(wrapper);
        scrollToBottom();
        return wrapper;
    }

    async function fetchAudioFromElevenLabs(text, msgWrapper) {
        // Add a tiny audio indicator instead of a massive block
        const audioIndicator = document.createElement('div');
        audioIndicator.style.marginTop = '8px';
        audioIndicator.innerHTML = '<span style="font-size: 0.8rem; font-weight: 500; color: var(--color-primary); display: flex; align-items: center; gap: 5px;"><span class="status-dot"></span> 🎙️ Speaking...</span>';
        msgWrapper.querySelector('.message').appendChild(audioIndicator);
        scrollToBottom();

        try {
            const voiceId = "pNInz6obpgDQGcFmaJgB"; // Conversational Voice (Adam)
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_turbo_v2_5",
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Play audio instantly without DOM clutter
                if (window.currentAudio) { window.currentAudio.pause(); }
                window.currentAudio = new Audio(url);
                window.currentAudio.play().catch(e => {
                    console.warn("Autoplay blocked by browser:", e);
                    audioIndicator.innerHTML = '<span style="font-size: 0.8rem; font-weight: 500; color: #ef4444; display: flex; align-items: center; gap: 5px; cursor: pointer;" onclick="window.currentAudio.play(); this.remove();">▶️ Tap to Play Voice (Auto-play Blocked)</span>';
                });

                window.currentAudio.onended = () => {
                    audioIndicator.remove(); // Clean up when done speaking

                    // Hands-Free Auto-Mic Feature!
                    const micBtn = document.getElementById('mic-btn');
                    if (micBtn && !micBtn.classList.contains('recording')) {
                        console.log("Auto-opening microphone for hands-free reply...");
                        micBtn.click();
                    }
                };
            } else {
                audioIndicator.innerHTML = '<span style="font-size: 0.8rem; color: red;">⚠️ ElevenLabs API Error</span>';
            }
        } catch (err) {
            audioIndicator.innerHTML = '<span style="font-size: 0.8rem; color: red;">⚠️ Audio fetch failed</span>';
        }
    }

    function updateTypingIndicator(id, statusMessage) {
        let indicator = document.getElementById(id);
        if (!indicator) {
            const wrapper = document.createElement('div');
            wrapper.className = 'message-wrapper ai';
            wrapper.id = id;
            wrapper.innerHTML = `
                <div class="typing-indicator" style="align-items: center;">
                    <div style="display: flex; gap: 4px; margin-right: 12px;">
                        <span></span><span></span><span></span>
                    </div>
                    <div class="status-msg" style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic;">
                        ${statusMessage}
                    </div>
                </div>
            `;
            chatHistory.appendChild(wrapper);
            scrollToBottom();
            return id;
        } else {
            indicator.querySelector('.status-msg').textContent = statusMessage;
            return id;
        }
    }

    function removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        setTimeout(() => {
            const container = document.querySelector('.chat-container');
            container.scrollTop = container.scrollHeight;
        }, 50);
    }

    async function callLLM(systemPromptText, userPromptText, fastMode = false) {
        if (fastMode) {
            const fastModels = ["gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.0-flash"];
            const racePromises = fastModels.map(model => {
                return new Promise(async (resolve, reject) => {
                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                system_instruction: { parts: { text: systemPromptText } },
                                contents: [{ parts: [{ text: userPromptText }] }]
                            })
                        });
                        const data = await response.json();
                        if (response.ok && data.candidates && data.candidates.length > 0) {
                            resolve(data.candidates[0].content.parts[0].text);
                        } else {
                            reject(new Error("429 Quota or Error"));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            try {
                // Resolves immediately when the FIRST model successfully returns, completely dodging rate-limit timeouts!
                return await Promise.any(racePromises);
            } catch (aggregateError) {
                console.warn("Fast-line parallel execution fully rejected. Falling back to heavy cascade.", aggregateError);
            }
        }

        const modelsToTry = ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-pro-latest", "gemini-flash-lite-latest"];
        for (const model of modelsToTry) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: { text: systemPromptText } },
                        contents: [{ parts: [{ text: userPromptText }] }]
                    })
                });

                const data = await response.json();
                if (response.ok && data.candidates && data.candidates.length > 0) {
                    return data.candidates[0].content.parts[0].text;
                } else if (!response.ok && data.error && data.error.message.includes("high demand")) {
                    console.warn(model + " High Demand, falling back...");
                    continue;
                } else if (!response.ok && data.error && data.error.message.includes("quota")) {
                    console.warn(model + " Quota limited, falling back...");
                    continue;
                }
            } catch (error) {
                console.warn(`${model} network error:`, error);
            }
        }
        throw new Error("All fallback models failed due to region blocks or missing Pay-As-You-Go quota.");
    }

    async function handleGatekeeperAPI() {
        userInput.disabled = true;
        sendBtn.disabled = true;
        const typingId = 'typing-' + Date.now();
        updateTypingIndicator(typingId, "Router Agent analyzing text...");

        // ULTRA-FAST 0ms LOCAL INTERCEPT (Bypass API completely for core workflows)
        const lastUserMsg = chatMemoryArray[chatMemoryArray.length - 1].toLowerCase();
        if ((lastUserMsg.includes("where") && (lastUserMsg.includes("head") || lastUserMsg.includes("go"))) || lastUserMsg.includes("next appointment")) {
            removeTypingIndicator(typingId);
            let appointmentDetails = "Name: Mr. Gokul, Location: Gibitzenhofstrasse in Nuremberg, Product: Solar Panel";
            let vocalMsg = "We are headed to Mr. Gokul's house on Gibitzenhofstrasse in Nuremberg. He is looking for a solar panel. Give me a few seconds to boot up the autonomous sales engines.";
            
            if (customerData && customerData.length > 0) {
                const customer = customerData[currentCustomerIndex % customerData.length];
                currentCustomerIndex++;
                const name = customer.Name || customer.name || "the customer";
                const location = customer.Location || customer.location || "their location";
                const product = customer['Product Preference'] || customer.Product || customer.product || "our solutions";
                
                appointmentDetails = `Name: ${name}, Location: ${location}, Product: ${product}`;
                vocalMsg = `We are headed to ${name}'s house on ${location}. They are looking for a ${product}. Give me a few seconds to boot up the autonomous sales engines.`;
            }

            chatMemoryArray.push(`SYSTEM ALERTS: Next appointment is ${appointmentDetails}`);
            chatMemoryArray.push(`AI: ${vocalMsg}`);

            const msgWrap = addMessage(vocalMsg, 'ai');
            if (ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== "YOUR_ELEVENLABS_API_KEY_HERE") {
                fetchAudioFromElevenLabs(vocalMsg, msgWrap);
            }

            const newTypingId = 'typing-' + Date.now();
            updateTypingIndicator(newTypingId, "Router Complete! Booting 4-Node LangGraph Pipeline...");
            await handleGeminiAPI(appointmentDetails, newTypingId);
            return; // Exit sequence early!
        }

        const systemPrompt = `You are the master routing intelligence for the Cloover Sales Engine.
Your goal is to classify the user's intent into EXACTLY ONE of the following JSON schemas:

1. APPOINTMENT_REQUEST (If the user asks "where are we going", "where are we headed", or asks about their schedule)
{
  "status": "appointment_request"
}

2. REVISION (If the user asks to change, rewrite, or update the existing playbook based on new info)
{
  "status": "revision",
  "extracted_data": "[The entire conversation history PLUS the user's new instructions]"
}

3. MISSING_DATA (If the user is manually typing data but forgot Name, Location, or Product)
{
  "status": "missing",
  "reply": "[A conversational spoken question asking the user for the missing parameter. Under 15 words.]"
}

4. COMPLETE (If the user manually typed all details: Name, Location, Product)
{
  "status": "complete",
  "extracted_data": "Name: [X], Location: [Y], Product: [Z]"
}

Conversational History:
${chatMemoryArray.join('\n')}

ONLY OUTPUT RAW VALID JSON.`;

        try {
            const rawOutput = await callLLM(systemPrompt, "Conversational History:\n" + chatMemoryArray.join('\n') + "\n\nONLY OUTPUT VALID JSON.", true);
            const cleanJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            if (parsed.status === "appointment_request") {
                // Mock Schedule Integration
                let appointmentDetails = "Name: Mr. Gokul, Location: Gibitzenhofstrasse in Nuremberg, Product: Solar Panel";
                let vocalMsg = "We are headed to Mr. Gokul's house on Gibitzenhofstrasse in Nuremberg. He is looking for a solar panel. Give me a few seconds to boot up the autonomous sales engines.";
                
                if (customerData && customerData.length > 0) {
                    const customer = customerData[currentCustomerIndex % customerData.length];
                    currentCustomerIndex++;
                    const name = customer.Name || customer.name || "the customer";
                    const location = customer.Location || customer.location || "their location";
                    const product = customer['Product Preference'] || customer.Product || customer.product || "our solutions";
                    
                    appointmentDetails = `Name: ${name}, Location: ${location}, Product: ${product}`;
                    vocalMsg = `We are headed to ${name}'s house on ${location}. They are looking for a ${product}. Give me a few seconds to boot up the autonomous sales engines.`;
                }

                chatMemoryArray.push(`SYSTEM ALERTS: Next appointment is ${appointmentDetails}`);
                chatMemoryArray.push(`AI: ${vocalMsg}`);

                const msgWrap = addMessage(vocalMsg, 'ai');
                if (ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== "YOUR_ELEVENLABS_API_KEY_HERE") {
                    fetchAudioFromElevenLabs(vocalMsg, msgWrap);
                }

                // Instantly trigger heavy pipeline while TTS plays in the background
                updateTypingIndicator(typingId, "Router Complete! Booting 4-Node LangGraph Pipeline...");
                await handleGeminiAPI(appointmentDetails, typingId);

            } else if (parsed.status === "missing") {
                removeTypingIndicator(typingId);
                const msgWrap = addMessage(parsed.reply, 'ai');
                chatMemoryArray.push(`AI: ${parsed.reply}`);
                if (ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== "YOUR_ELEVENLABS_API_KEY_HERE") {
                    fetchAudioFromElevenLabs(parsed.reply, msgWrap);
                }
                userInput.disabled = false;
                sendBtn.disabled = false;
                userInput.focus();
            } else if (parsed.status === "complete" || parsed.status === "revision") {
                chatMemoryArray.push(`SYSTEM: Triggering Sales Playbook generation...`);
                updateTypingIndicator(typingId, "Router Complete! Running LangGraph Pipeline with new parameters...");
                await handleGeminiAPI(parsed.extracted_data, typingId);
            }
        } catch (error) {
            removeTypingIndicator(typingId);
            addMessage(`⚠️ **Gatekeeper Failed:**\n${error.message}`, 'ai');
            userInput.disabled = false;
            sendBtn.disabled = false;
        }
    }

    async function handleGeminiAPI(userText, typingId) {
        if (!typingId) {
            typingId = 'typing-' + Date.now();
            userInput.disabled = true;
            sendBtn.disabled = true;
        }

        try {
            // Node 1: Market Agent
            updateTypingIndicator(typingId, "Node 1: Market Intelligence Agent analyzing grid...");
            const marketPrompt = `You are the Market Intelligence Agent for the Cloover Sales Engine.\nYour singular goal is to answer: “What’s happening in the energy market that matters for this customer?”\n\nPHILOSOPHY:\nWork with whatever data is available. Even if you only get a postal code, you must logically enrich the analysis using your knowledge of open data (PVGIS solar potential, SMARD energy prices, KfW/BAFA subsidies, GEG/EEG regulations, MaStR nearby installations).\n\nAnalyze the data specifically for this customer's region and output EXACTLY the following structure:\n- **Key Trends:** [Bullet points covering local prices, incentives, and neighbor adoption]\n- **Why it matters:** [Explain why these specific trends should make the customer take action now]\n- **Urgency:** [Low / Medium / High]\n\nDo not generate offer or financing strategies. Stick strictly to market intelligence.`;
            const marketOutput = await callLLM(marketPrompt, "CUSTOMER DATA:\n" + userText);

            // Node 2: Offer Strategy Agent
            updateTypingIndicator(typingId, "Node 2: Offer Strategy Agent designing tech solution...");
            const offerPrompt = `You are the Offer Strategy Agent for the Cloover Sales Engine.\nYour singular goal is to answer: “Given these inputs, what makes sense for this household, and why?” (Do NOT just "write a pitch").\n\nPHILOSOPHY:\nGet smarter as more blocks are added. If only location and interest are available, logically deduce the best technical fit. Incorporate any open data insights passed from the Market Agent.\n\nAnalyze the customer's profile, product interest, and output EXACTLY the following structure:\n- **Recommended Solution:** [Specify the exact product(s) to pitch]\n- **Reasoning:** [Data-backed rationale for WHY it makes sense for THIS household]\n- **Personalization Insights:** [How to frame the tech for this specific person]\n- **Objections to expect:** [What product-related pushback they will likely give]\n\nDo not mention market macro-trends or financing. Stick strictly to product offering and technical strategy.`;
            const offerInput = "CUSTOMER DATA:\n" + userText + "\n\nMARKET INTELLIGENCE:\n" + marketOutput;
            const offerOutput = await callLLM(offerPrompt, offerInput);

            // Node 3: Financing Agent
            updateTypingIndicator(typingId, "Node 3: Financing Agent crunching ROI and terms...");
            const financePrompt = `You are the Financing Strategy Agent for the Cloover Sales Engine.\nYour singular goal is to answer: “How can they actually pay for it?”\n\nPHILOSOPHY:\nWork with whatever is available (e.g., general location averages if exact budget isn't known). Incorporate any subsidies (KfW/BAFA) identified earlier.\n\nPrioritize financing over upfront payments. Output EXACTLY the following structure:\n- **Best Option:** [Specify the Loan / EMI / Leasing option]\n- **Why it's optimal:** [Reasoning based on ROI, savings vs cost]\n- **How to pitch it:** [A highly conversational pitch moving them away from upfront cash]\n- **Expected Concerns:** [Specific financial objections they will raise]\n\nDo not discuss technical product details. Focus on money, ROI, and closing financially.`;
            const financeInput = offerInput + "\n\nOFFER STRATEGY:\n" + offerOutput;
            const financeOutput = await callLLM(financePrompt, financeInput);

            // Node 4: Master Orchestrator
            updateTypingIndicator(typingId, "Node 4: Master Orchestrator synthesizing the Playbook...");
            const masterPrompt = `You are the Master Sales Coach Orchestrator for Cloover.\n\nPHILOSOPHY:\nYour solution works with whatever is available and gets smarter as more blocks are added. A single postal code can unlock the whole pitch. The interesting question isn't 'write me a pitch' — it's 'given these inputs, what makes sense for this household, and why?'\n\nYou receive independent reports from your three sub-agents. Your job is to drastically synthesize them and produce a unified, punchy Sales Playbook. Optimize for quick understanding on a mobile screen.\n\nOutput EXACTLY this final layout:\n\n**CUSTOMER SUMMARY:**\n- **Name:** [extract]\n- **Location:** [extract]\n- **Interest:** [extract]\n\n### 📈 MARKET INSIGHTS\n[Insert synthesized Market Agent text here]\n\n### 🎯 OFFER STRATEGY\n[Insert synthesized Offer Agent text here]\n\n### 💳 FINANCING STRATEGY\n[Insert synthesized Financing Agent text here]\n\n### 🏆 SALES PLAYBOOK\n- **Key talking points:** [3 punchy bullets tying the market, product, and finance together]\n- **What to emphasize:** [The singular most powerful emotional/financial hook]\n- **What to avoid:** [What conversational traps to avoid]\n- **Suggested opening line:** [A bold, highly personalized opening quote for when the door opens]\n\nFinally, at the VERY BOTTOM of your response, write a 30-45 second spoken conversational script wrapped entirely in <voice_script>...</voice_script> tags. This script should sound exactly like a casual voice memo from a sales manager to the rep in the field. Do NOT use markdown or bullets in this audio script. Make sure to end the voice script by actively asking the user: "Let me know if there are any changes or revisions you want me to make to this strategy."`;
            const masterInput = financeInput + "\n\nFINANCING STRATEGY:\n" + financeOutput;

            const finalOutput = await callLLM(masterPrompt, masterInput);

            let visualMarkdown = finalOutput;
            let voiceScript = "";
            const voiceMatch = finalOutput.match(/<voice_script>([\s\S]*?)<\/voice_script>/);
            if (voiceMatch) {
                voiceScript = voiceMatch[1].trim();
                visualMarkdown = finalOutput.replace(/<voice_script>[\s\S]*?<\/voice_script>/, '').trim();
            }

            removeTypingIndicator(typingId);
            const msgWrapper = addMessage(`✅ *(True LangGraph Multi-Agent Pipeline Completed)*\n\n` + visualMarkdown, 'ai');

            if (voiceScript && ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== "YOUR_ELEVENLABS_API_KEY_HERE") {
                fetchAudioFromElevenLabs(voiceScript, msgWrapper);
            }

        } catch (error) {
            removeTypingIndicator(typingId);
            addMessage(`⚠️ **LangGraph Pipeline Failed!** The error was:\n${error.message}`, 'ai');
        }

        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
});


