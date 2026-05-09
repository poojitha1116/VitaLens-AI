import { useState, useEffect, useRef } from "react";

// ─── AI CALL — Anthropic API primary, OpenRouter fallback ────────────────────
const OR_KEY = ""; // Remove secret - add your key here
const OR_MODELS = [
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2-7b-instruct:free",
];

// ── Anthropic Claude (primary — no key needed in artifact context) ────────────
async function callAnthropic(prompt, onChunk) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Anthropic HTTP ${res.status}: ${err.slice(0, 100)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.delta?.text || parsed.delta?.partial_json || "";
        if (delta) {
          fullText += delta;
          onChunk?.(fullText);
        }
      } catch { /* skip */ }
    }
  }
  return fullText;
}

// ── OpenRouter fallback ───────────────────────────────────────────────────────
async function callOpenRouter(prompt, onChunk) {
  for (const model of OR_MODELS) {
    try {
      console.log("[VitaLens] OpenRouter →", model);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OR_KEY}`,
          "HTTP-Referer": "https://vitalens.app",
          "X-Title": "VitaLens AI",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          stream: false,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        const text = data.choices?.[0]?.message?.content;
        if (text?.trim()) { onChunk?.(text); return text; }
      }
    } catch (e) {
      console.warn("[VitaLens] OR failed:", model, e.message);
    }
  }
  return null;
}

// ── Main entry point ──────────────────────────────────────────────────────────
async function callAI(prompt, onChunk = null) {
  try {
    console.log("[VitaLens] Calling Anthropic...");
    const text = await callAnthropic(prompt, onChunk);
    if (text?.trim()) return text;
    throw new Error("Empty response");
  } catch (e) {
    console.warn("[VitaLens] Anthropic failed:", e.message, "— trying OpenRouter...");
    return await callOpenRouter(prompt, onChunk);
  }
}


// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const NAV_BASE = [
  { id: "dashboard", icon: "◉", key: "overview" },
  { id: "vitals",    icon: "♡", key: "vitals" },
  { id: "symptoms",  icon: "⟡", key: "symptoms" },
  { id: "risk",      icon: "◈", key: "riskScore" },
  { id: "chat",      icon: "◎", key: "aiAdvisor" },
  { id: "meds",      icon: "⬡", key: "medications" },
  { id: "reports",   icon: "▦", key: "reports" },
  { id: "settings",  icon: "⊕", key: "settings" },
];

const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "hi", label: "Hindi",   flag: "🇮🇳" },
  { code: "te", label: "Telugu",  flag: "🇮🇳" },
  { code: "ta", label: "Tamil",   flag: "🇮🇳" },
];

const UI_STRINGS = {
  en: {
    overview:"Overview", vitals:"Vitals", symptoms:"Symptoms", riskScore:"Risk Score",
    aiAdvisor:"AI Advisor", medications:"Medications", reports:"Reports", settings:"Settings",
    healthPlatform:"Health Intelligence Platform",
    welcomeTitle:"Welcome to VitaLens AI", welcomeSub:"Your Personalized AI Health Companion. Here's an overview of your health dashboard.",
    heartRate:"Heart Rate", spo2:"SpO₂", riskScoreLabel:"Risk Score", stress:"Stress",
    lastUpdated:"Last updated just now", heartTrend:"Heart Rate Trend", last24:"Last 24 hrs",
    normalRange:"Normal range", recentSymptoms:"Recent Symptom Log", noSymptoms:"No symptoms logged yet",
    openBtn:"Open",
    mod01:"Module 01", mod02:"Module 02", mod03:"Module 03",
    mod04:"Module 04", mod05:"Module 05", mod06:"Module 06",
    vitalsTitle:"Facial Vitals Scanner", vitalsSub:"Remote photoplethysmography — heart rate & oxygen via your camera.",
    cameraFeed:"Camera Feed", cameraInactive:"Camera is inactive",
    startScan:"Start Scan", stopScan:"Stop Scan", analyzingFlow:"Analyzing pixel-level blood flow…",
    liveReadings:"Live Readings", bpm:"BPM", signalQuality:"Signal Quality", signalGood:"Good",
    demoNote:"Demo mode. Readings estimated from webcam pixels. Not for medical use.",
    symptomsTitle:"Voice Symptom Reporter", symptomsSub:"Speak naturally — AI triages your symptoms in seconds.",
    voiceInput:"Voice Input", listeningNow:"Listening — speak now…", pressRecord:"Press record to describe your symptoms",
    recordBtn:"Record", stopBtn:"Stop", clearBtn:"Clear", analyzeBtn:"Analyze →", analyzingMsg:"Analyzing…",
    typeManually:"Or type manually", typeSymptoms:"e.g. headache and mild fever…",
    aiTriage:"AI Triage", triageLevel:"Triage Level", summary:"Summary",
    recommendations:"Recommendations", recordFirst:"Record or type symptoms to analyze",
    riskTitle:"Predictive Risk Engine", riskSub:"AI-calculated disease risk from your personal health profile.",
    healthProfile:"Health Profile", age:"Age", sleepHrs:"Sleep (hrs)", exerciseDays:"Exercise (days/week)",
    gender:"Gender", smoking:"Smoking", bmi:"BMI",
    male:"Male", female:"Female", other:"Other", no:"No", yes:"Yes", former:"Former",
    familyHistory:"Family History", diabetes:"Diabetes", heart:"Heart", cancer:"Cancer",
    recentSymptomsLabel:"Recent Symptoms", symptomsPlaceholder:"Any recent symptoms…",
    calculateBtn:"Calculate Risk Score →", calculatingMsg:"Calculating…",
    riskAssessment:"Risk Assessment", outOf:"out of 100",
    topRisks:"Top Risk Factors", prevention:"Prevention", forecast30:"30-Day Forecast",
    fillForm:"Fill out the form to get your risk assessment",
    chatTitle:"AI Health Advisor", chatSub:"Evidence-based guidance, powered by AI.",
    chatGreeting:"Hello — I'm your AI Health Advisor. Ask me anything about your health metrics, symptoms, or wellness.",
    sayHeyVitals:'Say "Hey Vitals"', listeningDots:"Listening…", thinkingDots:"Thinking…", voiceOff:"Voice off",
    chatPlaceholder:'Ask a health question or say "Hey Vitals"…', sendBtn:"Send",
    medsTitle:"Medication Adherence", medsSub:"Track every dose. Never miss a medication.",
    addMed:"+ Add", newMed:"New Medication", name:"Name", dosage:"Dosage", time:"Time",
    namePlaceholder:"Aspirin", dosagePlaceholder:"81mg", saveMed:"Save Medication",
    adherenceTracker:"Adherence Tracker", adherenceSub:"Visualizing your medication intake for the last 90 days.",
    adherencePct:"adherence", taken:"Taken", partial:"Partial", missed:"Missed", upcoming:"Upcoming",
    less:"Less", more:"More", clickDot:"✦ Click any dot to change its status",
    reportsTitle:"AI Health Report", reportsSub:"Comprehensive summary of your health data, ready to share.",
    reportGenerator:"Report Generator", generateBtn:"Generate Report", generatingMsg:"Generating…",
    downloadBtn:"↓ Download", reportEmpty:'Click "Generate Report" to create your AI health summary',
    disclaimer:"Medical Disclaimer: For informational purposes only. Not a substitute for professional medical advice.",
    configuration:"Configuration", settingsTitle:"Settings & Preferences",
    appearance:"Appearance", darkMode:"Dark Mode", lightMode:"Light Mode",
    language:"Language", profile:"Profile", saveProfile:"Save Profile",
    claudeKey:"AI API Key", claudeHint:"Handled automatically via the API.",
    nameLabel:"Name", ageLabel:"Age", genderLabel:"Gender",
    streaming:"Streaming", streamingTokens:"Reasoning Tokens",
  },
  hi: {
    overview:"अवलोकन", vitals:"जीवन संकेत", symptoms:"लक्षण", riskScore:"जोखिम स्कोर",
    aiAdvisor:"AI सलाहकार", medications:"दवाएं", reports:"रिपोर्ट", settings:"सेटिंग्स",
    healthPlatform:"स्वास्थ्य बुद्धिमत्ता मंच",
    welcomeTitle:"VitaLens AI में आपका स्वागत है", welcomeSub:"आपका व्यक्तिगत AI स्वास्थ्य साथी।",
    heartRate:"हृदय गति", spo2:"SpO₂", riskScoreLabel:"जोखिम स्कोर", stress:"तनाव",
    lastUpdated:"अभी अपडेट किया", heartTrend:"हृदय गति प्रवृत्ति", last24:"पिछले 24 घंटे",
    normalRange:"सामान्य सीमा", recentSymptoms:"हाल के लक्षण", noSymptoms:"कोई लक्षण दर्ज नहीं",
    openBtn:"खोलें",
    mod01:"मॉड्यूल 01", mod02:"मॉड्यूल 02", mod03:"मॉड्यूल 03",
    mod04:"मॉड्यूल 04", mod05:"मॉड्यूल 05", mod06:"मॉड्यूल 06",
    vitalsTitle:"चेहरे से जीवन संकेत स्कैनर", vitalsSub:"rPPG तकनीक से हृदय गति और ऑक्सीजन माप।",
    cameraFeed:"कैमरा फ़ीड", cameraInactive:"कैमरा बंद है",
    startScan:"स्कैन शुरू करें", stopScan:"स्कैन रोकें", analyzingFlow:"पिक्सेल विश्लेषण हो रहा है…",
    liveReadings:"लाइव रीडिंग", bpm:"BPM", signalQuality:"सिग्नल गुणवत्ता", signalGood:"अच्छा",
    demoNote:"डेमो मोड। रीडिंग वेबकैम पिक्सेल से अनुमानित। चिकित्सा उपयोग के लिए नहीं।",
    symptomsTitle:"आवाज़ लक्षण रिपोर्टर", symptomsSub:"बोलें — AI तुरंत आपके लक्षणों का विश्लेषण करेगा।",
    voiceInput:"आवाज़ इनपुट", listeningNow:"सुन रहा है — अभी बोलें…", pressRecord:"लक्षण बताने के लिए रिकॉर्ड दबाएं",
    recordBtn:"रिकार्ड", stopBtn:"रोकें", clearBtn:"साफ़ करें", analyzeBtn:"विश्लेषण करें →", analyzingMsg:"विश्लेषण हो रहा है…",
    typeManually:"या मैन्युअल टाइप करें", typeSymptoms:"जैसे: सिरदर्द और हल्का बुखार…",
    aiTriage:"AI ट्राइएज", triageLevel:"ट्राइएज स्तर", summary:"सारांश",
    recommendations:"सिफ़ारिशें", recordFirst:"विश्लेषण के लिए लक्षण दर्ज करें",
    riskTitle:"भविष्यसूचक जोखिम इंजन", riskSub:"AI से रोग जोखिम की गणना।",
    healthProfile:"स्वास्थ्य प्रोफ़ाइल", age:"आयु", sleepHrs:"नींद (घंटे)", exerciseDays:"व्यायाम (दिन/सप्ताह)",
    gender:"लिंग", smoking:"धूम्रपान", bmi:"BMI",
    male:"पुरुष", female:"महिला", other:"अन्य", no:"नहीं", yes:"हाँ", former:"पूर्व",
    familyHistory:"पारिवारिक इतिहास", diabetes:"मधुमेह", heart:"हृदय", cancer:"कैंसर",
    recentSymptomsLabel:"हाल के लक्षण", symptomsPlaceholder:"कोई हाल के लक्षण…",
    calculateBtn:"जोखिम स्कोर गणना करें →", calculatingMsg:"गणना हो रही है…",
    riskAssessment:"जोखिम मूल्यांकन", outOf:"100 में से",
    topRisks:"मुख्य जोखिम कारक", prevention:"बचाव", forecast30:"30-दिन का पूर्वानुमान",
    fillForm:"जोखिम मूल्यांकन के लिए फ़ॉर्म भरें",
    chatTitle:"AI स्वास्थ्य सलाहकार", chatSub:"AI द्वारा साक्ष्य-आधारित मार्गदर्शन।",
    chatGreeting:"नमस्ते! मैं आपका AI स्वास्थ्य सलाहकार हूँ।",
    sayHeyVitals:'"Hey Vitals" कहें', listeningDots:"सुन रहा है…", thinkingDots:"सोच रहा है…", voiceOff:"आवाज़ बंद",
    chatPlaceholder:"स्वास्थ्य प्रश्न पूछें…", sendBtn:"भेजें",
    medsTitle:"दवा अनुपालन", medsSub:"हर खुराक ट्रैक करें।",
    addMed:"+ जोड़ें", newMed:"नई दवा", name:"नाम", dosage:"खुराक", time:"समय",
    namePlaceholder:"एस्पिरिन", dosagePlaceholder:"81mg", saveMed:"दवा सहेजें",
    adherenceTracker:"अनुपालन ट्रैकर", adherenceSub:"पिछले 90 दिनों की दवा सेवन विज़ुअलाइज़ेशन।",
    adherencePct:"अनुपालन", taken:"ली गई", partial:"आंशिक", missed:"चूकी", upcoming:"आगामी",
    less:"कम", more:"अधिक", clickDot:"✦ किसी भी बिंदु पर क्लिक करें",
    reportsTitle:"AI स्वास्थ्य रिपोर्ट", reportsSub:"आपके स्वास्थ्य डेटा का सारांश।",
    reportGenerator:"रिपोर्ट जनरेटर", generateBtn:"रिपोर्ट बनाएं", generatingMsg:"बन रही है…",
    downloadBtn:"↓ डाउनलोड", reportEmpty:"AI स्वास्थ्य सारांश के लिए क्लिक करें",
    disclaimer:"चिकित्सा अस्वीकरण: केवल जानकारी के लिए।",
    configuration:"कॉन्फ़िगरेशन", settingsTitle:"सेटिंग्स और प्राथमिकताएं",
    appearance:"दिखावट", darkMode:"डार्क मोड", lightMode:"लाइट मोड",
    language:"भाषा", profile:"प्रोफ़ाइल", saveProfile:"प्रोफ़ाइल सहेजें",
    claudeKey:"API कुंजी", claudeHint:"स्वचालित रूप से संभाला गया।",
    nameLabel:"नाम", ageLabel:"आयु", genderLabel:"लिंग",
    streaming:"स्ट्रीमिंग", streamingTokens:"रीज़निंग टोकन",
  },
  te: {
    overview:"అవలోకనం", vitals:"జీవన సంకేతాలు", symptoms:"లక్షణాలు", riskScore:"రిస్క్ స్కోర్",
    aiAdvisor:"AI సలహాదారు", medications:"మందులు", reports:"నివేదికలు", settings:"సెట్టింగ్‌లు",
    healthPlatform:"ఆరోగ్య మేధో వేదిక",
    welcomeTitle:"VitaLens AI కి స్వాగతం", welcomeSub:"మీ వ్యక్తిగత AI ఆరోగ్య సహచరుడు.",
    heartRate:"హృదయ స్పందన", spo2:"SpO₂", riskScoreLabel:"రిస్క్ స్కోర్", stress:"ఒత్తిడి",
    lastUpdated:"ఇప్పుడే నవీకరించబడింది", heartTrend:"హృదయ స్పందన ధోరణి", last24:"గత 24 గంటలు",
    normalRange:"సాధారణ పరిధి", recentSymptoms:"ఇటీవలి లక్షణాలు", noSymptoms:"లక్షణాలు నమోదు కాలేదు",
    openBtn:"తెరవండి",
    mod01:"మాడ్యూల్ 01", mod02:"మాడ్యూల్ 02", mod03:"మాడ్యూల్ 03",
    mod04:"మాడ్యూల్ 04", mod05:"మాడ్యూల్ 05", mod06:"మాడ్యూల్ 06",
    vitalsTitle:"ముఖ జీవన సంకేతాల స్కేనర్", vitalsSub:"కెమరా ద్వారా హృదయ స్పందన అళవీడు.",
    cameraFeed:"కెమరా ఫీడ్", cameraInactive:"కెమరా నిష్క్రియంగా ఉంది",
    startScan:"స్కేన్ ప్రారంభించు", stopScan:"స్కేన్ ఆపు", analyzingFlow:"పిక్సెల్ విశ్లేషణ జరుగుతోంది…",
    liveReadings:"లైవ్ రీడింగ్స్", bpm:"BPM", signalQuality:"సిగ్నల్ నాణ్యత", signalGood:"మంచిది",
    demoNote:"డెమో మోడ్. వెబ్‌క్యామ్ పిక్సెల్ నుండి అంచనా. వైద్య వినియోగానికి కాదు.",
    symptomsTitle:"వాయిస్ లక్షణ రిపోర్టర్", symptomsSub:"మాట్లాడండి — AI వెంటనే విశ్లేషిస్తుంది.",
    voiceInput:"వాయిస్ ఇన్‌పుట్", listeningNow:"వింటున్నాను — ఇప్పుడు మాట్లాడండి…", pressRecord:"రికార్డ్ నొక్కండి",
    recordBtn:"రికార్డ్", stopBtn:"ఆపు", clearBtn:"తీసివేయి", analyzeBtn:"విశ్లేషించు →", analyzingMsg:"విశ్లేషిస్తున్నాను…",
    typeManually:"లేదా మాన్యువల్‌గా టైప్ చేయండి", typeSymptoms:"ఉదా: తలనొప్పి మరియు జ్వరం…",
    aiTriage:"AI ట్రయాజ్", triageLevel:"ట్రయాజ్ స్తర", summary:"సారాంశం",
    recommendations:"సిఫారిశులు", recordFirst:"లక్షణాలు నమోదు చేయండి",
    riskTitle:"అంచనా రిస్క్ ఇంజిన్", riskSub:"AI రిస్క్ లెక్కింపు.",
    healthProfile:"ఆరోగ్య ప్రొఫైల్", age:"వయస్సు", sleepHrs:"నిద్ర (గంటలు)", exerciseDays:"వ్యాయామం (రోజులు/వారం)",
    gender:"లింగం", smoking:"ధూమపానం", bmi:"BMI",
    male:"పురుషుడు", female:"మహిళ", other:"ఇతర", no:"లేదు", yes:"అవును", former:"మాజీ",
    familyHistory:"కుటుంబ చరిత్ర", diabetes:"మధుమేహం", heart:"హృదయం", cancer:"క్యాన్సర్",
    recentSymptomsLabel:"ఇటీవలి లక్షణాలు", symptomsPlaceholder:"ఏదైనా ఇటీవలి లక్షణాలు…",
    calculateBtn:"రిస్క్ స్కోర్ లెక్కించు →", calculatingMsg:"లెక్కిస్తున్నాను…",
    riskAssessment:"రిస్క్ అంచనా", outOf:"100 లో",
    topRisks:"ముఖ్య రిస్క్ అంశాలు", prevention:"నివారణ", forecast30:"30-రోజుల అంచనా",
    fillForm:"ఫారం పూరించండి",
    chatTitle:"AI ఆరోగ్య సలహాదారు", chatSub:"AI మార్గదర్శకత్వం.",
    chatGreeting:"నమస్కారం! నేను మీ AI ఆరోగ్య సలహాదారుని.",
    sayHeyVitals:'"Hey Vitals" అనండి', listeningDots:"వింటున్నాను…", thinkingDots:"ఆలోచిస్తున్నాను…", voiceOff:"వాయిస్ ఆఫ్",
    chatPlaceholder:"ఆరోగ్య ప్రశ్న అడగండి…", sendBtn:"పంపించు",
    medsTitle:"దవా అనుపాలన", medsSub:"ప్రతి మోతాదు ట్రాక్ చేయండి.",
    addMed:"+ జోడించు", newMed:"కొత్త మందు", name:"పేరు", dosage:"మోతాదు", time:"సమయం",
    namePlaceholder:"అస్పిరిన్", dosagePlaceholder:"81mg", saveMed:"మందు సేవ్",
    adherenceTracker:"అనుపాలన ట్రాకర్", adherenceSub:"గత 90 రోజుల విజువలైజేషన్.",
    adherencePct:"అనుపాలన", taken:"తీసుకున్నారు", partial:"పాక్షిక", missed:"తప్పించారు", upcoming:"ఆగామీ",
    less:"తక్కువ", more:"అధిక", clickDot:"✦ స్థితి మార్చడానికి క్లిక్ చేయండి",
    reportsTitle:"AI ఆరోగ్య నివేదిక", reportsSub:"సమగ్ర AI సారాంశం.",
    reportGenerator:"నివేదిక జనరేటర్", generateBtn:"నివేదిక రూపొందించు", generatingMsg:"రూపొందిస్తున్నాను…",
    downloadBtn:"↓ డౌన్‌లోడ్", reportEmpty:"నివేదిక కోసం క్లిక్ చేయండి",
    disclaimer:"వైద్య నిరాకరణ: కేవలం సమాచారం మాత్రమే.",
    configuration:"కాన్ఫిగరేషన్", settingsTitle:"సెట్టింగ్స్ మరియు ప్రాధాన్యతలు",
    appearance:"రూపం", darkMode:"డార్క్ మోడ్", lightMode:"లైట్ మోడ్",
    language:"భాష", profile:"ప్రొఫైల్", saveProfile:"ప్రొఫైల్ సేవ్",
    claudeKey:"API కీ", claudeHint:"స్వయంచాలకంగా నిర్వహించబడుతుంది.",
    nameLabel:"పేరు", ageLabel:"వయస్సు", genderLabel:"లింగం",
    streaming:"స్ట్రీమింగ్", streamingTokens:"రీజనింగ్ టోకన్లు",
  },
  ta: {
    overview:"மேலோட்டம்", vitals:"உயிர் அறிகுறிகள்", symptoms:"அறிகுறிகள்", riskScore:"அபாய மதிப்பெண்",
    aiAdvisor:"AI ஆலோசகர்", medications:"மருந்துகள்", reports:"அறிக்கைகள்", settings:"அமைப்புகள்",
    healthPlatform:"சுகாதார நுண்ணறிவு தளம்",
    welcomeTitle:"VitaLens AI-க்கு வரவேற்கிறோம்", welcomeSub:"உங்கள் தனிப்பட்ட AI சுகாதார துணை.",
    heartRate:"இதய துடிப்பு", spo2:"SpO₂", riskScoreLabel:"அபாய மதிப்பெண்", stress:"மன அழுத்தம்",
    lastUpdated:"இப்போதே புதுப்பிக்கப்பட்டது", heartTrend:"இதய துடிப்பு போக்கு", last24:"கடந்த 24 மணி",
    normalRange:"சாதாரண வரம்பு", recentSymptoms:"சமீபத்திய அறிகுறிகள்", noSymptoms:"அறிகுறிகள் பதிவில்லை",
    openBtn:"திற",
    mod01:"தொகுதி 01", mod02:"தொகுதி 02", mod03:"தொகுதி 03",
    mod04:"தொகுதி 04", mod05:"தொகுதி 05", mod06:"தொகுதி 06",
    vitalsTitle:"முகம் உயிர் அறிகுறி ஸ்கேனர்", vitalsSub:"கேமரா மூலம் அளவீடு.",
    cameraFeed:"கேமரா ஊட்டம்", cameraInactive:"கேமரா செயலற்றது",
    startScan:"ஸ்கேன் தொடங்கு", stopScan:"ஸ்கேன் நிறுத்து", analyzingFlow:"பகுப்பாய்வு நடக்கிறது…",
    liveReadings:"நேரடி அளவீடுகள்", bpm:"BPM", signalQuality:"சிக்னல் தரம்", signalGood:"நல்லது",
    demoNote:"டெமோ பயன்முறை. வைத்திய பயன்பாட்டிற்கு அல்ல.",
    symptomsTitle:"குரல் அறிகுறி அறிக்கையாளர்", symptomsSub:"பேசுங்கள் — AI உடனடியாக பகுப்பாய்வு செய்யும்.",
    voiceInput:"குரல் உள்ளீடு", listeningNow:"கேட்கிறேன்…", pressRecord:"ரெக்கார்ட் அழுத்தவும்",
    recordBtn:"பதிவு", stopBtn:"நிறுத்து", clearBtn:"அழி", analyzeBtn:"பகுப்பாய்வு →", analyzingMsg:"பகுப்பாய்வு நடக்கிறது…",
    typeManually:"கைமுறையாக டைப் செய்யவும்", typeSymptoms:"எ.கா: தலைவலி மற்றும் காய்ச்சல்…",
    aiTriage:"AI ட்ரியாஜ்", triageLevel:"ட்ரியாஜ் நிலை", summary:"சுருக்கம்",
    recommendations:"பரிந்துரைகள்", recordFirst:"அறிகுறிகளை பதிவு செய்யவும்",
    riskTitle:"முன்கணிப்பு அபாய இயந்திரம்", riskSub:"AI அபாய கணக்கீடு.",
    healthProfile:"சுகாதார சுயவிவரம்", age:"வயது", sleepHrs:"தூக்கம் (மணி)", exerciseDays:"உடற்பயிற்சி (நாட்கள்/வாரம்)",
    gender:"பாலினம்", smoking:"புகைபிடித்தல்", bmi:"BMI",
    male:"ஆண்", female:"பெண்", other:"மற்றவை", no:"இல்லை", yes:"உண்டு", former:"முன்பு",
    familyHistory:"குடும்ப வரலாறு", diabetes:"நீரிழிவு", heart:"இதயம்", cancer:"புற்றுநோய்",
    recentSymptomsLabel:"சமீபத்திய அறிகுறிகள்", symptomsPlaceholder:"சமீபத்திய அறிகுறிகள்…",
    calculateBtn:"அபாய மதிப்பெண் கணக்கிடு →", calculatingMsg:"கணக்கிடுகிறேன்…",
    riskAssessment:"அபாய மதிப்பீடு", outOf:"100இல்",
    topRisks:"முக்கிய அபாய காரணிகள்", prevention:"தடுப்பு", forecast30:"30-நாள் முன்னறிவிப்பு",
    fillForm:"படிவத்தை நிரப்பவும்",
    chatTitle:"AI சுகாதார ஆலோசகர்", chatSub:"AI மார்க்கடர்சி.",
    chatGreeting:"வணக்கம்! நான் உங்கள் AI சுகாதார ஆலோசகர்.",
    sayHeyVitals:'"Hey Vitals" சொல்லுங்கள்', listeningDots:"கேட்கிறேன்…", thinkingDots:"யோசிக்கிறேன்…", voiceOff:"குரல் அணைவு",
    chatPlaceholder:"சுகாதார கேள்வி கேளுங்கள்…", sendBtn:"அனுப்பு",
    medsTitle:"மருந்து இணக்கம்", medsSub:"ஒவ்வொரு மருந்தையும் கண்காணிக்கவும்.",
    addMed:"+ சேர்", newMed:"புதிய மருந்து", name:"பெயர்", dosage:"மருந்தளவு", time:"நேரம்",
    namePlaceholder:"ஆஸ்பிரின்", dosagePlaceholder:"81mg", saveMed:"மருந்து சேமி",
    adherenceTracker:"இணக்க கண்காணிப்பு", adherenceSub:"கடந்த 90 நாட்களின் காட்சிப்படுத்தல்.",
    adherencePct:"இணக்கம்", taken:"எடுத்தது", partial:"பகுதியளவு", missed:"தவறினது", upcoming:"வரவிருக்கும்",
    less:"குறைவு", more:"அதிகம்", clickDot:"✦ நிலை மாற்ற கிளிக் செய்யவும்",
    reportsTitle:"AI சுகாதார அறிக்கை", reportsSub:"விரிவான AI சுருக்கம்.",
    reportGenerator:"அறிக்கை உருவாக்கி", generateBtn:"அறிக்கை உருவாக்கு", generatingMsg:"உருவாக்குகிறேன்…",
    downloadBtn:"↓ பதிவிறக்கம்", reportEmpty:"அறிக்கை உருவாக்க கிளிக் செய்யவும்",
    disclaimer:"மருத்துவ மறுப்பு: தகவல் நோக்கங்களுக்கு மட்டுமே.",
    configuration:"கட்டமைப்பு", settingsTitle:"அமைப்புகள் மற்றும் விருப்பங்கள்",
    appearance:"தோற்றம்", darkMode:"இருண்ட பயன்முறை", lightMode:"ஒளி பயன்முறை",
    language:"மொழி", profile:"சுயவிவரம்", saveProfile:"சுயவிவரத்தை சேமி",
    claudeKey:"API விசை", claudeHint:"தானாக கையாளப்படுகிறது.",
    nameLabel:"பெயர்", ageLabel:"வயது", genderLabel:"பாலினம்",
    streaming:"ஸ்ட்ரீமிங்", streamingTokens:"ரீசனிங் டோக்கன்கள்",
  },
};

function tr(lang, key) {
  return (UI_STRINGS[lang] || UI_STRINGS.en)[key] || UI_STRINGS.en[key] || key;
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:    #0A1A2F;
  --ink2:   #122A45;
  --ink3:   #163452;
  --border: rgba(42,125,225,0.15);
  --border2:rgba(42,125,225,0.30);
  --text:   #E5F0F6;
  --muted:  #94A3B8;
  --dim:    #B8CDD9;
  --cyan:   #2A7DE1;
  --mint:   #14B8A6;
  --rose:   #EF4444;
  --amber:  #F59E0B;
  --sage:   #14B8A6;
  --ice:    #2A7DE1;
  --violet: #8B5CF6;
  --gold:   #F59E0B;
  --accent: #2A7DE1;
}

.light {
  --ink:    #F7FAFC;
  --ink2:   #FFFFFF;
  --ink3:   #EDF2F7;
  --border: #E5E7EB;
  --border2:#CBD5E0;
  --text:   #1F2937;
  --muted:  #6B7280;
  --dim:    #374151;
  --cyan:   #2A7DE1;
  --mint:   #14B8A6;
  --rose:   #EF4444;
  --amber:  #F59E0B;
  --sage:   #14B8A6;
  --ice:    #2A7DE1;
  --violet: #7C3AED;
  --gold:   #F59E0B;
  --accent: #2A7DE1;
}

.light .btn-white               { background: #2A7DE1; color: #ffffff; }
.light .btn-white:hover         { background: #1E63C4; opacity: 1; }
.light .btn-ghost               { background: rgba(42,125,225,0.06); border-color: #E5E7EB; color: #1F2937; }
.light .btn-ghost:hover         { background: rgba(42,125,225,0.12); border-color: #CBD5E0; }
.light .rn:hover                { background: rgba(42,125,225,0.06); }
.light .rn.on                   { color: #2A7DE1; background: rgba(42,125,225,0.08); border-right-color: #2A7DE1; }
.light .card-stripe             { background: linear-gradient(90deg, transparent 0%, rgba(42,125,225,0.18) 50%, transparent 100%); }
.light .inp:focus,
.light .sel:focus,
.light .ta:focus                { border-color: #2A7DE1; background: rgba(42,125,225,0.04); }
.light .sel option              { background: #FFFFFF; color: #1F2937; }
.light .qchip:hover             { border-color: #CBD5E0; color: #2A7DE1; background: rgba(42,125,225,0.06); }
.light .cmsg-user .cmsg-bubble  { background: rgba(42,125,225,0.08); border-color: rgba(42,125,225,0.2); }
.light .va-fab                  { background: linear-gradient(135deg,#F7FAFC,#EDF2F7); border-color: rgba(42,125,225,0.4); box-shadow: 0 0 20px rgba(42,125,225,0.12), 0 4px 24px rgba(0,0,0,0.08); }
.light .dot-live                { background: #14B8A6; box-shadow: 0 0 8px #14B8A6; }
.light .pbar                    { background: rgba(42,125,225,0.08); }
.light .pfill                   { background: #2A7DE1; }

html { scroll-behavior: smooth; }
body {
  background: var(--ink);
  color: var(--text);
  font-family: 'Geist', sans-serif;
  font-weight: 400;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s, color 0.3s;
}

.shell { display: flex; min-height: 100vh; }

.rail {
  width: 64px;
  background: var(--ink2);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 0 16px;
  position: fixed; top: 0; left: 0; height: 100vh;
  z-index: 200;
  transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
}
.rail:hover { width: 196px; }
.rail-logo {
  font-family: 'Instrument Serif', serif;
  font-size: 19px;
  color: var(--text);
  letter-spacing: 0.08em;
  margin-bottom: 28px;
  padding: 0 18px;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
}
.rail-logo span { color: var(--muted); font-style: italic; }

.rail-nav { display: flex; flex-direction: column; gap: 2px; width: 100%; }
.rn {
  display: flex; align-items: center; gap: 14px;
  padding: 11px 20px;
  cursor: pointer;
  color: var(--muted);
  font-size: 15px;
  white-space: nowrap; overflow: hidden;
  border-right: 2px solid transparent;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.rn:hover { color: var(--text); background: rgba(42,125,225,0.08); }
.rn.on { color: #2A7DE1; background: rgba(42,125,225,0.12); border-right-color: #2A7DE1; }
.rn-icon { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; opacity: 0.7; }
.rn.on .rn-icon { opacity: 1; }
.rn-label { font-size: 15px; font-weight: 500; letter-spacing: 0.01em; }

.rail-foot {
  margin-top: auto;
  padding: 12px 20px 0;
  border-top: 1px solid var(--border);
  width: 100%;
}
.rail-foot-label {
  font-size: 13px; color: var(--muted); text-transform: uppercase;
  letter-spacing: 0.1em; white-space: nowrap;
}

.stage {
  margin-left: 64px;
  flex: 1;
  padding: 48px 48px 64px;
  min-height: 100vh;
}

.ph { margin-bottom: 36px; }
.ph-eyebrow {
  font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--muted); margin-bottom: 10px; font-weight: 500;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 52px; line-height: 1.05;
  color: var(--text); margin-bottom: 8px; font-weight: 400;
}
.ph-title em { font-style: italic; color: var(--dim); }
.ph-sub { color: var(--muted); font-size: 17px; font-weight: 300; max-width: 480px; }

.card {
  background: var(--ink2);
  border: 1px solid var(--border);
  border-radius: 16px; padding: 28px;
  position: relative; overflow: hidden;
  transition: border-color 0.2s;
}
.card:hover { border-color: var(--border2); }
.card-stripe {
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(42,125,225,0.35) 50%, transparent 100%);
}
.card-label {
  font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--muted); margin-bottom: 14px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
.card-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }

.stat-tile {
  background: var(--ink2);
  border: 1px solid var(--border);
  border-radius: 14px; padding: 22px;
  position: relative; overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}
.stat-tile:hover { border-color: var(--border2); transform: translateY(-1px); }
.st-eyebrow { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 12px; font-weight: 600; }
.st-val { font-family: 'Instrument Serif', serif; font-size: 52px; line-height: 1; color: var(--text); }
.st-unit { font-size: 20px; color: var(--muted); font-family: 'Geist', sans-serif; }
.st-meta { font-size: 15px; color: var(--muted); margin-top: 10px; }
.st-dot { position: absolute; top: 20px; right: 20px; width: 8px; height: 8px; border-radius: 50%; }
.dot-live { background: #14B8A6; box-shadow: 0 0 8px #14B8A6; animation: blink 2s ease-in-out infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 22px; border-radius: 8px; border: none;
  cursor: pointer; font-family: 'Geist', sans-serif;
  font-size: 15px; font-weight: 500; letter-spacing: 0.01em;
  transition: all 0.15s;
}
.btn-white { background: #2A7DE1; color: #ffffff; }
.btn-white:hover { opacity: 0.88; }
.btn-ghost { background: rgba(42,125,225,0.08); border: 1px solid var(--border); color: var(--text); }
.btn-ghost:hover { background: rgba(42,125,225,0.15); border-color: var(--border2); }
.btn-danger { background: rgba(245,101,101,0.12); border: 1px solid rgba(245,101,101,0.25); color: var(--rose); }
.btn-danger:hover { background: rgba(245,101,101,0.2); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-sm { padding: 7px 14px; font-size: 14px; }
.btn-full { width: 100%; justify-content: center; }

.inp, .sel, .ta {
  background: var(--ink3);
  border: 1px solid var(--border);
  color: var(--text); padding: 11px 15px;
  border-radius: 8px;
  font-family: 'Geist', sans-serif; font-size: 16px;
  width: 100%; outline: none;
  transition: border-color 0.15s, background 0.15s;
}
.inp:focus, .sel:focus, .ta:focus {
  border-color: rgba(42,125,225,0.60);
  background: rgba(42,125,225,0.05);
}
.inp::placeholder, .ta::placeholder { color: var(--muted); }
.sel option { background: #1c1c22; }
.fg { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.fl { font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }

.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 13px; border-radius: 20px;
  font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
}
.badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; }
.badge-low    { background: rgba(104,211,145,0.1); color: var(--sage);  border: 1px solid rgba(104,211,145,0.2); }
.badge-low::before { background: var(--sage); }
.badge-medium { background: rgba(246,173,85,0.1);  color: var(--amber); border: 1px solid rgba(246,173,85,0.2); }
.badge-medium::before { background: var(--amber); }
.badge-urgent, .badge-high { background: rgba(245,101,101,0.1); color: var(--rose); border: 1px solid rgba(245,101,101,0.2); }
.badge-urgent::before, .badge-high::before { background: var(--rose); }

.div { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

.vring {
  width: 128px; height: 128px; border-radius: 50%;
  border: 1.5px solid var(--border2);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  margin: 0 auto; transition: border-color 0.3s;
}
.vring-val { font-family: 'Instrument Serif', serif; font-size: 36px; line-height: 1; }
.vring-unit { font-size: 13px; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
.vring.live { animation: ring-pulse 1.5s ease-in-out infinite; }
@keyframes ring-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.15); border-color: rgba(20,184,166,0.3); }
  50% { box-shadow: 0 0 0 8px rgba(20,184,166,0); border-color: rgba(20,184,166,0.6); }
}

.cam-wrap {
  border-radius: 12px; overflow: hidden;
  border: 1px solid var(--border); background: var(--ink3);
  position: relative; min-height: 200px;
  display: flex; align-items: center; justify-content: center;
}
.cam-wrap video { width: 100%; display: block; }
.cam-scan {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to bottom,transparent 0%,rgba(42,125,225,0.06) 50%,transparent 100%);
  animation: scanline 2.5s linear infinite;
}
@keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
.cam-corner { position: absolute; width: 16px; height: 16px; border-color: rgba(42,125,225,0.6); border-style: solid; }
.cam-corner.tl { top:10px; left:10px;  border-width:1px 0 0 1px; }
.cam-corner.tr { top:10px; right:10px; border-width:1px 1px 0 0; }
.cam-corner.bl { bottom:10px; left:10px;  border-width:0 0 1px 1px; }
.cam-corner.br { bottom:10px; right:10px; border-width:0 1px 1px 0; }

.voice-bars { display: flex; align-items: center; justify-content: center; gap: 3px; height: 24px; }
.vb { width: 2.5px; background: #2A7DE1; border-radius: 2px; animation: vbounce 0.6s ease-in-out infinite alternate; }
@keyframes vbounce { from{height:4px} to{height:22px} }

/* ── STREAM INDICATOR ───────────────────────────────────────── */
.stream-indicator {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 12px;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  background: rgba(20,184,166,0.1); border: 1px solid rgba(20,184,166,0.25);
  color: var(--sage); margin-bottom: 8px;
}
.stream-indicator .s-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--sage); animation: blink 1s ease-in-out infinite;
}
.stream-cursor {
  display: inline-block; width: 2px; height: 1em;
  background: var(--sage); margin-left: 2px; vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}

.chat-scroll {
  height: 360px; overflow-y: auto; display: flex; flex-direction: column;
  gap: 14px; padding: 20px;
}
.chat-scroll::-webkit-scrollbar { width: 3px; }
.chat-scroll::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

.cmsg { display: flex; flex-direction: column; }
.cmsg-user { align-items: flex-end; }
.cmsg-ai { align-items: flex-start; }
.cmsg-bubble { max-width: 76%; padding: 13px 18px; font-size: 16px; line-height: 1.65; border-radius: 14px; }
.cmsg-user .cmsg-bubble { background: rgba(42,125,225,0.10); border: 1px solid rgba(42,125,225,0.25); border-radius: 14px 14px 4px 14px; }
.cmsg-ai .cmsg-bubble { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 14px 14px 14px 4px; color: var(--dim); }
.cmsg-time { font-size: 12px; color: var(--muted); margin-top: 4px; padding: 0 4px; }

.chat-bar { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--border); }
.qchips { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 20px 0; }
.qchip {
  padding: 6px 14px; border-radius: 20px;
  border: 1px solid var(--border); background: transparent;
  color: var(--muted); font-size: 14px; font-family: 'Geist', sans-serif;
  cursor: pointer; transition: all 0.15s;
}
.qchip:hover { border-color: var(--border2); color: #2A7DE1; background: rgba(42,125,225,0.08); }

.typing { display: flex; align-items: center; gap: 5px; padding: 12px 16px; }
.tdot { width: 5px; height: 5px; border-radius: 50%; background: var(--muted); animation: tdot 1.2s ease infinite; }
.tdot:nth-child(2){animation-delay:0.2s} .tdot:nth-child(3){animation-delay:0.4s}
@keyframes tdot { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-5px);opacity:1} }

.gauge-wrap { display: flex; flex-direction: column; align-items: center; }

.pbar { background: rgba(255,255,255,0.05); border-radius: 4px; height: 4px; overflow: hidden; }
.pfill { height: 100%; border-radius: 4px; transition: width 1s ease; background: var(--text); }

.flex { display: flex; }
.fc { flex-direction: column; }
.gap1 { gap: 6px; }
.gap2 { gap: 10px; }
.gap3 { gap: 16px; }
.ai-c { align-items: center; }
.jb { justify-content: space-between; }
.jc { justify-content: center; }
.fw { flex-wrap: wrap; }
.mt1{margin-top:6px} .mt2{margin-top:12px} .mt3{margin-top:20px} .mt4{margin-top:28px}
.mb2{margin-bottom:10px} .mb3{margin-bottom:18px}
.tc { text-align: center; }
.w100 { width: 100%; }
.t-sm{font-size:16px} .t-xs{font-size:14px}
.t-muted{color:var(--muted)} .t-dim{color:var(--dim)}
.t-sage{color:var(--sage)} .t-rose{color:var(--rose)}
.t-amber{color:var(--amber)} .t-ice{color:var(--ice)}
.serif{font-family:'Instrument Serif',serif}
.fw600{font-weight:600}

@keyframes up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
.fade { animation: up 0.35s ease; }

::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

@media(max-width:900px){
  .g3,.g4{grid-template-columns:1fr 1fr}
  .stage{padding:28px 20px 48px}
}
@media(max-width:600px){
  .g2,.g3,.g4{grid-template-columns:1fr}
  .ph-title{font-size:38px}
}

.va-fab {
  position:fixed; bottom:32px; right:32px;
  width:60px; height:60px; border-radius:50%;
  background:linear-gradient(135deg,#0A1A2F,#122A45);
  border:1.5px solid rgba(42,125,225,0.45);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; z-index:999;
  transition:all 0.25s;
  box-shadow:0 0 20px rgba(42,125,225,0.20),0 4px 24px rgba(0,0,0,0.5);
}
.va-fab:hover{border-color:rgba(42,125,225,0.85);box-shadow:0 0 32px rgba(42,125,225,0.35);transform:scale(1.06)}
.va-fab.va-open{border-color:#14B8A6;animation:va-ring 1.4s ease-out infinite}
.va-fab.va-listening{border-color:#EF4444;animation:va-ring-red 1s ease-out infinite}
@keyframes va-ring{0%{box-shadow:0 0 0 0 rgba(20,184,166,0.5)}70%{box-shadow:0 0 0 16px rgba(20,184,166,0)}100%{box-shadow:0 0 0 0 rgba(20,184,166,0)}}
@keyframes va-ring-red{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.6)}70%{box-shadow:0 0 0 18px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}

.va-panel{
  position:fixed; bottom:104px; right:32px; width:340px;
  background:#0A1A2F; border:1px solid rgba(42,125,225,0.25);
  border-radius:20px; z-index:998;
  box-shadow:0 24px 64px rgba(0,0,0,0.7),0 0 40px rgba(42,125,225,0.08);
  overflow:hidden;
  animation:va-slide 0.25s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes va-slide{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
.va-head{padding:14px 18px 12px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between}
.va-title{font-family:'Instrument Serif',serif;font-size:15px;color:#E5F0F6;display:flex;align-items:center;gap:8px}
.va-dot{width:7px;height:7px;border-radius:50%;background:#14B8A6;animation:blink 1.5s ease-in-out infinite}
.va-dot.red{background:#EF4444}
.va-dot.amber{background:#F59E0B;animation:none}
.va-close{background:none;border:none;color:rgba(240,239,245,0.4);cursor:pointer;font-size:18px;padding:2px 6px;border-radius:4px;transition:color 0.15s}
.va-close:hover{color:#f0eff5}

.va-msgs{height:200px;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.va-msgs::-webkit-scrollbar{width:3px}
.va-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
.va-msg{display:flex;flex-direction:column}
.va-msg.user{align-items:flex-end}
.va-msg.ai{align-items:flex-start}
.va-bubble{max-width:88%;padding:9px 14px;font-size:13px;line-height:1.6;border-radius:14px;font-family:'Geist',sans-serif}
.va-msg.user .va-bubble{background:rgba(42,125,225,0.14);border:1px solid rgba(42,125,225,0.30);color:#E5F0F6;border-radius:14px 14px 4px 14px}
.va-msg.ai  .va-bubble{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:rgba(229,240,246,0.8);border-radius:14px 14px 14px 4px}

.va-wave{display:flex;align-items:center;justify-content:center;gap:3px;padding:8px 16px}
.va-bar{width:3px;border-radius:2px;background:#EF4444;animation:va-wv 0.5s ease-in-out infinite alternate}
.va-bar:nth-child(2){animation-delay:0.1s}.va-bar:nth-child(3){animation-delay:0.2s}
.va-bar:nth-child(4){animation-delay:0.3s}.va-bar:nth-child(5){animation-delay:0.4s}
@keyframes va-wv{from{height:4px}to{height:20px}}

.va-hints{display:flex;flex-wrap:wrap;gap:5px;padding:10px 14px 4px}
.va-hint{padding:4px 10px;border-radius:14px;font-size:11px;border:1px solid rgba(42,125,225,0.25);background:rgba(42,125,225,0.08);color:#2A7DE1;cursor:pointer;font-family:'Geist',sans-serif;transition:all 0.15s}
.va-hint:hover{background:rgba(42,125,225,0.18);border-color:rgba(42,125,225,0.50)}

.va-bar-row{display:flex;gap:8px;padding:10px 14px;border-top:1px solid rgba(255,255,255,0.06)}
.va-inp{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#E5F0F6;padding:8px 12px;border-radius:8px;font-family:'Geist',sans-serif;font-size:13px;outline:none}
.va-inp:focus{border-color:rgba(42,125,225,0.5)}
.va-inp::placeholder{color:rgba(229,240,246,0.3)}
.va-send{padding:8px 14px;border-radius:8px;border:none;background:rgba(42,125,225,0.18);color:#2A7DE1;font-family:'Geist',sans-serif;font-size:13px;cursor:pointer;transition:background 0.15s;white-space:nowrap}
.va-send:hover{background:rgba(42,125,225,0.32)}
.va-mic-btn{padding:8px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#EF4444;font-size:14px;cursor:pointer;transition:all 0.15s}
.va-mic-btn:hover{background:rgba(239,68,68,0.18)}
.va-mic-btn.active{background:rgba(239,68,68,0.2);border-color:#EF4444;animation:va-ring-red 1s ease-out infinite}
`;

// ─── STREAMING TEXT COMPONENT ─────────────────────────────────────────────
function StreamingText({ text, isStreaming }) {
  return (
    <span>
      {text}
      {isStreaming && <span className="stream-cursor" />}
    </span>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ vitals, symptoms, riskScore, setPage, lang }) {
  const modules = [
    { id:"vitals",   icon:"♡", color:"#FF4D6D", bg:"rgba(255,77,109,0.08)",  border:"rgba(255,77,109,0.35)",  titleKey:"vitals",      desc:"Real-time facial vitals estimation via your camera." },
    { id:"symptoms", icon:"⟡", color:"#00D4FF", bg:"rgba(0,212,255,0.08)",   border:"rgba(0,212,255,0.35)",   titleKey:"symptoms",    desc:"AI-powered voice symptom analysis and triage." },
    { id:"risk",     icon:"◈", color:"#F59E0B", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.35)",  titleKey:"riskScore",   desc:"Predict your future health risks with AI." },
    { id:"chat",     icon:"◎", color:"#00FFCC", bg:"rgba(0,255,204,0.08)",   border:"rgba(0,255,204,0.35)",   titleKey:"aiAdvisor",   desc:"Chat with your personal AI health advisor." },
    { id:"meds",     icon:"⬡", color:"#B794F4", bg:"rgba(183,148,244,0.08)", border:"rgba(183,148,244,0.35)", titleKey:"medications", desc:"Manage your medication schedule and adherence." },
    { id:"reports",  icon:"▦", color:"#FBD38D", bg:"rgba(251,211,141,0.08)", border:"rgba(251,211,141,0.35)", titleKey:"reports",     desc:"Generate a comprehensive AI health summary." },
  ];

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{tr(lang, "healthPlatform")}</div>
        <div className="ph-title">
          {tr(lang, "welcomeTitle").split("VitaLens AI")[0]}<em>VitaLens AI</em>
        </div>
        <div className="ph-sub">{tr(lang, "welcomeSub")}</div>
      </div>

      <div className="flex gap2 fw" style={{ marginBottom: 28 }}>
        {[
          { label: tr(lang, "heartRate"),      val: vitals?.bpm || "—",      unit: "bpm",  color: "var(--rose)", live: true },
          { label: tr(lang, "spo2"),           val: vitals?.spo2 || "—",     unit: "%",    color: "var(--sage)" },
          { label: tr(lang, "riskScoreLabel"), val: riskScore?.score || "—", unit: "/100", color: "var(--amber)" },
          { label: tr(lang, "stress"),         val: vitals?.stress || "—",   unit: "",     color: "var(--ice)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--ink2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 20px", flex: "1 1 140px", position: "relative", minWidth: 120 }}>
            {s.live && <div className="st-dot dot-live" />}
            <div className="st-eyebrow">{s.label}</div>
            <div className="flex ai-c gap1 mt1">
              <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: s.color, lineHeight: 1 }}>{s.val}</span>
              <span className="t-xs t-muted">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="g3">
        {modules.map(m => (
          <div
            key={m.id}
            className="card"
            style={{ display: "flex", flexDirection: "column", background: m.bg, border: `1.5px solid ${m.border}`, borderRadius: 18, position: "relative", overflow: "hidden", transition: "transform 0.18s, box-shadow 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${m.border}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: m.color, borderRadius: "18px 18px 0 0" }} />
            <div className="flex jb ai-c mb3" style={{ marginTop: 8 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, fontWeight: 400, color: m.color }}>{tr(lang, m.titleKey)}</div>
              <div style={{ fontSize: 28, color: m.color, filter: `drop-shadow(0 0 8px ${m.color}88)` }}>{m.icon}</div>
            </div>
            <div className="t-sm" style={{ color: "var(--dim)", lineHeight: 1.6, flex: 1, marginBottom: 20 }}>{m.desc}</div>
            <button
              className="btn btn-full"
              onClick={() => setPage(m.id)}
              style={{ justifyContent: "space-between", background: m.color, color: "#060e1e", fontWeight: 600, border: "none", fontSize: 15 }}
            >
              <span>{tr(lang, "openBtn")}</span><span style={{ fontSize: 18 }}>→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VITALS SCANNER ──────────────────────────────────────────────────────────
function VitalsScanner({ onSave, lang }) {
  const T = k => tr(lang, k);
  const vidRef = useRef(), cvRef = useRef(), animRef = useRef();
  const [stream, setStream] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [bpm, setBpm] = useState(null);
  const [spo2, setSpo2] = useState(null);
  const [stress, setStress] = useState(null);
  const buf = useRef([]);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } });
      vidRef.current.srcObject = s;
      setStream(s); setScanning(true); buf.current = [];
      let fc = 0;
      const ctx = cvRef.current.getContext("2d");
      const loop = () => {
        ctx.drawImage(vidRef.current, 0, 0, 32, 32);
        const px = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
        buf.current.push({ r: r / n, g: g / n, b: b / n });
        if (buf.current.length > 150) buf.current.shift();
        fc++;
        if (fc % 30 === 0 && buf.current.length > 60) {
          const gs = buf.current.map(f => f.g);
          const mean = gs.reduce((a, v) => a + v) / gs.length;
          const vari = gs.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / gs.length;
          const bp = Math.max(55, Math.min(110, 72 + vari * 0.5 + (Math.random() * 4 - 2)));
          setBpm(Math.round(bp));
          const rs = buf.current.map(f => f.r), bs2 = buf.current.map(f => f.b);
          const ar = rs.reduce((a, v) => a + v) / rs.length, ab = bs2.reduce((a, v) => a + v) / bs2.length;
          const sp = Math.max(94, Math.min(100, 110 - (ar / (ab || 1)) * 8));
          setSpo2(Math.round(sp));
          const sv = vari > 15 ? "High" : vari > 8 ? "Medium" : "Low";
          setStress(sv);
          if (onSave) onSave({ bpm: Math.round(bp), spo2: Math.round(sp), stress: sv });
        }
        animRef.current = requestAnimationFrame(loop);
      };
      vidRef.current.onloadedmetadata = () => { vidRef.current.play(); animRef.current = requestAnimationFrame(loop); };
    } catch { alert("Camera access required."); }
  };

  const stop = () => {
    cancelAnimationFrame(animRef.current);
    stream?.getTracks().forEach(t => t.stop());
    vidRef.current.srcObject = null;
    setStream(null); setScanning(false);
  };

  useEffect(() => () => { cancelAnimationFrame(animRef.current); stream?.getTracks().forEach(t => t.stop()); }, [stream]);
  const scolor = stress === "High" ? "var(--rose)" : stress === "Medium" ? "var(--amber)" : "var(--sage)";

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{T("mod01")}</div>
        <div className="ph-title"><em>{T("vitalsTitle")}</em></div>
        <div className="ph-sub">{T("vitalsSub")}</div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("cameraFeed")}</div>
          <div className="cam-wrap" style={{ minHeight: 210 }}>
            <video ref={vidRef} muted playsInline style={{ width: "100%" }} />
            {scanning && (
              <>
                <div className="cam-scan" />
                <div className="cam-corner tl" /><div className="cam-corner tr" />
                <div className="cam-corner bl" /><div className="cam-corner br" />
              </>
            )}
            {!scanning && (
              <div className="tc t-muted" style={{ padding: "40px 20px" }}>
                <div style={{ fontSize: 40, opacity: .2 }}>♡</div>
                <div className="t-xs mt1">{T("cameraInactive")}</div>
              </div>
            )}
          </div>
          <canvas ref={cvRef} width={32} height={32} style={{ display: "none" }} />
          <div className="flex gap2 mt3">
            {!scanning
              ? <button className="btn btn-white btn-full" onClick={start}>{T("startScan")}</button>
              : <button className="btn btn-danger btn-full" onClick={stop}>{T("stopScan")}</button>
            }
          </div>
          {scanning && <div className="tc t-xs t-muted mt2">{T("analyzingFlow")}</div>}
        </div>

        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("liveReadings")}</div>
          <div className="g3" style={{ gap: 14, marginTop: 8 }}>
            {[
              { val: bpm,    unit: T("bpm"),  label: T("heartRate"), color: "var(--rose)" },
              { val: spo2,   unit: "%",       label: T("spo2"),      color: "var(--sage)" },
              { val: stress, unit: "",        label: T("stress"),    color: scolor, small: true },
            ].map(v => (
              <div key={v.label} className="tc">
                <div className={`vring ${scanning && v.val ? "live" : ""}`} style={{ borderColor: v.val ? v.color : "var(--border)" }}>
                  <div className="vring-val" style={{ color: v.color, fontSize: v.small && v.val ? 15 : 30 }}>{v.val || "—"}</div>
                  {v.unit && <div className="vring-unit">{v.unit}</div>}
                </div>
                <div className="t-xs t-muted mt1">{v.label}</div>
              </div>
            ))}
          </div>
          <div className="div" />
          {bpm && (
            <div className="mt2">
              <div className="flex jb mb2">
                <span className="t-xs t-muted">{T("signalQuality")}</span>
                <span className="t-xs t-sage">{T("signalGood")}</span>
              </div>
              <div className="pbar"><div className="pfill" style={{ width: "72%", background: "var(--sage)" }} /></div>
            </div>
          )}
          <div className="mt3" style={{ padding: "12px", background: "rgba(246,173,85,0.06)", borderRadius: 8, border: "1px solid rgba(246,173,85,0.12)" }}>
            <div className="t-xs" style={{ color: "var(--amber)", lineHeight: 1.6 }}>{T("demoNote")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VOICE SYMPTOMS ───────────────────────────────────────────────────────────
function VoiceSymptoms({ onSave, lang }) {
  const T = k => tr(lang, k);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const recRef = useRef();

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for Speech Recognition."); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true;
    r.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setTranscript(t); };
    r.onend = () => setListening(false);
    r.start(); recRef.current = r; setListening(true);
  };

  const stopListen = () => { recRef.current?.stop(); setListening(false); };

  const analyze = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");
    const prompt = `Medical triage for: "${transcript}". Return ONLY JSON (no markdown): {"triage":"Low|Medium|Urgent","summary":"...","recommendations":["..."],"urgency_reason":"..."}`;
    const res = await callAI(prompt, (partial) => {
      setStreamingText(partial);
    });
    setIsStreaming(false);
    setStreamingText("");
    try {
      const cleaned = res?.replace(/```json|```/g, "").trim();
      const p = JSON.parse(cleaned);
      setAnalysis(p);
      if (onSave) onSave({ transcript, ...p });
    } catch {
      setAnalysis({ triage: "Medium", summary: res || "Analysis complete.", recommendations: ["See a healthcare provider"], urgency_reason: "Manual review recommended" });
    }
    setLoading(false);
  };

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{T("mod02")}</div>
        <div className="ph-title"><em>{T("symptomsTitle")}</em></div>
        <div className="ph-sub">{T("symptomsSub")}</div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("voiceInput")}</div>
          <div style={{ minHeight: 130, background: "var(--ink3)", borderRadius: 10, padding: "16px 18px", border: "1px solid var(--border)", marginBottom: 16, position: "relative" }}>
            {transcript
              ? <p className="t-sm" style={{ lineHeight: 1.7 }}>{transcript}</p>
              : <p className="t-xs t-muted" style={{ paddingTop: 42, textAlign: "center" }}>{listening ? T("listeningNow") : T("pressRecord")}</p>
            }
            {listening && (
              <div style={{ position: "absolute", bottom: 14, right: 16 }}>
                <div className="voice-bars">{[1, 2, 3, 4, 5].map(i => <div key={i} className="vb" style={{ animationDelay: `${i * 0.1}s` }} />)}</div>
              </div>
            )}
          </div>
          <div className="flex gap2 mb3">
            {!listening
              ? <button className="btn btn-white" onClick={startListen}>⏺ {T("recordBtn")}</button>
              : <button className="btn btn-danger" onClick={stopListen}>⏹ {T("stopBtn")}</button>
            }
            <button className="btn btn-ghost" onClick={() => setTranscript("")}>{T("clearBtn")}</button>
            <button className="btn btn-ghost" onClick={analyze} disabled={!transcript || loading} style={{ marginLeft: "auto" }}>
              {loading ? T("analyzingMsg") : T("analyzeBtn")}
            </button>
          </div>
          <div className="fl mb2 t-muted">{T("typeManually")}</div>
          <textarea className="ta" rows={3} placeholder={T("typeSymptoms")} value={transcript} onChange={e => setTranscript(e.target.value)} />
        </div>

        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("aiTriage")}</div>
          {(loading || isStreaming) && (
            <div>
              <div className="stream-indicator">
                <div className="s-dot" />
                {T("streaming")}
              </div>
              {streamingText ? (
                <div style={{ background: "var(--ink3)", borderRadius: 10, padding: "14px 18px", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.8, color: "var(--dim)", minHeight: 80 }}>
                  <StreamingText text={streamingText} isStreaming={isStreaming} />
                </div>
              ) : (
                <div className="tc" style={{ padding: "30px 0" }}>
                  <div className="typing"><div className="tdot" /><div className="tdot" /><div className="tdot" /></div>
                  <div className="t-xs t-muted mt1">Running analysis…</div>
                </div>
              )}
            </div>
          )}
          {analysis && !loading && !isStreaming && (
            <div>
              <div className="flex ai-c gap2 mb3">
                <span className={`badge badge-${analysis.triage?.toLowerCase()}`}>{analysis.triage}</span>
                <span className="t-xs t-muted">{T("triageLevel")}</span>
              </div>
              <div className="mb3">
                <div className="t-xs t-muted fw600 mb1" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{T("summary")}</div>
                <p className="t-sm" style={{ color: "var(--dim)", lineHeight: 1.7 }}>{analysis.summary}</p>
              </div>
              <div className="mb3">
                <div className="t-xs t-muted fw600 mb1" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{T("recommendations")}</div>
                {analysis.recommendations?.map((r, i) => (
                  <div key={i} className="flex gap1 t-sm mt1" style={{ color: "var(--dim)" }}>
                    <span className="t-sage">›</span>{r}
                  </div>
                ))}
              </div>
              {analysis.urgency_reason && (
                <div style={{ padding: "10px 14px", background: "rgba(245,101,101,0.07)", borderRadius: 8, border: "1px solid rgba(245,101,101,0.15)" }}>
                  <span className="t-xs t-rose">{analysis.urgency_reason}</span>
                </div>
              )}
            </div>
          )}
          {!analysis && !loading && !isStreaming && (
            <div className="tc" style={{ padding: "60px 0" }}>
              <div style={{ fontSize: 40, opacity: .15 }}>⟡</div>
              <div className="t-xs t-muted mt2">{T("recordFirst")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RISK ENGINE ─────────────────────────────────────────────────────────────
function RiskEngine({ onSave, lang }) {
  const T = k => tr(lang, k);
  const [form, setForm] = useState({ age: "", gender: "male", bmi: "", sleep: "", exercise: "", smoking: "no", diabetesHistory: false, heartHistory: false, cancerHistory: false, symptoms: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [anim, setAnim] = useState(0);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const run = async () => {
    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");
    const prompt = `Health profile: ${JSON.stringify(form)}. Return ONLY JSON (no markdown): {"riskScore":42,"topRisks":["..."],"preventionTips":["..."],"forecast":"..."}`;
    const res = await callAI(prompt, (partial) => {
      setStreamingText(partial);
    });
    setIsStreaming(false);
    setStreamingText("");
    try {
      const p = JSON.parse(res?.replace(/```json|```/g, "").trim());
      setResult(p);
      if (onSave) onSave(p);
      let cur = 0; const tgt = p.riskScore;
      const go = () => { cur = Math.min(cur + 1.5, tgt); setAnim(Math.round(cur)); if (cur < tgt) requestAnimationFrame(go); };
      requestAnimationFrame(go);
    } catch {
      setResult({ riskScore: 38, topRisks: ["Sedentary lifestyle", "Poor sleep"], preventionTips: ["30 min daily exercise", "Consistent sleep schedule"], forecast: "Moderate risk. Lifestyle changes recommended." });
      setAnim(38);
    }
    setLoading(false);
  };

  const sc = anim < 33 ? "var(--sage)" : anim < 66 ? "var(--amber)" : "var(--rose)";

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{T("mod03")}</div>
        <div className="ph-title"><em>{T("riskTitle")}</em></div>
        <div className="ph-sub">{T("riskSub")}</div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("healthProfile")}</div>
          <div className="g2" style={{ gap: 10 }}>
            {[[T("age"), "age", "number", "30"], [T("bmi"), "bmi", "number", "22.5"], [T("sleepHrs"), "sleep", "number", "7"], [T("exerciseDays"), "exercise", "number", "3"]].map(([l, k, tp, ph]) => (
              <div className="fg" key={k} style={{ marginBottom: 0 }}>
                <label className="fl">{l}</label>
                <input className="inp" type={tp} placeholder={ph} value={form[k]} onChange={e => upd(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="g2 mt2" style={{ gap: 10 }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{T("gender")}</label>
              <select className="sel" value={form.gender} onChange={e => upd("gender", e.target.value)}>
                <option value="male">{T("male")}</option>
                <option value="female">{T("female")}</option>
                <option value="other">{T("other")}</option>
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{T("smoking")}</label>
              <select className="sel" value={form.smoking} onChange={e => upd("smoking", e.target.value)}>
                <option value="no">{T("no")}</option>
                <option value="yes">{T("yes")}</option>
                <option value="former">{T("former")}</option>
              </select>
            </div>
          </div>
          <div className="fg mt2">
            <label className="fl">{T("familyHistory")}</label>
            <div className="flex gap3 fw">
              {[["diabetesHistory", T("diabetes")], ["heartHistory", T("heart")], ["cancerHistory", T("cancer")]].map(([k, l]) => (
                <label key={k} className="flex ai-c gap1" style={{ cursor: "pointer", fontSize: 13, color: "var(--dim)" }}>
                  <input type="checkbox" checked={form[k]} onChange={e => upd(k, e.target.checked)} style={{ accentColor: "var(--text)", width: 13, height: 13 }} />{l}
                </label>
              ))}
            </div>
          </div>
          <div className="fg">
            <label className="fl">{T("recentSymptomsLabel")}</label>
            <textarea className="ta" rows={2} placeholder={T("symptomsPlaceholder")} value={form.symptoms} onChange={e => upd("symptoms", e.target.value)} />
          </div>
          <button className="btn btn-white btn-full" onClick={run} disabled={loading}>
            {loading ? T("calculatingMsg") : T("calculateBtn")}
          </button>
        </div>

        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("riskAssessment")}</div>
          {(loading || isStreaming) && streamingText && (
            <div className="mb3">
              <div className="stream-indicator">
                <div className="s-dot" />
                {T("streaming")}
              </div>
              <div style={{ background: "var(--ink3)", borderRadius: 10, padding: "14px 18px", border: "1px solid var(--border)", fontSize: 12, lineHeight: 1.8, color: "var(--dim)", fontFamily: "monospace", maxHeight: 120, overflow: "hidden" }}>
                <StreamingText text={streamingText.slice(-200)} isStreaming={isStreaming} />
              </div>
            </div>
          )}
          {(loading || isStreaming) && !streamingText && (
            <div className="tc" style={{ padding: "50px 0" }}>
              <div className="typing"><div className="tdot" /><div className="tdot" /><div className="tdot" /></div>
              <div className="t-xs t-muted mt1">{T("calculatingMsg")}</div>
            </div>
          )}
          {result && !loading && !isStreaming && (
            <>
              <div className="gauge-wrap mb3">
                <svg width="140" height="80" viewBox="0 0 140 80">
                  <path d="M14 70 A56 56 0 0 1 126 70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
                  <path d="M14 70 A56 56 0 0 1 126 70" fill="none" stroke={sc} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="175" strokeDashoffset={175 - (anim / 100) * 175}
                    style={{ transition: "stroke-dashoffset 0.04s,stroke 0.5s" }} />
                  <text x="70" y="62" textAnchor="middle" fill={sc} fontSize="26" fontFamily="'Instrument Serif',serif">{anim}</text>
                </svg>
                <div className="t-xs t-muted" style={{ marginTop: -4 }}>{T("outOf")}</div>
              </div>
              <div className="mb3">
                <div className="t-xs t-muted fw600 mb2" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{T("topRisks")}</div>
                {result.topRisks?.map((r, i) => (
                  <div key={i} className="flex gap1 t-sm mt1" style={{ color: "var(--dim)" }}>
                    <span className="t-rose">↑</span>{r}
                  </div>
                ))}
              </div>
              <div className="mb3">
                <div className="t-xs t-muted fw600 mb2" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{T("prevention")}</div>
                {result.preventionTips?.map((tip, i) => (
                  <div key={i} className="flex gap1 t-sm mt1" style={{ color: "var(--dim)" }}>
                    <span className="t-sage">✓</span>{tip}
                  </div>
                ))}
              </div>
              <div style={{ padding: "12px 14px", background: "var(--ink3)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div className="t-xs t-muted mb1">{T("forecast30")}</div>
                <div className="t-sm t-dim" style={{ lineHeight: 1.6 }}>{result.forecast}</div>
              </div>
            </>
          )}
          {!result && !loading && !isStreaming && (
            <div className="tc" style={{ padding: "70px 0" }}>
              <div style={{ fontSize: 48, opacity: .1 }}>◈</div>
              <div className="t-xs t-muted mt2">{T("fillForm")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI CHATBOT (with streaming) ──────────────────────────────────────────────
function AIChatbot({ lang }) {
  const T = k => tr(lang, k);
  const WAKE_WORDS = ["hey vitals", "hey vital", "hey sri", "ok vitals", "vitals"];

  const [msgs, setMsgs] = useState([{
    role: "ai",
    text: tr(lang, "chatGreeting"),
    time: new Date().toLocaleTimeString(),
    done: true,
  }]);
  const [streamingMsg, setStreamingMsg] = useState(null); // { text, isStreaming }
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [liveText, setLiveText] = useState("");

  const scrollRef = useRef();
  const wakeRef = useRef(null);
  const listenRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const CHIPS = [T("heartRate") + "?", "Reduce stress tips", "Better sleep", "What is SpO₂?", "Signs of high BP"];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [msgs, streamingMsg, liveText]);

  const speak = (text) => {
    synthRef.current?.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.05; utt.pitch = 1; utt.volume = 1;
    const voices = synthRef.current?.getVoices() || [];
    const v = voices.find(v => v.name.includes("Google") && v.lang === "en-US") || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (v) utt.voice = v;
    synthRef.current?.speak(utt);
  };

  const send = async (txt = inp) => {
    if (!txt.trim() || busy) return;
    const um = { role: "user", text: txt, time: new Date().toLocaleTimeString(), done: true };
    const hist = [...msgs, um];
    setMsgs(hist); setInp(""); setBusy(true); setVoiceState("thinking");

    // Start streaming placeholder
    setStreamingMsg({ text: "", isStreaming: true, time: new Date().toLocaleTimeString() });

    const conv = hist.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n");
    const prompt = `You are a compassionate evidence-based health advisor. Be helpful and accurate. Keep voice responses concise (2-3 sentences). Recommend professional consultation for serious issues. Never diagnose definitively.\n\n${conv}\n\nAssistant:`;

    const reply = await callAI(prompt, (partial) => {
      setStreamingMsg({ text: partial, isStreaming: true, time: new Date().toLocaleTimeString() });
    });

    const finalReply = reply || "I'm having trouble connecting to the AI service right now. Please check your internet connection or try again in a moment.";

    // Move streamed message into msgs array as a completed message
    setStreamingMsg(null);
    setMsgs(p => [...p, { role: "ai", text: finalReply, time: new Date().toLocaleTimeString(), done: true }]);
    speak(finalReply);
    setBusy(false); setVoiceState("idle");
    startWakeListen();
  };

  const startActiveListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    listenRef.current?.abort();
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-US";
    let finalText = "";
    setVoiceState("listening"); setLiveText("");
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setLiveText(t); finalText = t;
    };
    r.onend = () => {
      setLiveText("");
      if (finalText.trim()) send(finalText.trim());
      else { setVoiceState("idle"); startWakeListen(); }
    };
    r.onerror = () => { setVoiceState("idle"); startWakeListen(); };
    r.start(); listenRef.current = r;
  };

  const startWakeListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    wakeRef.current?.abort();
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    setVoiceState("wake-listening");
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase();
        if (WAKE_WORDS.some(w => t.includes(w))) {
          r.abort();
          const greeting = "Yes? How can I help you?";
          setMsgs(p => [...p, { role: "ai", text: greeting, time: new Date().toLocaleTimeString(), done: true }]);
          speak(greeting);
          setTimeout(startActiveListening, 1000);
          return;
        }
      }
    };
    r.onend = () => { setTimeout(startWakeListen, 400); };
    r.onerror = () => setTimeout(startWakeListen, 1000);
    try { r.start(); wakeRef.current = r; } catch { }
  };

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) startWakeListen();
    return () => { wakeRef.current?.abort(); listenRef.current?.abort(); synthRef.current?.cancel(); };
  }, []);

  const micColor = voiceState === "listening" ? "#ff4d6d" : voiceState === "thinking" ? "#ffb347" : voiceState === "wake-listening" ? "#00ffcc" : "var(--muted)";
  const micLabel = voiceState === "listening" ? T("listeningDots") : voiceState === "thinking" ? T("thinkingDots") : voiceState === "wake-listening" ? T("sayHeyVitals") : T("voiceOff");
  const micPulse = voiceState === "listening" || voiceState === "wake-listening";

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{T("mod04")}</div>
        <div className="ph-title"><em>{T("chatTitle")}</em></div>
        <div className="ph-sub">{T("chatSub")}</div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="card-stripe" />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid var(--border)", background: voiceState === "listening" ? "rgba(255,77,109,0.05)" : voiceState === "wake-listening" ? "rgba(0,255,204,0.04)" : "transparent", transition: "background 0.3s" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: micColor, flexShrink: 0, animation: micPulse ? "blink 1.5s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: 11.5, color: micColor, fontFamily: "'Geist',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>{micLabel}</span>
          <button
            onClick={() => voiceState === "listening" ? (listenRef.current?.abort(), setVoiceState("idle"), startWakeListen()) : startActiveListening()}
            style={{ marginLeft: "auto", width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${micColor}`, background: voiceState === "listening" ? "rgba(255,77,109,0.15)" : "rgba(255,255,255,0.04)", color: micColor, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
          >
            {voiceState === "listening" ? "⏹" : "🎙"}
          </button>
        </div>
        <div className="chat-scroll" ref={scrollRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`cmsg cmsg-${m.role}`}>
              <div className="cmsg-bubble">{m.text}</div>
              <div className="cmsg-time">{m.time}</div>
            </div>
          ))}
          {/* Live streaming message */}
          {streamingMsg && (
            <div className="cmsg cmsg-ai">
              <div className="cmsg-bubble">
                {streamingMsg.text
                  ? <StreamingText text={streamingMsg.text} isStreaming={streamingMsg.isStreaming} />
                  : <div className="typing"><div className="tdot" /><div className="tdot" /><div className="tdot" /></div>
                }
              </div>
              {streamingMsg.text && (
                <div className="cmsg-time" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="stream-indicator" style={{ marginBottom: 0 }}>
                    <div className="s-dot" />{T("streaming")}
                  </div>
                </div>
              )}
            </div>
          )}
          {liveText && (
            <div className="cmsg cmsg-user">
              <div className="cmsg-bubble" style={{ opacity: 0.55, fontStyle: "italic", borderColor: "rgba(255,77,109,0.3)" }}>🎙 {liveText}…</div>
            </div>
          )}
          {voiceState === "listening" && !liveText && (
            <div className="cmsg cmsg-ai">
              <div className="cmsg-bubble" style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 16px" }}>
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="va-bar" style={{ animationDelay: `${i * 0.1}s`, background: "#ff4d6d" }} />)}
              </div>
            </div>
          )}
        </div>
        <div className="qchips">
          {CHIPS.map(c => <button key={c} className="qchip" onClick={() => send(c)}>{c}</button>)}
        </div>
        <div className="chat-bar">
          <input className="inp" placeholder={T("chatPlaceholder")} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
          <button className="btn btn-white" onClick={() => send()} disabled={busy || !inp}>{T("sendBtn")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADHERENCE TRACKER ───────────────────────────────────────────────────────
function AdherenceTracker({ adh90, onUpdate, lang }) {
  const [statuses, setStatuses] = useState([...adh90]);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef();

  const CYCLE = ["taken", "missed", "partial", "upcoming"];
  const colorMap = { taken: "#00ffcc", partial: "#ffb347", missed: "#ff4d6d", upcoming: "rgba(122,154,181,0.15)" };

  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (89 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  });

  const handleClick = (idx) => {
    setStatuses(prev => {
      const next = [...prev];
      const ci = CYCLE.indexOf(next[idx]);
      next[idx] = CYCLE[(ci + 1) % CYCLE.length];
      if (onUpdate) onUpdate(next);
      return next;
    });
  };

  const handleMouseEnter = (e, idx) => {
    const container = containerRef.current; if (!container) return;
    const cRect = container.getBoundingClientRect();
    const dRect = e.currentTarget.getBoundingClientRect();
    setTooltip({ idx, date: days[idx], status: statuses[idx], x: dRect.left - cRect.left + dRect.width / 2, y: dRect.top - cRect.top });
  };

  const rows = Array.from({ length: 6 }, (_, r) => Array.from({ length: 15 }, (_, c) => r * 15 + c));

  return (
    <div style={{ padding: "8px 0 4px" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, marginBottom: 16, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)" }}>
        <span style={{ fontSize: 12, color: "#00d4ff", fontFamily: "'Geist',sans-serif" }}>{tr(lang, "clickDot")}</span>
      </div>
      <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
        {tooltip && (
          <div style={{ position: "absolute", left: Math.max(0, Math.min(tooltip.x - 90, 360)), top: tooltip.y - 50, background: "#ffffff", color: "#111111", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", pointerEvents: "none", zIndex: 50, border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorMap[tooltip.status], flexShrink: 0 }} />
            {tooltip.date} — {tooltip.status.charAt(0).toUpperCase() + tooltip.status.slice(1)}
          </div>
        )}
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 7, marginBottom: 7 }}>
            {row.map(idx => {
              const status = statuses[idx];
              const bg = colorMap[status] || colorMap.upcoming;
              const isHov = tooltip?.idx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => handleClick(idx)}
                  onMouseEnter={e => handleMouseEnter(e, idx)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ width: 30, height: 30, borderRadius: "50%", background: bg, cursor: "pointer", transition: "transform 0.12s ease,box-shadow 0.12s ease", transform: isHov ? "scale(1.25)" : "scale(1)", boxShadow: isHov ? `0 0 0 3px rgba(0,212,255,0.55),0 0 14px ${bg}99` : status !== "upcoming" ? `0 0 7px ${bg}55` : "none", flexShrink: 0 }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22, justifyContent: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'Geist',sans-serif" }}>{tr(lang, "less")}</span>
        {[{ c: "#ff4d6d", l: tr(lang, "missed") }, { c: "#ffb347", l: tr(lang, "partial") }, { c: "#00ffcc", l: tr(lang, "taken") }].map(({ c, l }) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}99` }} />
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'Geist',sans-serif" }}>{l}</span>
          </div>
        ))}
        <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "'Geist',sans-serif" }}>{tr(lang, "more")}</span>
      </div>
    </div>
  );
}

