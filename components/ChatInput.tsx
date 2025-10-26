

import React, { useRef, useState, useEffect } from 'react';
import { 
    SendIcon, 
    CloseIcon, 
    PlusCircleIcon, 
    MicrophoneIcon, 
    UploadIcon, 
    DriveIcon, 
    CodeBracketsIcon, 
    SparklesIcon,
    VideoIcon,
    CanvasIcon,
    BookOpenIcon,
    ImagesIcon,
    MapIcon,
    LiveIcon
} from './Icons';
import type { FileAttachment } from '../types';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSendMessage: () => void;
    isLoading: boolean;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    attachedFile: FileAttachment | null;
    removeAttachedFile: () => void;
    isListening: boolean;
    toggleListening: () => void;
    isDeepSearchEnabled: boolean;
    setIsDeepSearchEnabled: (enabled: boolean) => void;
    isMapsSearchEnabled: boolean;
    setIsMapsSearchEnabled: (enabled: boolean) => void;
    onGenerateImageClick: () => void;
    onGenerateVideoClick: () => void;
    onLiveConversationClick: () => void;
    editingMessage: { messageId: string; file: FileAttachment } | null;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
    input, 
    setInput, 
    onSendMessage, 
    isLoading,
    onFileSelect,
    attachedFile,
    removeAttachedFile,
    isListening,
    toggleListening,
    isDeepSearchEnabled,
    setIsDeepSearchEnabled,
    isMapsSearchEnabled,
    setIsMapsSearchEnabled,
    onGenerateImageClick,
    onGenerateVideoClick,
    onLiveConversationClick,
    editingMessage,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const fileMenuRef = useRef<HTMLDivElement>(null);
    const toolsMenuRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
        setIsFileMenuOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) setIsFileMenuOpen(false);
        if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) setIsToolsMenuOpen(false);
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const canSendMessage = !isLoading && (input.trim().length > 0 || attachedFile !== null);
    const placeholderText = editingMessage ? `Editing image... What should I change?` : "Peça ao Gemini";

    return (
        <div className="flex-shrink-0 px-4 pb-4 pt-2">
            <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
                {attachedFile && (
                    <div className="mb-2 self-start flex items-center bg-[rgb(var(--bg-accent-subtle))] text-[rgb(var(--text-accent))] text-sm font-medium pl-3 pr-2 py-1.5 rounded-lg max-w-max">
                        <ImagesIcon className="w-4 h-4 mr-2" />
                        <span>{attachedFile.name}</span>
                        <button onClick={removeAttachedFile} className="ml-2 text-[rgb(var(--accent-primary))] hover:text-[rgb(var(--accent-secondary))]">
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="relative w-full p-2 bg-[rgb(var(--bg-tertiary))] rounded-2xl shadow-md">
                    <div className="flex items-end">
                        <div className="flex-shrink-0 flex items-center gap-1">
                            <div className="relative" ref={fileMenuRef}>
                                <button onClick={() => setIsFileMenuOpen(prev => !prev)} className="p-2 text-[rgb(var(--text-secondary))] rounded-full hover:bg-[rgb(var(--bg-tertiary-hover))]">
                                    <PlusCircleIcon className="w-6 h-6"/>
                                </button>
                                {isFileMenuOpen && (
                                    <div className="absolute bottom-full mb-2 w-64 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-primary))] rounded-lg shadow-xl z-10">
                                        <ul className="p-2 text-sm text-[rgb(var(--text-primary))]">
                                            <li onClick={handleAttachmentClick} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[rgb(var(--bg-tertiary))] cursor-pointer">
                                                <UploadIcon className="w-5 h-5"/> Enviar arquivos
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                             <div className="relative" ref={toolsMenuRef}>
                                <button onClick={() => setIsToolsMenuOpen(prev => !prev)} className="p-2 text-[rgb(var(--text-secondary))] rounded-full hover:bg-[rgb(var(--bg-tertiary-hover))]">
                                    <SparklesIcon className="w-6 h-6"/>
                                </button>
                                 {isToolsMenuOpen && (
                                    <div className="absolute bottom-full mb-2 w-64 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-primary))] rounded-lg shadow-xl z-10">
                                        <ul className="p-2 text-sm text-[rgb(var(--text-primary))]">
                                            <li onClick={() => setIsDeepSearchEnabled(!isDeepSearchEnabled)} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-[rgb(var(--bg-tertiary))] cursor-pointer ${isDeepSearchEnabled ? 'text-[rgb(var(--accent-primary))]' : ''}`}>
                                                <div className="flex items-center gap-3"><SparklesIcon className="w-5 h-5"/> Busca na Web</div>
                                                <div className={`w-4 h-4 rounded-full border-2 ${isDeepSearchEnabled ? 'bg-[rgb(var(--accent-primary))] border-[rgb(var(--accent-primary))]' : 'border-[rgb(var(--text-secondary))]'}`}></div>
                                            </li>
                                            <li onClick={() => setIsMapsSearchEnabled(!isMapsSearchEnabled)} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-[rgb(var(--bg-tertiary))] cursor-pointer ${isMapsSearchEnabled ? 'text-[rgb(var(--accent-primary))]' : ''}`}>
                                                <div className="flex items-center gap-3"><MapIcon className="w-5 h-5"/> Busca no Mapa</div>
                                                <div className={`w-4 h-4 rounded-full border-2 ${isMapsSearchEnabled ? 'bg-[rgb(var(--accent-primary))] border-[rgb(var(--accent-primary))]' : 'border-[rgb(var(--text-secondary))]'}`}></div>
                                            </li>
                                            <li onClick={() => { onGenerateVideoClick(); setIsToolsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[rgb(var(--bg-tertiary))] cursor-pointer">
                                                <VideoIcon className="w-5 h-5"/> Gerar vídeo com Veo
                                            </li>
                                            <li onClick={() => { onGenerateImageClick(); setIsToolsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[rgb(var(--bg-tertiary))] cursor-pointer">
                                                <ImagesIcon className="w-5 h-5"/> Gerar imagem com Imagen
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholderText}
                            className="flex-1 max-h-48 p-2 bg-transparent resize-none text-base text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-secondary))] focus:outline-none"
                            rows={1}
                            disabled={isLoading}
                        />
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={onFileSelect}
                            className="hidden"
                            accept="image/*,video/*,text/plain,application/pdf"
                        />
                        <div className="flex-shrink-0 flex items-center gap-1">
                            <button onClick={onLiveConversationClick} className={'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary-hover))] p-2 rounded-full'}>
                                <LiveIcon className="h-6 w-6" />
                            </button>
                            <button onClick={toggleListening} className={`p-2 rounded-full ${isListening ? 'bg-[rgb(var(--danger))] text-white animate-pulse' : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary-hover))]'}`}>
                                <MicrophoneIcon className="h-6 w-6" />
                            </button>
                             <button 
                                onClick={onSendMessage}
                                disabled={!canSendMessage}
                                className="p-2 rounded-full text-[rgb(var(--accent-text))] bg-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--accent-secondary))] disabled:bg-[rgb(var(--text-secondary))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <SendIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};