

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, Chat, Content, Modality, LiveServerMessage, Blob as GenAIBlob } from "@google/genai";
import type { Message, ChatMode, Conversation, FileAttachment, Theme, ModelName, AspectRatio } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { SettingsModal } from './components/SettingsModal';
import { CHAT_MODES } from './constants';

// Speech Recognition and Audio Helper Types
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    start(): void;
    stop(): void;
}
interface SpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultList; }
interface SpeechRecognitionResultList { readonly length: number; item(index: number): SpeechRecognitionResult; [index: number]: SpeechRecognitionResult; }
interface SpeechRecognitionResult { readonly isFinal: boolean; readonly length: number; item(index: number): SpeechRecognitionAlternative; [index: number]: SpeechRecognitionAlternative; }
interface SpeechRecognitionAlternative { readonly transcript: string; }

declare global {
    // Fix: Define AIStudio interface in the global scope to resolve type conflict.
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        SpeechRecognition: { new(): SpeechRecognition; };
        webkitSpeechRecognition: { new(): SpeechRecognition; };
        aistudio?: AIStudio;
    }
}

const LOCAL_STORAGE_KEY = 'flashcore_chat_history';
const THEME_STORAGE_KEY = 'flashcore_chat_theme';
const USER_STORAGE_KEY = 'flashcore_chat_user';

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

