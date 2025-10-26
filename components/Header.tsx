
import React, { useState, useEffect, useRef } from 'react';
import { MenuIcon, SettingsIcon, TranslateIcon, ChevronDownIcon, CheckIcon } from './Icons';
import type { ModelName } from '../types';

interface HeaderProps {
    onMenuClick: () => void;
    onSettingsClick: () => void;
    selectedModel: ModelName;
    onModelChange: (model: ModelName) => void;
}

const MODEL_DETAILS: Record<ModelName, { name: string; description: string }> = {
    'gemini-2.5-flash': {
        name: 'Flashcore 1.0',
        description: 'For quick answers',
    },
    'gemini-2.5-pro': {
        name: 'Flashcore 1.0 Super',
        description: 'For advanced math, coding, etc.',
    },
    'gemini-2.5-flash-lite': {
        name: 'Flashcore Lite',
        description: 'For low-latency responses',
    },
};


export const Header: React.FC<HeaderProps> = ({ onMenuClick, onSettingsClick, selectedModel, onModelChange }) => {
    const [isApiConfigured, setIsApiConfigured] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (process.env.API_KEY && process.env.API_KEY.length > 0) {
            setIsApiConfigured(true);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleModelSelect = (model: ModelName) => {
        onModelChange(model);
        setIsDropdownOpen(false);
    };

    return (
        <header className="flex-shrink-0 h-16 bg-[rgb(var(--bg-secondary))] border-b border-[rgb(var(--border-primary))] flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
                <button onClick={onMenuClick} className="p-1 text-[rgb(var(--text-secondary))] rounded-full hover:bg-[rgb(var(--bg-tertiary))]">
                    <MenuIcon className="h-6 w-6" />
                </button>
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-[rgb(var(--bg-tertiary))]">
                        <h1 className="text-lg font-bold text-[rgb(var(--text-primary))]">{MODEL_DETAILS[selectedModel]?.name || 'Select Model'}</h1>
                        <ChevronDownIcon className={`h-5 w-5 text-[rgb(var(--text-secondary))] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                         <div className="absolute top-full mt-2 w-72 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-primary))] rounded-lg shadow-xl z-10">
                            <ul className="p-2">
                                {Object.entries(MODEL_DETAILS).map(([modelId, details]) => (
                                    <li key={modelId}>
                                        <button 
                                            onClick={() => handleModelSelect(modelId as ModelName)}
                                            className="w-full flex items-center justify-between text-left p-3 rounded-md hover:bg-[rgb(var(--bg-tertiary))]"
                                        >
                                            <div>
                                                <p className="font-semibold text-[rgb(var(--text-primary))]">{details.name}</p>
                                                <p className="text-xs text-[rgb(var(--text-secondary))]">{details.description}</p>
                                            </div>
                                            {selectedModel === modelId && (
                                                <CheckIcon className="h-5 w-5 text-[rgb(var(--accent-primary))]" />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={onSettingsClick} className="p-2 text-[rgb(var(--text-secondary))] rounded-full hover:bg-[rgb(var(--bg-tertiary))]">
                    <SettingsIcon className="h-5 w-5" />
                </button>
                <button onClick={() => alert('Translate clicked!')} className="p-2 text-[rgb(var(--text-secondary))] rounded-full hover:bg-[rgb(var(--bg-tertiary))]">
                    <TranslateIcon className="h-5 w-5" />
                </button>
                <div className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-[rgb(var(--text-primary))] bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border-secondary))] rounded-lg">
                    <span className="relative flex h-2 w-2">
                        {isApiConfigured ? (
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        ) : (
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                        )}
                    </span>
                    <span>{isApiConfigured ? 'API OK' : 'API Não configurada'}</span>
                </div>
            </div>
        </header>
    );
};