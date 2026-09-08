# VitaLens AI

> **AI-powered preventive health dashboard built with React**

VitaLens AI is a frontend healthcare application that combines browser-based vital estimation, voice symptom input, AI-assisted symptom analysis, health risk scoring, medication tracking, multilingual support, and AI-generated health summaries into a single dashboard.

The project was built to explore how modern web technologies and AI APIs can be combined to create an accessible preventive-health experience.

> **Disclaimer:** VitaLens AI is a prototype for educational and demonstration purposes. The health readings and AI-generated information are not medical diagnoses and should not be used as a substitute for professional medical advice.

---

## ✨ Features

### 📊 Health Dashboard

A centralized dashboard provides an overview of:

* Heart-rate estimate
* SpO₂ estimate
* Health risk score
* Stress estimate
* Recent symptom information
* Access to all major application modules

---

### 📷 Camera-Based Vital Estimation

The application uses the browser's `MediaDevices` API to access the user's webcam.

The camera module:

* Requests webcam permission
* Captures frames from the camera
* Samples pixel values through a hidden canvas
* Calculates basic RGB statistics
* Produces demo estimates for:

  * Heart rate
  * SpO₂
  * Stress level

The application clearly marks these values as **demo estimates and not for medical use**.

---

### 🎙️ Voice Symptom Reporter

Users can describe their symptoms using their voice.

The application uses the browser's Web Speech Recognition API to:

1. Start microphone-based speech recognition
2. Convert speech into text
3. Display the transcript
4. Send the symptom description for AI-assisted analysis
5. Present a triage-style response and recommendations

Users can also enter symptoms manually.

---

### 🧠 AI-Assisted Health Analysis

VitaLens AI integrates external language-model APIs for conversational and symptom-related analysis.

The current implementation:

* Sends prompts to an AI model through the browser
* Uses Anthropic as the primary AI provider
* Falls back to OpenRouter when the primary request fails
* Supports streaming responses for the AI advisor
* Displays AI-generated health-related responses inside the application

The OpenRouter fallback includes multiple model options such as Mistral, Llama, Gemma, and Qwen.

---

### 📈 Health Risk Scoring

Users can provide a health profile containing information such as:

* Age
* Gender
* BMI
* Sleep
* Exercise frequency
* Smoking status
* Family history
* Recent symptoms

The application uses this information to generate a health risk score and display:

* Overall risk score
* Risk factors
* Prevention suggestions
* A 30-day forecast-style view

This is a **prototype risk-scoring feature**, not a clinically validated prediction model.

---

### 💊 Medication Tracking

The medication module allows users to:

* Add medications
* Specify dosage
* Set medication times
* Track medication status
* View adherence information

The interface provides visual indicators for:

* Taken
* Partial
* Missed
* Upcoming

---

### 📄 AI Health Reports

The application includes a report-generation module that creates an AI-assisted summary of the user's health information.

The report interface provides:

* Health information summary
* AI-generated content
* Report generation state
* Download-oriented UI

---

### 🌐 Multilingual Interface

The application includes multilingual UI support for:

* English
* Hindi
* Telugu
* Tamil

The language system translates the application's interface labels and health-dashboard content between supported languages.

---

## 🏗️ Application Architecture

```text
                    ┌──────────────────────┐
                    │       User           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │      VitaLens AI      │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │   Camera    │      │    Voice    │      │   Health    │
   │   Module    │      │   Module    │      │   Profile   │
   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Pixel Analysis       Speech-to-Text       Risk Scoring
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      AI Layer        │
                    │ Anthropic / OpenRouter│
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Dashboard / Reports  │
                    │ Medication Tracking  │
                    └──────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React
* JavaScript (ES Modules)
* HTML5
* CSS3
* Vite

### Browser APIs

* MediaDevices API
* Canvas API
* Web Speech Recognition API
* `requestAnimationFrame`

### AI Integration

* Anthropic API
* OpenRouter API
* Mistral models
* Meta Llama models
* Google Gemma models
* Qwen models

### Development Tools

* Git
* GitHub
* VS Code
* ESLint

The repository's current `package.json` confirms React 19, ReactDOM, Vite, and ESLint as the project's declared dependencies/tooling.

---

## 📁 Project Structure

```text
VitaLens-AI/
│
├── public/
│
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

The main application logic is currently organized in `src/App.jsx`, which contains the dashboard, vital scanner, voice symptom reporter, AI integration, multilingual strings, medication module, and other application components.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/poojitha1116/VitaLens-AI.git
```

### 2. Navigate into the project

```bash
cd VitaLens-AI
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

### 5. Open the local application

Vite will provide a local development URL in the terminal.

---

## 🔐 API Configuration

The application currently contains client-side AI API integration.

For a production application, API keys should **not** be exposed in frontend source code.

A production-ready architecture should instead use:

```text
React Frontend
      │
      ▼
Backend API
      │
      ├── Authentication
      ├── Request Validation
      ├── AI API Calls
      └── Rate Limiting
```

This would protect credentials and provide better control over AI requests.

---

## ⚠️ Current Limitations

VitaLens AI is currently a prototype and has several limitations.

### Camera-based readings

The vital scanner uses simplified browser-side pixel analysis and generates demonstration estimates. It has not been clinically validated.

### AI-generated information

AI responses may be inaccurate or incomplete and should not be treated as medical advice.

### Security

AI API calls are currently implemented from the frontend. A production implementation should move sensitive API operations to a secure backend.

### Data persistence

The current repository is primarily a frontend prototype and does not currently contain a dedicated backend/database architecture.

### Medical validation

The risk scoring and vital estimation features have not undergone clinical validation.

---

## 🔮 Future Improvements

* Build a dedicated Python/FastAPI backend
* Add secure authentication and authorization
* Move AI API calls to the backend
* Add PostgreSQL/MongoDB persistence
* Implement proper API endpoints
* Replace prototype vital estimation with validated signal-processing methods
* Add automated testing
* Add proper model evaluation for risk prediction
* Improve accessibility and responsive design
* Deploy the frontend and backend
* Add structured health-data storage
* Add audit logging for AI requests

---

## 🎯 What I Learned

Through this project, I worked with:

* React component architecture
* React state management
* Browser APIs
* Webcam and canvas processing
* Speech recognition
* AI API integration
* Streaming AI responses
* Multilingual UI design
* Form handling
* Health-dashboard UI design
* Client-side application architecture

---

## ⚠️ Disclaimer

VitaLens AI is an educational software prototype.

It is **not a medical device**, does not provide medical diagnoses, and should not be used to make medical decisions.

Always consult a qualified healthcare professional for medical advice.

---

## 👩‍💻 Author

**PULAKANTI POOJITHA REDDY**

Computer Science Undergraduate | Software Development | AI/ML

GitHub: [@poojitha1116](https://github.com/poojitha1116)