// Audio Encoding/Decoding Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const App = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [activeMode, setActiveMode] = useState<ChatMode>('education');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [attachedFile, setAttachedFile] = useState<FileAttachment | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isDeepSearchEnabled, setIsDeepSearchEnabled] = useState(false);
    const [isMapsSearchEnabled, setIsMapsSearchEnabled] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>('dark');
    const [aiMemory, setAiMemory] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<ModelName>('gemini-2.5-flash');
    const [editingMessage, setEditingMessage] = useState<{ messageId: string, file: FileAttachment } | null>(null);

    const [isImageGenOpen, setIsImageGenOpen] = useState(false);
    const [isVideoGenOpen, setIsVideoGenOpen] = useState(false);

    const [isLiveActive, setIsLiveActive] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState<{user: string, model: string, history: string[]}>({user: '', model: '', history: []});
    
    const [user, setUser] = useState<{ email: string } | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const chatRef = useRef<Chat | null>(null);
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
    const liveSessionRef = useRef<any>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    
    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const messages = activeConversation?.messages || [];
    
    // Lazy initialization of AI client
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
        if (savedTheme) setTheme(savedTheme); else setTheme('dark');

        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        if(savedUser) setUser(JSON.parse(savedUser));

        try {
            const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedHistory) {
                const parsedHistory = JSON.parse(savedHistory);
                setConversations(parsedHistory.conversations || []);
                setAiMemory(parsedHistory.aiMemory || '');
            }
        } catch (error) { console.error("Failed to load chat history:", error); }
    }, []);

    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        document.documentElement.className = '';
        document.documentElement.classList.add(theme);
    }, [theme]);

    useEffect(() => {
        try {
            const historyToSave = JSON.stringify({ conversations, aiMemory });
            localStorage.setItem(LOCAL_STORAGE_KEY, historyToSave);
        } catch (error) { console.error("Failed to save chat history:", error); }
    }, [conversations, aiMemory]);
    
    const handleLogin = (email: string) => {
        const userData = { email };
        setUser(userData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        setIsLoginModalOpen(false);
    };
    
    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
    };


    const initializeChat = useCallback((mode: ChatMode, history: Message[] = [], model: ModelName) => {
        try {
            const baseSystemInstruction = CHAT_MODES.find(m => m.id === mode)?.systemInstruction || "You are a helpful assistant.";
            const finalSystemInstruction = aiMemory ? `${baseSystemInstruction}\n\nIMPORTANT INSTRUCTIONS:\n${aiMemory}` : baseSystemInstruction;
            
            const geminiHistory = history.map(msg => {
                const parts: any[] = [];
                if (msg.text) parts.push({ text: msg.text });
                if (msg.file?.data) parts.push({ inlineData: { mimeType: msg.file.type, data: msg.file.data } });
                const role: 'user' | 'model' = msg.sender === 'user' ? 'user' : 'model';
                return { role, parts };
            }).filter(msg => msg.parts.length > 0);

            const finalHistory: Content[] = [];
            let currentRole: 'user' | 'model' | null = null;
            const startIndex = geminiHistory.findIndex(m => m.role === 'user');
            
            if (startIndex !== -1) {
                for (let i = startIndex; i < geminiHistory.length; i++) {
                    const message = geminiHistory[i];
                    if (message.role !== currentRole) {
                        finalHistory.push(message);
                        currentRole = message.role;
                    } else {
                        finalHistory[finalHistory.length - 1]?.parts.push(...message.parts);
                    }
                }
            }
            
            const config: any = { systemInstruction: finalSystemInstruction };
            if (model === 'gemini-2.5-pro') {
                config.thinkingConfig = { thinkingBudget: 32768 };
            }

            chatRef.current = ai.chats.create({ model, history: finalHistory, config });
        } catch (error) { console.error("Failed to initialize Gemini chat:", error); }
    }, [aiMemory, ai]);
    
    useEffect(() => {
        const currentMode = activeConversation?.mode || activeMode;
        const history = activeConversation?.messages || [];
        const modelToUse = activeConversation?.model || selectedModel;
        initializeChat(currentMode, history, modelToUse);
    }, [activeConversationId, activeMode, initializeChat, activeConversation, aiMemory, selectedModel]);
    
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'pt-BR';
            recognition.onresult = (event) => {
                let interim = '', final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) final += event.results[i][0].transcript;
                    else interim += event.results[i][0].transcript;
                }
                setInput(final + interim);
            };
            recognition.onend = () => setIsListening(false);
            speechRecognitionRef.current = recognition;
        }
    }, []);

    const addMessageToConversation = (convoId: string, message: Message) => {
        setConversations(prev => prev.map(c => c.id === convoId ? { ...c, messages: [...c.messages, message] } : c));
    };

    const updateMessageInConversation = (convoId: string, messageId: string, updates: Partial<Message>) => {
         setConversations(prev => prev.map(c => {
            if (c.id === convoId) {
                const updatedMessages = c.messages.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg);
                return { ...c, messages: updatedMessages };
            }
            return c;
        }));
    }

    const handleSendMessage = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput && !attachedFile || isLoading) return;

        let userMessage: Message;
        let prompt = trimmedInput;

        if (editingMessage) {
            prompt = `Edit instruction: ${trimmedInput}`;
            userMessage = { 
                id: Date.now().toString(), 
                text: prompt, 
                sender: 'user',
                file: {
                    name: editingMessage.file.name,
                    type: editingMessage.file.mimeType,
                    data: editingMessage.file.base64,
                }
            };
        } else {
             userMessage = { 
                id: Date.now().toString(), 
                text: trimmedInput, 
                sender: 'user',
                file: attachedFile ? { name: attachedFile.name, type: attachedFile.mimeType, data: attachedFile.base64 } : undefined
            };
        }

        let currentConvoId = activeConversationId;

        if (!currentConvoId) {
            const title = trimmedInput.substring(0, 40) || `Conversation about ${attachedFile?.name || 'edit'}`;
            const newConversation: Conversation = { id: `convo-${Date.now()}`, title, timestamp: Date.now(), mode: activeMode, model: selectedModel, messages: [userMessage] };
            setConversations(prev => [newConversation, ...prev]);
            setActiveConversationId(newConversation.id);
            currentConvoId = newConversation.id;
        } else {
            addMessageToConversation(currentConvoId, userMessage);
        }

        setInput('');
        setAttachedFile(null);
        setIsLoading(true);
        setIsTyping(true);

        // Handle Image Edit separately
        if (editingMessage) {
             try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [
                        { inlineData: { data: editingMessage.file.base64, mimeType: editingMessage.file.mimeType } },
                        { text: trimmedInput }
                    ]},
                    config: { responseModalities: [Modality.IMAGE] },
                });
                setIsTyping(false);
                const part = response.candidates?.[0]?.content?.parts?.[0];
                if (part?.inlineData) {
                    const newFile = { name: "edited_image.png", type: part.inlineData.mimeType, data: part.inlineData.data };
                    const aiMessage: Message = { id: (Date.now() + 1).toString(), text: "Here is the edited image:", sender: 'ai', file: newFile };
                    addMessageToConversation(currentConvoId, aiMessage);
                } else {
                    throw new Error("No image was generated.");
                }
            } catch (error) {
                console.error("Error editing image:", error);
                addMessageToConversation(currentConvoId, { id: Date.now().toString(), text: `Error editing image: ${error instanceof Error ? error.message : 'Unknown error'}`, sender: 'ai' });
            } finally {
                setIsLoading(false);
                setEditingMessage(null);
            }
            return;
        }

        // Handle normal chat
        try {
            if (!chatRef.current) {
                const convo = conversations.find(c => c.id === currentConvoId);
                initializeChat(convo?.mode || activeMode, convo?.messages || [], convo?.model || selectedModel);
            }
            if (!chatRef.current) throw new Error("Chat is not initialized.");
            
            const parts: any[] = [];
            if(trimmedInput) parts.push({ text: trimmedInput });
            if(attachedFile) parts.push({ inlineData: { mimeType: attachedFile.mimeType, data: attachedFile.base64 } });
            
            const toolConfig: any = {};
            const tools: any[] = [];
            if(isDeepSearchEnabled) tools.push({googleSearch: {}});
            if(isMapsSearchEnabled) {
                tools.push({googleMaps: {}});
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
                    toolConfig.retrievalConfig = { latLng: { latitude: position.coords.latitude, longitude: position.coords.longitude } };
                } catch(e) { console.warn("Could not get location for Maps grounding."); }
            }

            const stream = await chatRef.current.sendMessageStream({ message: parts, config: { tools: tools.length > 0 ? tools : undefined, toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined }});
            setIsTyping(false);
            
            let aiResponseText = '';
            let groundingChunks: any[] = [];
            const aiMessageId = (Date.now() + 1).toString();
            addMessageToConversation(currentConvoId, { id: aiMessageId, text: '', sender: 'ai', groundingChunks: [] });

            for await (const chunk of stream) {
                aiResponseText += chunk.text;
                if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                    groundingChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
                }
                updateMessageInConversation(currentConvoId, aiMessageId, { text: aiResponseText, groundingChunks });
            }
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addMessageToConversation(currentConvoId, { id: Date.now().toString(), text: `Error: ${errorMessage}`, sender: 'ai' });
        } finally {
            setIsLoading(false);
            if(isDeepSearchEnabled) setIsDeepSearchEnabled(false);
            if(isMapsSearchEnabled) setIsMapsSearchEnabled(false);
        }
    };

    const handlePlayTTS = async (text: string) => {
        if (!text) return;
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: { responseModalities: [Modality.AUDIO] },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                if (!outputAudioContextRef.current) {
                    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                }
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                source.start();
            }
        } catch (error) { console.error('TTS Error:', error); }
    };
    
    const handleGenerateImage = async (prompt: string, aspectRatio: AspectRatio) => {
        if (!prompt) return;
        setIsImageGenOpen(false);
        const userMessage: Message = { id: Date.now().toString(), text: `Generate image: "${prompt}" with aspect ratio ${aspectRatio}`, sender: 'user' };
        let currentConvoId = activeConversationId;
        if (!currentConvoId) {
            const newConversation = { id: `convo-${Date.now()}`, title: `Image: ${prompt.substring(0, 20)}`, timestamp: Date.now(), mode: activeMode, model: selectedModel, messages: [userMessage] };
            setConversations(prev => [newConversation, ...prev]);
            currentConvoId = newConversation.id;
            setActiveConversationId(currentConvoId);
        } else {
            addMessageToConversation(currentConvoId, userMessage);
        }

        setIsLoading(true);
        const aiLoadingMessageId = (Date.now()+1).toString();
        addMessageToConversation(currentConvoId, { id: aiLoadingMessageId, text: 'Generating image...', sender: 'ai'});
        
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio },
            });
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const newFile = { name: "generated_image.jpg", type: 'image/jpeg', data: base64ImageBytes };
            updateMessageInConversation(currentConvoId, aiLoadingMessageId, { text: "Here is your generated image:", file: newFile });
        } catch (error) {
            console.error('Image generation error:', error);
            updateMessageInConversation(currentConvoId, aiLoadingMessageId, { text: `Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`});
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateVideo = async (prompt: string, aspectRatio: "16:9" | "9:16") => {
        if (!prompt && !attachedFile) return;
        if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
            await window.aistudio.openSelectKey();
        }
        
        setIsVideoGenOpen(false);
        const userMessageText = `Generate video: "${prompt}"` + (attachedFile ? ` from image ${attachedFile.name}` : '');
        const userMessage: Message = { id: Date.now().toString(), text: userMessageText, sender: 'user', file: attachedFile ? { name: attachedFile.name, type: attachedFile.mimeType, data: attachedFile.base64 } : undefined };

        let currentConvoId = activeConversationId;
        if (!currentConvoId) {
            const newConversation = { id: `convo-${Date.now()}`, title: `Video: ${prompt.substring(0, 20)}`, timestamp: Date.now(), mode: activeMode, model: selectedModel, messages: [userMessage] };
            setConversations(prev => [newConversation, ...prev]);
            currentConvoId = newConversation.id;
            setActiveConversationId(currentConvoId);
        } else {
            addMessageToConversation(currentConvoId, userMessage);
        }
        setAttachedFile(null);

        setIsLoading(true);
        const aiLoadingMessageId = (Date.now() + 1).toString();
        addMessageToConversation(currentConvoId, { id: aiLoadingMessageId, text: 'Generating video... this may take a few minutes.', sender: 'ai' });

        try {
            const veoAI = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            let operation = await veoAI.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt,
                image: attachedFile ? { imageBytes: attachedFile.base64, mimeType: attachedFile.mimeType } : undefined,
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await veoAI.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video generation completed but no URI was returned.");
            
            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const videoBlob = await videoResponse.blob();
            const reader = new FileReader();
            reader.readAsDataURL(videoBlob);
            reader.onloadend = () => {
                const base64data = (reader.result as string).split(',')[1];
                const newFile = { name: "generated_video.mp4", type: 'video/mp4', data: base64data };
                updateMessageInConversation(currentConvoId, aiLoadingMessageId, { text: "Here is your generated video:", file: newFile });
            };
        } catch (error) {
            console.error('Video generation error:', error);
            updateMessageInConversation(currentConvoId, aiLoadingMessageId, { text: `Error generating video: ${error instanceof Error ? error.message : 'Unknown error'}` });
             if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
                if (window.aistudio) window.aistudio.openSelectKey();
             }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStartLiveConversation = async () => {
        setIsLiveActive(true);
        setLiveTranscript({ user: '', model: '', history: [] });

        if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        if (!inputAudioContextRef.current) inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

        let nextStartTime = 0;
        const sources = new Set<AudioBufferSourceNode>();
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                        const pcmBlob: GenAIBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                        sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        setLiveTranscript(prev => ({...prev, model: prev.model + text}));
                    }
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        setLiveTranscript(prev => ({...prev, user: prev.user + text}));
                    }
                    if (message.serverContent?.turnComplete) {
                        setLiveTranscript(prev => {
                            const newHistory = [...prev.history];
                            if(prev.user.trim()) newHistory.push(`You: ${prev.user.trim()}`);
                            if(prev.model.trim()) newHistory.push(`AI: ${prev.model.trim()}`);
                            return { user: '', model: '', history: newHistory };
                        });
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current!.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
                        const source = outputAudioContextRef.current!.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current!.destination);
                        source.addEventListener('ended', () => { sources.delete(source); });
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(source);
                    }
                    if (message.serverContent?.interrupted) {
                        for (const source of sources.values()) source.stop();
                        sources.clear();
                        nextStartTime = 0;
                    }
                },
                onerror: (e: ErrorEvent) => console.error('Live API Error:', e),
                onclose: (e: CloseEvent) => setIsLiveActive(false),
            },
            config: {
                responseModalities: [Modality.AUDIO],
                outputAudioTranscription: {},
                inputAudioTranscription: {},
            },
        });
        liveSessionRef.current = await sessionPromise;
    };

    const handleStopLiveConversation = () => {
        if(liveSessionRef.current) liveSessionRef.current.close();
        setIsLiveActive(false);
    }
    
    const handleNewConversation = () => { setActiveConversationId(null); setInput(''); setAttachedFile(null); };
    const handleSelectConversation = (id: string) => {
        const selectedConvo = conversations.find(c => c.id === id);
        if (selectedConvo) {
            setActiveMode(selectedConvo.mode);
            setSelectedModel(selectedConvo.model || 'gemini-2.5-flash');
            setActiveConversationId(id);
        }
    };
    const handleModeChange = (mode: ChatMode) => { setActiveMode(mode); handleNewConversation(); };
    const handleModelChange = (model: ModelName) => { setSelectedModel(model); handleNewConversation(); };
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setAttachedFile({ name: file.name, mimeType: file.type, base64 });
            } catch (error) { console.error("Error converting file to base64", error); }
        }
        if(event.target) event.target.value = '';
    };
    const toggleListening = () => {
        if (!speechRecognitionRef.current) return;
        if (isListening) speechRecognitionRef.current.stop(); else speechRecognitionRef.current.start();
        setIsListening(!isListening);
    };

    const handleDeleteConversation = (id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null);
        }
    };

    const handleToggleFavorite = (id: string) => {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, favorited: !c.favorited } : c));
    };

    return (
        <div className="flex h-screen w-full bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-primary))] font-sans">
            {isLiveActive && (
                <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-lg w-full max-w-2xl text-[rgb(var(--text-primary))]">
                        <h2 className="text-2xl font-bold mb-4">Live Conversation</h2>
                        <div className="h-64 overflow-y-auto bg-[rgb(var(--bg-primary))] p-3 rounded mb-4">
                            {liveTranscript.history.map((line, i) => <p key={i}>{line}</p>)}
                            {liveTranscript.user && <p className="text-[rgb(var(--text-secondary))]">You: {liveTranscript.user}</p>}
                            {liveTranscript.model && <p className="text-green-400">AI: {liveTranscript.model}</p>}
                        </div>
                        <button onClick={handleStopLiveConversation} className="w-full py-2 bg-[rgb(var(--danger))] hover:bg-[rgb(var(--danger-hover))] text-white rounded">End Conversation</button>
                    </div>
                </div>
            )}
             {isImageGenOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-[rgb(var(--text-primary))]">Gerar Imagem</h2>
                        <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleGenerateImage(formData.get('prompt') as string, formData.get('aspectRatio') as AspectRatio); }}>
                            <textarea name="prompt" placeholder="A robot holding a red skateboard." className="w-full p-2 border rounded mb-2 bg-[rgb(var(--bg-tertiary))] border-[rgb(var(--border-primary))] text-[rgb(var(--text-primary))]" required/>
                            <select name="aspectRatio" defaultValue="1:1" className="w-full p-2 border rounded mb-4 bg-[rgb(var(--bg-tertiary))] border-[rgb(var(--border-primary))] text-[rgb(var(--text-primary))]">
                                <option value="1:1">1:1 (Square)</option>
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                                <option value="4:3">4:3</option>
                                <option value="3:4">3:4</option>
                            </select>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsImageGenOpen(false)} className="px-4 py-2 bg-[rgb(var(--bg-tertiary))] rounded text-[rgb(var(--text-primary))]">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-[rgb(var(--accent-primary))] text-[rgb(var(--accent-text))] rounded">Gerar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
             {isVideoGenOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-[rgb(var(--text-primary))]">Gerar Vídeo</h2>
                        <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleGenerateVideo(formData.get('prompt') as string, formData.get('aspectRatio') as "16:9" | "9:16"); }}>
                             {attachedFile && <p className="text-sm mb-2 text-[rgb(var(--text-secondary))]">Usando imagem anexa: {attachedFile.name}</p>}
                            <textarea name="prompt" placeholder="Um holograma de néon de um gato dirigindo em alta velocidade." className="w-full p-2 border rounded mb-2 bg-[rgb(var(--bg-tertiary))] border-[rgb(var(--border-primary))] text-[rgb(var(--text-primary))]" required={!attachedFile}/>
                            <select name="aspectRatio" defaultValue="16:9" className="w-full p-2 border rounded mb-4 bg-[rgb(var(--bg-tertiary))] border-[rgb(var(--border-primary))] text-[rgb(var(--text-primary))]">
                                <option value="16:9">16:9 (Paisagem)</option>
                                <option value="9:16">9:16 (Retrato)</option>
                            </select>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsVideoGenOpen(false)} className="px-4 py-2 bg-[rgb(var(--bg-tertiary))] rounded text-[rgb(var(--text-primary))]">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-[rgb(var(--accent-primary))] text-[rgb(var(--accent-text))] rounded">Gerar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isLoginModalOpen && (
                 <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[rgb(var(--bg-secondary))] p-6 rounded-lg w-full max-w-sm">
                        <h2 className="text-xl font-bold mb-4 text-[rgb(var(--text-primary))]">Fazer Login</h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleLogin(new FormData(e.currentTarget).get('email') as string); }}>
                            <input type="email" name="email" placeholder="seuemail@exemplo.com" required className="w-full p-2 border rounded mb-4 bg-[rgb(var(--bg-tertiary))] border-[rgb(var(--border-primary))] text-[rgb(var(--text-primary))]" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsLoginModalOpen(false)} className="px-4 py-2 bg-[rgb(var(--bg-tertiary))] rounded text-[rgb(var(--text-primary))]">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-[rgb(var(--accent-primary))] text-[rgb(var(--accent-text))] rounded">Entrar</button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}
            <Sidebar 
                user={user}
                onNewConversation={handleNewConversation}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                conversations={conversations}
                activeConversationId={activeConversationId || null}
                onSelectConversation={handleSelectConversation}
                onLoginClick={() => setIsLoginModalOpen(true)}
                onLogoutClick={handleLogout}
                onDeleteConversation={handleDeleteConversation}
                onToggleFavorite={handleToggleFavorite}
            />
            <main className="flex flex-1 flex-col transition-all duration-300">
                <Header 
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <ChatWindow 
                        user={user}
                        messages={messages} 
                        isLoading={isLoading} 
                        isTyping={isTyping}
                        onPlayTTS={handlePlayTTS}
                        onEditImage={(messageId, file) => setEditingMessage({messageId, file})}
                    />
                    <ChatInput 
                        input={input}
                        setInput={setInput}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        onFileSelect={handleFileSelect}
                        attachedFile={attachedFile}
                        removeAttachedFile={() => setAttachedFile(null)}
                        isListening={isListening}
                        toggleListening={toggleListening}
                        isDeepSearchEnabled={isDeepSearchEnabled}
                        setIsDeepSearchEnabled={setIsDeepSearchEnabled}
                        isMapsSearchEnabled={isMapsSearchEnabled}
                        setIsMapsSearchEnabled={setIsMapsSearchEnabled}
                        onGenerateImageClick={() => setIsImageGenOpen(true)}
                        onGenerateVideoClick={() => setIsVideoGenOpen(true)}
                        onLiveConversationClick={handleStartLiveConversation}
                        editingMessage={editingMessage}
                    />
                </div>
            </main>
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                theme={theme}
                setTheme={setTheme}
                aiMemory={aiMemory}
                setAiMemory={setAiMemory}
                activeMode={activeMode}
                onModeChange={handleModeChange}
                conversations={conversations}
                user={user}
                onLogoutClick={handleLogout}
            />
        </div>
    );
};

export default App;