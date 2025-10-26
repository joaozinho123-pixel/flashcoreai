

import React, { useEffect, useRef } from 'react';
import type { Message, FileAttachment } from '../types';
import { VoiceIcon, FilesIcon, ImagesIcon, SettingsIcon, AiIcon, SpeakerIcon, EditIcon } from './Icons';

interface ChatWindowProps {
    user: { email: string; } | null;
    messages: Message[];
    isLoading: boolean;
    isTyping: boolean;
    onPlayTTS: (text: string) => void;
    onEditImage: (messageId: string, file: FileAttachment) => void;
}

const WelcomeScreen: React.FC<{ user: { email: string; } | null }> = ({ user }) => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold text-[rgb(var(--text-primary))]">
            <span role="img" aria-label="waving hand" className="mr-2">👋</span>
            Olá, {user ? user.email.split('@')[0] : "Joao pedro"}!
        </h1>
        <p className="mt-2 text-lg text-[rgb(var(--text-secondary))]">O que posso fazer por você hoje?</p>
        <div className="mt-8 flex items-center space-x-6 text-[rgb(var(--text-secondary))]">
            <button className="flex items-center space-x-2 hover:text-[rgb(var(--accent-primary))]">
                <VoiceIcon className="h-5 w-5" />
                <span>Voz</span>
            </button>
            <span className="text-[rgb(var(--border-primary))]">|</span>
            <button className="flex items-center space-x-2 hover:text-[rgb(var(--accent-primary))]">
                <FilesIcon className="h-5 w-5" />
                <span>Arquivos</span>
            </button>
            <span className="text-[rgb(var(--border-primary))]">|</span>
            <button className="flex items-center space-x-2 hover:text-[rgb(var(--accent-primary))]">
                <ImagesIcon className="h-5 w-5" />
                <span>Imagens</span>
            </button>
            <span className="text-[rgb(var(--border-primary))]">|</span>
            <button className="flex items-center space-x-2 hover:text-[rgb(var(--accent-primary))]">
                <SettingsIcon className="h-5 w-5" />
                <span>Configurações</span>
            </button>
        </div>
    </div>
);

const MessageItem: React.FC<{ message: Message; isLastMessage: boolean; isLoading: boolean; isTyping: boolean; onPlayTTS: (text: string) => void; onEditImage: (messageId: string, file: FileAttachment) => void; user: { email: string } | null; }> = ({ message, isLastMessage, isLoading, isTyping, onPlayTTS, onEditImage, user }) => {
    const isUser = message.sender === 'user';
    const isStreaming = !isUser && isLastMessage && isLoading;
    const hasImage = message.file?.type.startsWith('image/');
    const hasVideo = message.file?.type.startsWith('video/');

    return (
        <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
            {!isUser ? (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--bg-tertiary))] flex items-center justify-center">
                    <AiIcon className="w-5 h-5 text-[rgb(var(--text-secondary))]" />
                </div>
            ) : (
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgb(var(--accent-primary))] flex items-center justify-center text-[rgb(var(--accent-text))] font-bold">
                    {user ? user.email.charAt(0).toUpperCase() : 'J'}
                </div>
            )}
            <div className={`flex flex-col max-w-xl`}>
                <div className={`relative group p-4 rounded-xl ${isUser ? 'bg-[rgb(var(--accent-primary))] text-[rgb(var(--accent-text))] rounded-br-none' : 'bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-primary))] rounded-bl-none'}`}>
                     {hasImage && (
                        <div className="relative">
                             <img 
                                src={`data:${message.file!.type};base64,${message.file!.data}`} 
                                alt={message.file!.name}
                                className="max-w-xs rounded-lg mb-2"
                            />
                            {!isUser && (
                                <button onClick={() => onEditImage(message.id, {name: message.file!.name, mimeType: message.file!.type, base64: message.file!.data})} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <EditIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                    {hasVideo && (
                         <video 
                            src={`data:${message.file!.type};base64,${message.file!.data}`} 
                            controls
                            className="max-w-xs rounded-lg mb-2"
                        />
                    )}
                    <p className="whitespace-pre-wrap">
                        {message.text}
                        {isTyping && !isUser && isLastMessage && message.text.length === 0 && <span className="italic text-[rgb(var(--text-secondary))]">Thinking...</span>}
                        {isStreaming && <span className="inline-block w-0.5 h-4 bg-[rgb(var(--text-primary))] animate-pulse ml-1 align-bottom"></span>}
                    </p>
                    {!isUser && message.text && (
                         <button onClick={() => onPlayTTS(message.text)} className="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <SpeakerIcon className="w-4 h-4"/>
                        </button>
                    )}
                </div>
                {!isUser && message.groundingChunks && message.groundingChunks.length > 0 && (
                    <div className="mt-2 text-xs text-[rgb(var(--text-secondary))]">
                        <h4 className="font-semibold">Sources:</h4>
                        <ul className="list-disc list-inside">
                            {message.groundingChunks.map((chunk, index) => {
                                if (chunk.web) {
                                    return (
                                        <li key={`web-${index}`}>
                                            <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--accent-primary))] hover:underline">
                                                {chunk.web.title || chunk.web.uri}
                                            </a>
                                        </li>
                                    );
                                }
                                if (chunk.maps) {
                                     return (
                                        <li key={`map-${index}`}>
                                            <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--accent-primary))] hover:underline">
                                                {chunk.maps.title || 'View on Google Maps'}
                                            </a>
                                        </li>
                                    );
                                }
                                return null;
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ user, messages, isLoading, isTyping, onPlayTTS, onEditImage }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-[rgb(var(--bg-secondary))]">
            {messages.length === 0 ? (
                <WelcomeScreen user={user} />
            ) : (
                <div className="space-y-6">
                    {messages.map((msg, index) => (
                        <MessageItem 
                            key={msg.id} 
                            message={msg}
                            isLastMessage={index === messages.length - 1}
                            isLoading={isLoading}
                            isTyping={isTyping}
                            onPlayTTS={onPlayTTS}
                            onEditImage={onEditImage}
                            user={user}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>
    );
};