// ─── MEDICATIONS ─────────────────────────────────────────────────────────────
function Medications({ lang }) {
  const T = k => tr(lang, k);

  const make90 = (rate) => Array.from({ length: 90 }, (_, i) => {
    if (i > 85) return "upcoming";
    const r = Math.random();
    return r < rate ? "taken" : r < rate + 0.15 ? "partial" : "missed";
  });

  const [meds, setMeds] = useState([
    { id: 1, name: "Metformin",  dosage: "500mg",  times: ["08:00", "20:00"], adh90: make90(0.72) },
    { id: 2, name: "Vitamin D3", dosage: "1000IU", times: ["09:00"],          adh90: make90(0.88) },
  ]);
  const [fm, setFm] = useState({ name: "", dosage: "", time: "08:00" });
  const [open, setOpen] = useState(false);
  const [activeMed, setActiveMed] = useState(1);

  const add = () => {
    if (!fm.name) return;
    const newMed = { id: Date.now(), name: fm.name, dosage: fm.dosage, times: [fm.time], adh90: make90(0.5) };
    setMeds(p => [...p, newMed]);
    setActiveMed(newMed.id);
    setFm({ name: "", dosage: "", time: "08:00" });
    setOpen(false);
  };

  const handleDotUpdate = (newStatuses) => {
    setMeds(prev => prev.map(m => m.id === activeMed ? { ...m, adh90: newStatuses } : m));
  };

  const current = meds.find(m => m.id === activeMed) || meds[0];
  const takenCount = current.adh90.filter(d => d === "taken").length;
  const partialCount = current.adh90.filter(d => d === "partial").length;
  const missedCount = current.adh90.filter(d => d === "missed").length;
  const upcomingCount = current.adh90.filter(d => d === "upcoming").length;
  const activeCount = current.adh90.filter(d => d !== "upcoming").length;
  const score = activeCount > 0 ? Math.round((takenCount / activeCount) * 100) : 0;
  const scoreColor = score > 75 ? "#00ffcc" : score > 50 ? "#ffb347" : "#ff4d6d";

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{T("mod05")}</div>
        <div className="ph-title"><em>{T("medsTitle")}</em></div>
        <div className="ph-sub">{T("medsSub")}</div>
      </div>

      <div className="flex ai-c gap2 mb3" style={{ flexWrap: "wrap" }}>
        {meds.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveMed(m.id)}
            style={{ padding: "8px 18px", borderRadius: 24, border: "1px solid", borderColor: activeMed === m.id ? "#00d4ff" : "var(--border)", background: activeMed === m.id ? "rgba(0,212,255,0.1)" : "transparent", color: activeMed === m.id ? "#00d4ff" : "var(--muted)", cursor: "pointer", fontSize: 13, fontFamily: "'Geist',sans-serif", fontWeight: 500, transition: "all 0.15s" }}
          >
            {m.name} <span style={{ opacity: 0.6, fontSize: 11 }}>{m.dosage}</span>
          </button>
        ))}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(o => !o)}>{T("addMed")}</button>
      </div>

      {open && (
        <div className="card mb3">
          <div className="card-stripe" />
          <div className="card-label">{T("newMed")}</div>
          <div className="g3" style={{ gap: 10 }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{T("name")}</label>
              <input className="inp" placeholder={T("namePlaceholder")} value={fm.name} onChange={e => setFm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{T("dosage")}</label>
              <input className="inp" placeholder={T("dosagePlaceholder")} value={fm.dosage} onChange={e => setFm(f => ({ ...f, dosage: e.target.value }))} />
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{T("time")}</label>
              <input className="inp" type="time" value={fm.time} onChange={e => setFm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-white mt2" onClick={add}>{T("saveMed")}</button>
        </div>
      )}

      <div className="card">
        <div className="card-stripe" />
        <div className="flex jb ai-c mb3">
          <div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, fontWeight: 400 }}>{T("adherenceTracker")}</div>
            <div className="t-sm t-muted mt1">{T("adherenceSub")}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 48, lineHeight: 1, color: scoreColor, transition: "color 0.3s" }}>{score}%</div>
            <div className="t-xs t-muted mt1">{current.name} · {current.dosage}</div>
          </div>
        </div>
        <div className="flex gap2 fw" style={{ marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: T("taken"),    val: takenCount,    color: "#00ffcc" },
            { label: T("partial"),  val: partialCount,  color: "#ffb347" },
            { label: T("missed"),   val: missedCount,   color: "#ff4d6d" },
            { label: T("upcoming"), val: upcomingCount, color: "var(--muted)" },
          ].map(s => (
            <div key={s.label} style={{ flex: "1 1 80px", padding: "12px 16px", background: "var(--ink3)", borderRadius: 10, border: "1px solid var(--border)", transition: "all 0.2s" }}>
              <div style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div className="t-xs t-muted mt1">{s.label}</div>
            </div>
          ))}
        </div>
        <AdherenceTracker key={activeMed} adh90={current.adh90} onUpdate={handleDotUpdate} lang={lang} />
      </div>
    </div>
  );
}

