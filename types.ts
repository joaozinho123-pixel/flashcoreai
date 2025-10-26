import type React from 'react';

export interface FileAttachment {
  name: string;
  mimeType: string;
  base64: string;
}
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  file?: {
    name: string;
    type: string;
    data: string;
  };
  groundingChunks?: GroundingChunk[];
}

export type ChatMode = 'code' | 'education' | 'daily' | 'absolute';

export interface ChatModeInfo {
  id: ChatMode;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  systemInstruction: string;
}

export type ModelName = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.5-flash-lite';

export interface Conversation {
  id: string;
  title: string;
  timestamp: number;
  mode: ChatMode;
  messages: Message[];
  model: ModelName;
  favorited?: boolean;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets: {
            uri: string;
            title: string;
            snippet: string;
        }[];
    }[];
  };
}

export type Theme = 'light' | 'dark' | 'rose' | 'forest' | 'midnight';

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";