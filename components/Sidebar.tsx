

import React, { useState, useMemo } from 'react';
import type { Conversation, ModelName, ChatMode } from '../types';
import { HistoryIcon, PlusIcon, SearchIcon, StarIcon, TrashIcon } from './Icons';
import { CHAT_MODES } from '../constants';

interface SidebarProps {
    user: { email: string; } | null;
    onNewConversation: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onLoginClick: () => void;
    onLogoutClick: () => void;
    onDeleteConversation: (id: string) => void;
    onToggleFavorite: (id: string) => void;
}

const MODEL_DISPLAY_NAMES: Record<ModelName, string> = {
    'gemini-2.5-flash': 'Flashcore 1.0',
    'gemini-2.5-pro': 'Flashcore 1.0 Super',
    'gemini-2.5-flash-lite': 'Flashcore Lite',
};

const CHAT_MODE_ICONS: Record<ChatMode, React.ComponentType<{className?: string}>> = 
    CHAT_MODES.reduce((acc, mode) => {
        acc[mode.id] = mode.icon;
        return acc;
    }, {} as Record<ChatMode, React.ComponentType<{className?: string}>>);


const ConversationItem: React.FC<{
    convo: Conversation;
    isActive: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
}> = ({ convo, isActive, onSelect, onDelete, onToggleFavorite }) => {
    const ModeIcon = CHAT_MODE_ICONS[convo.mode];
    
    return (
        <div className="relative group">
            <button
                onClick={() => onSelect(convo.id)}
                className={`w-full text-left pr-16 pl-3 py-2 rounded-lg text-sm truncate transition-colors ${
                    isActive
                        ? 'bg-[rgb(var(--bg-accent-subtle))] text-[rgb(var(--text-accent))] font-semibold'
                        : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary))]'
                }`}
            >
                <div className="flex flex-col">
                    <span className="font-medium">{convo.title}</span>
                    {isActive && (
                        <div className="flex items-center text-xs mt-1 opacity-80">
                            {ModeIcon && <ModeIcon className="w-3.5 h-3.5 mr-1.5" />}
                            <span>{MODEL_DISPLAY_NAMES[convo.model]}</span>
                        </div>
                    )}
                </div>
            </button>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(convo.id); }}
                    className="p-1.5 text-[rgb(var(--text-secondary))] hover:text-yellow-500 rounded-md hover:bg-[rgb(var(--bg-tertiary))]"
                    title={convo.favorited ? "Unfavorite" : "Favorite"}
                >
                    <StarIcon className={`w-4 h-4 ${convo.favorited ? 'text-yellow-500 fill-current' : ''}`} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(convo.id); }}
                    className="p-1.5 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--danger))] rounded-md hover:bg-[rgb(var(--bg-tertiary))]"
                    title="Delete"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
    user,
    onNewConversation, 
    isOpen,
    conversations,
    activeConversationId,
    onSelectConversation,
    onLoginClick,
    onLogoutClick,
    onDeleteConversation,
    onToggleFavorite,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConversations = useMemo(() => 
        conversations.filter(c => 
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => b.timestamp - a.timestamp),
    [conversations, searchQuery]);

    const favoritedConversations = useMemo(() => filteredConversations.filter(c => c.favorited), [filteredConversations]);
    const recentConversations = useMemo(() => filteredConversations.filter(c => !c.favorited), [filteredConversations]);

    const renderConversationList = (list: Conversation[]) => (
        <ul className="space-y-1">
            {list.map(convo => (
                <li key={convo.id}>
                    <ConversationItem
                        convo={convo}
                        isActive={activeConversationId === convo.id}
                        onSelect={onSelectConversation}
                        onDelete={onDeleteConversation}
                        onToggleFavorite={onToggleFavorite}
                    />
                </li>
            ))}
        </ul>
    );

    return (
        <aside className={`flex flex-col bg-[rgb(var(--bg-secondary))] border-r border-[rgb(var(--border-primary))] transition-all duration-300 ${isOpen ? 'w-80 p-4' : 'w-0 p-0'} overflow-hidden`}>
            <div className="flex-shrink-0">
                {user ? (
                     <>
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[rgb(var(--accent-primary))] flex items-center justify-center text-[rgb(var(--accent-text))] font-bold text-lg">
                                {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-[rgb(var(--text-primary))]">{user.email.split('@')[0]}</p>
                                <p className="text-xs text-[rgb(var(--text-secondary))]">{user.email}</p>
                            </div>
                        </div>
                        <button onClick={onLogoutClick} className="text-sm text-[rgb(var(--danger))] hover:underline">Sair</button>
                    </>
                ) : (
                    <>
                         <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[rgb(var(--bg-tertiary))] flex items-center justify-center text-[rgb(var(--text-primary))] font-bold text-lg">
                                V
                            </div>
                            <div>
                                <p className="font-semibold text-[rgb(var(--text-primary))]">Visitante</p>
                                <p className="text-xs text-[rgb(var(--text-secondary))]">Modo Visitante</p>
                            </div>
                        </div>
                        <button onClick={onLoginClick} className="text-sm text-[rgb(var(--accent-primary))] hover:underline">Fazer Login</button>
                    </>
                )}
            </div>

            <div className="mt-8 flex-grow flex flex-col min-h-0">
                 <div className="flex-shrink-0">
                    <button onClick={onNewConversation} className="w-full flex items-center justify-center mb-3 py-2 px-4 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-secondary))] rounded-lg hover:bg-[rgb(var(--bg-tertiary))] transition-colors">
                        <PlusIcon className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">Nova Conversa</span>
                    </button>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--text-secondary))]" />
                        <input 
                            type="text" 
                            placeholder="Buscar no histórico..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-[rgb(var(--border-secondary))] rounded-lg focus:ring-[rgb(var(--accent-primary))] focus:border-[rgb(var(--accent-primary))] bg-[rgb(var(--bg-tertiary))] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-secondary))]"
                        />
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-4">
                    {favoritedConversations.length > 0 && (
                        <div>
                            <h3 className="px-3 text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Favoritos</h3>
                            {renderConversationList(favoritedConversations)}
                        </div>
                    )}
                     {recentConversations.length > 0 && (
                        <div>
                            <h3 className="px-3 text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Recentes</h3>
                            {renderConversationList(recentConversations)}
                        </div>
                    )}
                    {filteredConversations.length === 0 && (
                         <div className="flex-grow flex items-center justify-center h-full">
                            <p className="text-xs text-[rgb(var(--text-secondary))]">{searchQuery ? 'Nenhum resultado' : 'Nenhuma conversa ainda'}</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};