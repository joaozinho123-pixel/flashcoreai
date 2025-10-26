
import React, { useState, useMemo, useEffect } from 'react';
import type { Theme, ChatMode, Conversation } from '../types';
import { CloseIcon, UserCircleIcon, BrainIcon, ImageIcon, PaintBrushIcon, InfoIcon, AbsoluteIcon, SaveIcon, CheckIcon } from './Icons';
import { CHAT_MODES } from '../constants';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    aiMemory: string;
    setAiMemory: (memory: string) => void;
    activeMode: ChatMode;
    onModeChange: (mode: ChatMode) => void;
    conversations: Conversation[];
    user: { email: string } | null;
    onLogoutClick: () => void;
}

type Tab = 'modes' | 'personalization' | 'account' | 'memory' | 'gallery' | 'about';

const TABS: { id: Tab; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'modes', name: 'Modos de Chat', icon: AbsoluteIcon },
    { id: 'personalization', name: 'Personalização', icon: PaintBrushIcon },
    { id: 'account', name: 'Conta', icon: UserCircleIcon },
    { id: 'memory', name: 'Memória', icon: BrainIcon },
    { id: 'gallery', name: 'Galeria', icon: ImageIcon },
    { id: 'about', name: 'Sobre', icon: InfoIcon },
];

const THEME_OPTIONS: { id: Theme, name: string, colors: string[] }[] = [
    { id: 'light', name: 'Claro', colors: ['bg-gray-100', 'bg-white', 'bg-blue-600'] },
    { id: 'dark', name: 'Escuro', colors: ['bg-gray-900', 'bg-gray-800', 'bg-blue-600'] },
    { id: 'rose', name: 'Rosé', colors: ['bg-rose-50', 'bg-white', 'bg-rose-600'] },
    { id: 'forest', name: 'Floresta', colors: ['bg-green-50', 'bg-white', 'bg-green-600'] },
    { id: 'midnight', name: 'Meia-noite', colors: ['bg-stone-900', 'bg-stone-800', 'bg-violet-500'] },
];

