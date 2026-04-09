# Cloover AI - Voice-First Sales Engine

A minimalist, voice-first autonomous sales assistant called Minerva. Minerva acts as a hands-free sales coach that intelligently reads customer's schedule for the day and extracts data like data (Location, Name, Product Interest) and leverages a powerful multi-agent AI pipeline to generate real-time, personalized sales playbooks.

## 🚀 Key Features

- **Hands-Free Voice Interface:** A sleek, single-orb minimalist UI. Tap the orb to converse directly with the engine.
- **Dynamic Excel Integration:** Automatically ingests local customer lead datasets (`leads.xlsx`) to contextually understand who you are visiting.
- **ElevenLabs Voice Synthesis:** Highly realistic, spontaneous human-like voice responses guiding the user through the initial setup and reading the final playbook.
- **Autonomous Multi-Agent Pipeline:** Routes intents and compiles massive amounts of open data into concise, punchy sales strategies on the fly.
- **Smart Auto-Mic:** The microphone intelligently re-activates when the AI expects a conversational answer, and stays off during heavy research phases.

## 🧠 The 4-Agent Pipeline architecture

The core of the Cloover Engine is a multi-agent cascade utilizing ultra-fast models to synthesize a bespoke playbook in seconds.

1. **Market Intelligence Agent:** Analyzes the energy market, local PVGIS solar potential, SMARD prices, and regional subsidies based purely on the client's location.
2. **Offer Strategy Agent:** Ingests the market data to determine the absolute best technical fit and product recommendation, predicting technical objections.
3. **Financing Strategy Agent:** Figures out how the customer can actually pay for it—optimizing for Loans, Leasing, and regional incentives (e.g., KfW/BAFA) instead of upfront cash.
4. **Master Sales Coach (Synthesis Agent):** The master orchestrator that synthesizes the three independent reports into a unified, punchy Sales Playbook. It produces an easy-to-read markdown framework alongside a 30-second conversational audio script ready to be spoken to the sales rep.

## 🛠️ Technologies Used

- **Frontend core:** Vanilla HTML5, CSS3 (Glassmorphism design), and JavaScript.
- **Speech Integration:** Web Speech API for voice recognition and **ElevenLabs API** for state-of-the-art text-to-speech feedback.
- **LLM Backbone:** Direct integration with the **Google Gemini API** (`gemini-flash-lite-latest`) for parallel high-speed agentic reasoning.
- **Data Parsing:** `SheetJS` CDN integration to dynamically parse local `.xlsx` lead sheets on runtime.

## 💻 Running Locally

To avoid restrictive browser CORS errors when fetching the local `.xlsx` files and audio components:

1. Open your terminal in the application directory.
2. Run a local development server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open your browser and navigate to `http://localhost:8080`.
4. Ensure your microphone permissions are granted when clicking the Orb for the first time.