// ─── REPORTS (with streaming) ─────────────────────────────────────────────────
function Reports({ vitals, symptoms, riskScore, lang }) {
  const T = k => tr(lang, k);
  const [report, setReport] = useState(null);
  const [streamingReport, setStreamingReport] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);

  const gen = async () => {
    setLoading(true);
    setIsStreaming(true);
    setStreamingReport("");
    setReport(null);
    const prompt = `Write a professional health summary report. Data: ${JSON.stringify({ vitals, symptoms: symptoms?.slice(-5), riskScore })}. Include: executive summary, key findings, AI recommendations, red flags, next steps. Use clear section headers. Be concise and professional.`;
    const r = await callAI(prompt, (partial) => {
      setStreamingReport(partial);
    });
    setIsStreaming(false);
    setReport(r || "Health report generated. Please consult your healthcare provider.");
    setStreamingReport("");
    setLoading(false);
  };

  const dl = () => {
    const content = report || streamingReport;
    const blob = new Blob([`VITALENS AI — HEALTH REPORT\n${"─".repeat(40)}\n${new Date().toLocaleString()}\n\n${content}`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "VitaLens_Report.txt";
    a.click();
  };

  const displayText = report || streamingReport;

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{T("mod06")}</div>
        <div className="ph-title"><em>{T("reportsTitle")}</em></div>
        <div className="ph-sub">{T("reportsSub")}</div>
      </div>
      <div className="card">
        <div className="card-stripe" />
        <div className="flex jb ai-c mb3">
          <div className="flex ai-c gap2">
            <div className="card-label" style={{ marginBottom: 0 }}>{T("reportGenerator")}</div>
            {isStreaming && (
              <div className="stream-indicator" style={{ marginBottom: 0 }}>
                <div className="s-dot" />{T("streaming")}
              </div>
            )}
          </div>
          <div className="flex gap2">
            <button className="btn btn-white" onClick={gen} disabled={loading}>{loading ? T("generatingMsg") : T("generateBtn")}</button>
            {displayText && <button className="btn btn-ghost" onClick={dl}>{T("downloadBtn")}</button>}
          </div>
        </div>
        {displayText
          ? <div style={{ background: "var(--ink3)", borderRadius: 10, padding: "20px 24px", border: "1px solid var(--border)", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: "var(--dim)", maxHeight: 480, overflowY: "auto" }}>
              <StreamingText text={displayText} isStreaming={isStreaming} />
            </div>
          : loading
            ? <div className="tc" style={{ padding: "80px 0" }}>
                <div className="typing"><div className="tdot" /><div className="tdot" /><div className="tdot" /></div>
                <div className="t-xs t-muted mt2">{T("generatingMsg")}</div>
              </div>
            : <div className="tc" style={{ padding: "80px 0" }}>
                <div style={{ fontSize: 48, opacity: .1 }}>▦</div>
                <div className="t-xs t-muted mt2">{T("reportEmpty")}</div>
              </div>
        }
        {report && !isStreaming && (
          <div className="mt3" style={{ padding: "10px 14px", background: "rgba(245,101,101,0.06)", borderRadius: 8, border: "1px solid rgba(245,101,101,0.12)" }}>
            <span className="t-xs t-rose">{T("disclaimer")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ lang, setLang, theme, setTheme }) {
  const T = k => tr(lang, k);
  const [p, setP] = useState({ name: "Demo User", age: "30", gender: "male" });

  return (
    <div className="fade">
      <div className="ph">
        <div className="ph-eyebrow">{T("configuration")}</div>
        <div className="ph-title"><em>{T("settingsTitle")}</em></div>
      </div>

      <div className="card mb3" style={{ marginBottom: 20 }}>
        <div className="card-stripe" />
        <div className="card-label">{T("appearance")}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--dim)", fontFamily: "'Geist',sans-serif" }}>
            {theme === "dark" ? "🌊 Deep Navy (Dark)" : `☀️ ${T("lightMode")}`}
          </div>
          <div style={{ display: "flex", background: "var(--ink3)", borderRadius: 20, padding: 2, border: "1px solid var(--border)" }}>
            {[{ id: "dark", icon: "🌊", label: "Navy" }, { id: "light", icon: "☀️", label: "Light" }].map(item => {
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id)}
                  style={{ padding: "4px 14px", borderRadius: 16, border: "none", background: active ? "rgba(0,212,255,0.18)" : "transparent", color: active ? "var(--cyan)" : "var(--muted)", cursor: "pointer", fontSize: 13, transition: "all 0.18s", display: "flex", alignItems: "center", gap: 5, boxShadow: active ? "0 0 8px rgba(0,212,255,0.2)" : "none" }}
                >
                  {item.icon} <span style={{ fontSize: 11, fontFamily: "'Geist',sans-serif", fontWeight: 500 }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("profile")}</div>
          {[[T("nameLabel"), "name", "text"], [T("ageLabel"), "age", "number"]].map(([l, k, tp]) => (
            <div className="fg" key={k}>
              <label className="fl">{l}</label>
              <input className="inp" type={tp} value={p[k]} onChange={e => setP(pp => ({ ...pp, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="fg">
            <label className="fl">{T("genderLabel")}</label>
            <select className="sel" value={p.gender} onChange={e => setP(pp => ({ ...pp, gender: e.target.value }))}>
              <option value="male">{tr(lang, "male")}</option>
              <option value="female">{tr(lang, "female")}</option>
              <option value="other">{tr(lang, "other")}</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">{T("claudeKey")}</label>
            <input className="inp" type="text" placeholder="Handled automatically" disabled style={{ opacity: 0.5 }} />
            <span className="t-xs t-muted mt1">{T("claudeHint")}</span>
          </div>
          <button className="btn btn-white">{T("saveProfile")}</button>
        </div>

        <div className="card">
          <div className="card-stripe" />
          <div className="card-label">{T("language")}</div>
          <div className="flex fc gap1">
            {LANGS.map(l => (
              <button
                key={l.code}
                className="btn btn-ghost"
                onClick={() => setLang(l.code)}
                style={{ justifyContent: "flex-start", gap: 14, borderColor: lang === l.code ? "var(--cyan)" : "var(--border)", color: lang === l.code ? "var(--cyan)" : "var(--dim)", background: lang === l.code ? "rgba(0,212,255,0.08)" : "transparent" }}
              >
                <span>{l.flag}</span>{l.label}
                {lang === l.code && <span style={{ marginLeft: "auto", color: "var(--sage)" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VOICE ASSISTANT FAB ─────────────────────────────────────────────────────
function VoiceAssistant({ setPage, lang }) {
  const WAKE_WORDS = ["hey vitals", "hey vital", "vitals", "ok vitals"];
  const NAV_CMDS = {
    dashboard: ["dashboard", "home", "overview"],
    vitals:    ["vitals", "scanner", "heart rate", "scan"],
    symptoms:  ["symptoms", "triage", "symptom"],
    risk:      ["risk", "risk score", "assessment"],
    chat:      ["chat", "advisor", "chatbot", "advice"],
    meds:      ["medication", "meds", "medicines", "pills", "adherence"],
    reports:   ["report", "reports", "summary"],
    settings:  ["settings", "language", "profile"],
  };

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: "ai", text: 'Hi! I\'m your VitaLens voice assistant. Say "Hey Vitals" or click the mic to talk to me.' }]);
  const [status, setStatus] = useState("idle");
  const [textInp, setTextInp] = useState("");
  const [transcript, setTranscript] = useState("");
  const [streamingText, setStreamingText] = useState("");

  const wakeRef = useRef(null), listenRef = useRef(null), scrollRef = useRef(null), synthRef = useRef(window.speechSynthesis);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [msgs, transcript, streamingText]);

  const speak = (text) => {
    synthRef.current?.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.05; utt.pitch = 1; utt.volume = 1;
    const voices = synthRef.current?.getVoices() || [];
    const preferred = voices.find(v => v.name.includes("Google") && v.lang === "en-US") || voices.find(v => v.lang === "en-US") || voices[0];
    if (preferred) utt.voice = preferred;
    synthRef.current?.speak(utt);
  };

  const handleCommand = async (text) => {
    const lower = text.toLowerCase().trim();
    setMsgs(p => [...p, { role: "user", text }]);
    setStatus("thinking");
    setStreamingText("");

    for (const [pageId, keywords] of Object.entries(NAV_CMDS)) {
      if (keywords.some(k => lower.includes(k))) {
        const reply = `Opening ${pageId} for you!`;
        setMsgs(p => [...p, { role: "ai", text: reply }]);
        speak(reply); setStatus("idle");
        setTimeout(() => { setPage(pageId); setOpen(false); }, 800);
        return;
      }
    }

    const prompt = `You are a concise voice health assistant called VitaLens. Answer in 1-2 short sentences max. Question: "${text}"`;
    const reply = await callAI(prompt, (partial) => {
      setStreamingText(partial);
    });
    const finalReply = reply || "I'm having trouble connecting right now. Please try again in a moment.";
    setStreamingText("");
    setMsgs(p => [...p, { role: "ai", text: finalReply }]);
    speak(finalReply); setStatus("idle");
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    listenRef.current?.abort();
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = "en-US";
    setStatus("listening"); setTranscript("");
    r.onresult = (e) => {
      let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
      if (listenRef.current) listenRef.current._last = t;
    };
    r.onend = () => {
      const final = listenRef.current?._last || "";
      setTranscript("");
      if (final.trim()) handleCommand(final.trim());
      else setStatus("idle");
      startWakeWord();
    };
    r.onerror = () => { setStatus("idle"); startWakeWord(); };
    r.start(); listenRef.current = r; listenRef.current._last = "";
  };

  const startWakeWord = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    wakeRef.current?.abort();
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase();
        if (WAKE_WORDS.some(w => t.includes(w))) {
          r.abort(); setOpen(true); setStatus("wake");
          speak("Yes? How can I help you?");
          setMsgs(p => [...p, { role: "ai", text: "Yes? How can I help you?" }]);
          setTimeout(startListening, 1200);
          return;
        }
      }
    };
    r.onend = () => setTimeout(startWakeWord, 300);
    r.onerror = () => setTimeout(startWakeWord, 1000);
    try { r.start(); wakeRef.current = r; } catch { }
  };

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) startWakeWord();
    return () => { wakeRef.current?.abort(); listenRef.current?.abort(); synthRef.current?.cancel(); };
  }, []);

  const sendText = () => { if (!textInp.trim()) return; handleCommand(textInp.trim()); setTextInp(""); };
  const HINTS = ["What's my heart rate?", "Open vitals", "Open medications", "Health tips", "Open chat"];
  const statusLabel = { idle: 'Listening for "Hey Vitals"', wake: "Woke up!", listening: "Listening…", thinking: "Thinking…" }[status];
  const dotClass = status === "listening" ? "red" : status === "thinking" ? "amber" : "";

  return (
    <>
      <div
        className={`va-fab ${open ? "va-open" : ""} ${status === "listening" ? "va-listening" : ""}`}
        onClick={() => setOpen(o => !o)}
        title="VitaLens Voice Assistant"
      >
        <span style={{ fontSize: 24 }}>{status === "listening" ? "🎙" : status === "thinking" ? "⌛" : "◎"}</span>
      </div>
      {open && (
        <div className="va-panel">
          <div className="va-head">
            <div className="va-title"><div className={`va-dot ${dotClass}`} />VitaLens Assistant</div>
            <button className="va-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div style={{ padding: "6px 18px", fontSize: 11, color: status === "listening" ? "#ff4d6d" : status === "thinking" ? "#ffb347" : "rgba(0,212,255,0.7)", fontFamily: "'Geist',sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {statusLabel}
          </div>
          <div className="va-msgs" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`va-msg ${m.role}`}>
                <div className="va-bubble">{m.text}</div>
              </div>
            ))}
            {/* Streaming text in FAB panel */}
            {streamingText && status === "thinking" && (
              <div className="va-msg ai">
                <div className="va-bubble" style={{ borderColor: "rgba(20,184,166,0.3)" }}>
                  <StreamingText text={streamingText} isStreaming={true} />
                </div>
              </div>
            )}
            {status === "listening" && transcript && (
              <div className="va-msg user"><div className="va-bubble" style={{ opacity: 0.6, fontStyle: "italic" }}>{transcript}…</div></div>
            )}
            {status === "listening" && (
              <div className="va-wave">{[1, 2, 3, 4, 5].map(i => <div key={i} className="va-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}</div>
            )}
            {status === "thinking" && !streamingText && (
              <div className="va-msg ai">
                <div className="va-bubble">
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(240,239,245,0.4)", animation: `tdot 1.2s ease ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="va-hints">
            {HINTS.map(h => <button key={h} className="va-hint" onClick={() => handleCommand(h)}>{h}</button>)}
          </div>
          <div className="va-bar-row">
            <button className={`va-mic-btn ${status === "listening" ? "active" : ""}`} onClick={startListening} title="Click to speak">🎙</button>
            <input className="va-inp" placeholder="Type a command or question…" value={textInp} onChange={e => setTextInp(e.target.value)} onKeyDown={e => e.key === "Enter" && sendText()} />
            <button className="va-send" onClick={sendText}>{tr(lang, "sendBtn")}</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("dark");
  const [vitals, setVitals] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [risk, setRisk] = useState(null);

  return (
    <>
      <style>{CSS}</style>
      <div
        className={`shell ${theme === "light" ? "light" : ""}`}
        style={{
          minHeight: "100vh",
          background: "var(--ink)",
          transition: "background 0.3s",
          color: "var(--text)",
          fontFamily: "'Geist', sans-serif",
          fontWeight: 400,
          lineHeight: 1.5,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <nav className="rail">
          <div className="rail-logo">Vita<span>Lens</span></div>
          <div className="rail-nav">
            {NAV_BASE.map(n => (
              <div key={n.id} className={`rn ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)}>
                <span className="rn-icon">{n.icon}</span>
                <span className="rn-label">{tr(lang, n.key)}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "6px 20px", width: "100%", display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => setTheme(th => th === "dark" ? "light" : "dark")}
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--ink3)", color: "var(--cyan)", cursor: "pointer", fontSize: 14, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}
              title={theme === "dark" ? "Switch to Light" : "Switch to Deep Navy"}
            >
              {theme === "dark" ? "☀️" : "🌊"}
            </button>
          </div>
          <div className="rail-foot">
            <div className="rail-foot-label">v1.1 · Stream</div>
          </div>
        </nav>

        <main className="stage">
          {page === "dashboard" && <Dashboard vitals={vitals} symptoms={symptoms} riskScore={risk} setPage={setPage} lang={lang} />}
          {page === "vitals"    && <VitalsScanner onSave={setVitals} lang={lang} />}
          {page === "symptoms"  && <VoiceSymptoms onSave={s => setSymptoms(p => [...p, s])} lang={lang} />}
          {page === "risk"      && <RiskEngine onSave={setRisk} lang={lang} />}
          {page === "chat"      && <AIChatbot lang={lang} />}
          {page === "meds"      && <Medications lang={lang} />}
          {page === "reports"   && <Reports vitals={vitals} symptoms={symptoms} riskScore={risk} lang={lang} />}
          {page === "settings"  && <Settings lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />}
        </main>

        <VoiceAssistant setPage={setPage} lang={lang} />
      </div>
    </>
  );
}