const ChatModeButton: React.FC<{
    info: typeof CHAT_MODES[0],
    isActive: boolean,
    onClick: () => void
}> = ({ info, isActive, onClick }) => {
    const baseClasses = "flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 aspect-square";
    const activeClasses = "bg-[rgb(var(--bg-accent-subtle))] border-2 border-[rgb(var(--border-accent))] shadow-lg";
    const inactiveClasses = "bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-primary))] hover:bg-[rgb(var(--bg-tertiary))] hover:shadow-md";
    
    return (
        <div 
            onClick={onClick}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            <info.icon className="h-8 w-8 mb-2" />
            <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">{info.name}</span>
        </div>
    );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    theme, 
    setTheme,
    aiMemory,
    setAiMemory,
    activeMode,
    onModeChange,
    conversations,
    user,
    onLogoutClick
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('personalization');
    const [localAiMemory, setLocalAiMemory] = useState(aiMemory);
    
    useEffect(() => {
        if(isOpen) {
            setLocalAiMemory(aiMemory);
        }
    }, [isOpen, aiMemory]);

    const handleSave = () => {
        setAiMemory(localAiMemory);
        onClose();
    };

    const imageMessages = useMemo(() => {
        if (activeTab !== 'gallery') return [];
        return conversations.flatMap(convo => 
            convo.messages.filter(msg => msg.file && msg.file.type.startsWith('image/'))
        );
    }, [conversations, activeTab]);

    if (!isOpen) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'modes':
                 const activeModeDetails = CHAT_MODES.find(m => m.id === activeMode);
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Modos de Chat</h3>
                        <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Selecione um modo para iniciar uma nova conversa especializada.</p>
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {CHAT_MODES.map(mode => (
                                <ChatModeButton 
                                    key={mode.id}
                                    info={mode}
                                    isActive={activeMode === mode.id}
                                    onClick={() => {
                                        onModeChange(mode.id);
                                        onClose();
                                    }}
                                />
                            ))}
                        </div>
                        <div className="mt-4 p-3 bg-[rgb(var(--bg-tertiary))] rounded-lg min-h-[70px]">
                            <h4 className="font-semibold text-[rgb(var(--text-primary))]">{activeModeDetails?.name}</h4>
                            <p className="text-xs text-[rgb(var(--text-secondary))]">
                                {activeModeDetails?.description}
                            </p>
                        </div>
                    </div>
                );
            case 'personalization':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Tema do Aplicativo</h3>
                        <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Escolha sua paleta de cores favorita.</p>
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                           {THEME_OPTIONS.map(option => (
                               <div key={option.id} onClick={() => setTheme(option.id)} className="cursor-pointer">
                                   <div className={`relative w-full aspect-video rounded-lg border-2 p-2 flex space-x-1 ${theme === option.id ? 'border-[rgb(var(--border-accent))]' : 'border-[rgb(var(--border-primary))]'}`}>
                                       {option.colors.map((colorClass, index) => (
                                           <div key={index} className={`flex-1 h-full rounded ${colorClass}`}></div>
                                       ))}
                                       {theme === option.id && (
                                           <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[rgb(var(--accent-primary))] flex items-center justify-center">
                                               <CheckIcon className="w-4 h-4 text-[rgb(var(--accent-text))]" />
                                           </div>
                                       )}
                                   </div>
                                   <p className="mt-2 text-sm text-center font-medium text-[rgb(var(--text-primary))]">{option.name}</p>
                               </div>
                           ))}
                        </div>
                    </div>
                );
            case 'account':
                return (
                     <div>
                        <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Conta</h3>
                         <div className="mt-4 p-4 border rounded-lg border-[rgb(var(--border-primary))]">
                           {user ? (
                                <>
                                    <div className="flex items-center space-x-4">
                                       <div className="w-16 h-16 rounded-full bg-[rgb(var(--accent-primary))] flex items-center justify-center text-[rgb(var(--accent-text))] font-bold text-3xl">
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-xl text-[rgb(var(--text-primary))]">{user.email.split('@')[0]}</p>
                                            <p className="text-sm text-[rgb(var(--text-secondary))]">{user.email}</p>
                                            <p className="mt-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full inline-block">Usuário Logado</p>
                                        </div>
                                    </div>
                                    <button onClick={onLogoutClick} className="mt-4 w-full py-2 px-4 bg-[rgb(var(--danger))] text-white rounded-lg hover:bg-[rgb(var(--danger-hover))] transition-colors">
                                        Sair
                                    </button>
                                </>
                           ) : (
                                <p className="text-center text-sm text-[rgb(var(--text-secondary))]">Nenhum usuário logado.</p>
                           )}
                        </div>
                    </div>
                );
            case 'memory':
                 return (
                    <div>
                        <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Memória da IA</h3>
                        <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
                            Forneça instruções persistentes para a IA usar em todas as conversas.
                        </p>
                        <textarea
                            value={localAiMemory}
                            onChange={(e) => setLocalAiMemory(e.target.value)}
                            rows={8}
                            className="w-full mt-4 p-3 border border-[rgb(var(--border-secondary))] rounded-lg bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-primary))] focus:ring-2 focus:ring-[rgb(var(--accent-primary))] focus:outline-none"
                            placeholder="Ex: 'Meu nome é João e eu sou um desenvolvedor de software. Sempre me responda em português.'"
                        />
                         <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">Clique em 'Salvar' para aplicar as mudanças.</p>
                    </div>
                );
            case 'gallery':
                return (
                     <div>
                        <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Galeria de Imagens</h3>
                        <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
                            Todas as imagens das suas conversas.
                        </p>
                        {imageMessages.length > 0 ? (
                             <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {imageMessages.map(msg => (
                                    <div key={msg.id} className="aspect-square bg-[rgb(var(--bg-tertiary))] rounded-lg overflow-hidden">
                                        <img 
                                            src={`data:${msg.file?.type};base64,${msg.file?.data}`} 
                                            alt={msg.file?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 text-center text-[rgb(var(--text-secondary))]">
                                Nenhuma imagem encontrada nas suas conversas.
                            </div>
                        )}
                    </div>
                );
            case 'about':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Sobre o Flashcore</h3>
                        <p className="text-[rgb(var(--text-secondary))] mt-2">Um assistente de IA inteligente para todas as suas necessidades, construído com a API Google Gemini.</p>
                        <p className="text-sm text-[rgb(var(--text-secondary))] mt-4">Versão 1.0.0</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" style={{ opacity: isOpen ? 1 : 0 }}>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-2xl shadow-2xl w-full max-w-4xl h-full max-h-[600px] flex flex-col overflow-hidden transition-transform duration-300" style={{ transform: isOpen ? 'scale(1)' : 'scale(0.95)' }}>
                <header className="flex items-center justify-between p-4 border-b border-[rgb(var(--border-primary))] flex-shrink-0">
                    <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Configurações</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary))]">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <nav className="w-1/4 border-r border-[rgb(var(--border-primary))] p-4">
                        <ul className="space-y-1">
                            {TABS.map(tab => (
                                <li key={tab.id}>
                                    <button 
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                                            activeTab === tab.id 
                                                ? 'bg-[rgb(var(--bg-accent-subtle))] text-[rgb(var(--text-accent))]' 
                                                : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary))] hover:text-[rgb(var(--text-primary))]'
                                        }`}
                                    >
                                        <tab.icon className="w-5 h-5 flex-shrink-0" />
                                        <span>{tab.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <main className="flex-1 p-6 overflow-y-auto">
                        {renderContent()}
                    </main>
                </div>
                 <footer className="flex items-center justify-end p-4 border-t border-[rgb(var(--border-primary))] flex-shrink-0 space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[rgb(var(--text-primary))] bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-secondary))] rounded-lg hover:bg-[rgb(var(--bg-tertiary))]">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-[rgb(var(--accent-text))] bg-[rgb(var(--accent-primary))] border border-transparent rounded-lg hover:bg-[rgb(var(--accent-secondary))] flex items-center space-x-2">
                        <SaveIcon className="w-5 h-5"/>
                        <span>Salvar</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};
