'use client';

import React, { useCallback, useRef, useState } from 'react';
import { MessageSquare, Send, ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    createdAt: number;
}

export interface ChatModel {
    id: string;
    name: string;
    provider: string;
    description?: string;
}

/** Models grouped by provider for professional dropdown */
const MODEL_GROUPS: { provider: string; models: ChatModel[] }[] = [
    {
        provider: 'OpenAI',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable, multimodal' },
            { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', description: 'Fast & affordable' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Large context, precise' },
            { id: 'o1', name: 'o1', provider: 'OpenAI', description: 'Advanced reasoning' },
            { id: 'o1-mini', name: 'o1 mini', provider: 'OpenAI', description: 'Efficient reasoning' },
        ],
    },
    {
        provider: 'Anthropic',
        models: [
            { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Balanced speed and quality' },
            { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Fast and compact' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Most capable' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', description: 'Strong general use' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Quick & efficient' },
        ],
    },
    {
        provider: 'Google',
        models: [
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Long context, powerful' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', description: 'Fast and capable' },
            { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'Google', description: 'Reliable general use' },
        ],
    },
    {
        provider: 'Mistral',
        models: [
            { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', description: 'Top-tier performance' },
            { id: 'mistral-small', name: 'Mistral Small', provider: 'Mistral', description: 'Efficient and fast' },
        ],
    },
];

const ALL_MODELS = MODEL_GROUPS.flatMap((g) => g.models);
const DEFAULT_MODEL = ALL_MODELS[0];

/** Engaging starter prompts for empty state */
const STARTER_PROMPTS = [
    'Explain quantum computing in simple terms',
    'Help me write a professional email',
    'Brainstorm creative ideas for a project',
    'Summarize a complex topic in 3 bullet points',
    'Draft an outline for a presentation',
    'Suggest improvements for this code',
    'Help me think through a difficult decision',
    'Translate this to another language',
];

export function AssistantChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<ChatModel>(DEFAULT_MODEL);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;

            const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: trimmed,
                createdAt: Date.now(),
            };
            setMessages((prev) => [...prev, userMessage]);
            setInput('');
            setIsLoading(true);

            await new Promise((r) => setTimeout(r, 800));
            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: `You said: "${trimmed}"\n\nThis is a placeholder response. Connect your API in settings to use **${selectedModel.name}** for real replies.`,
                createdAt: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
            scrollToBottom();
        },
        [isLoading, selectedModel.name, scrollToBottom]
    );

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            sendMessage(input);
        },
        [input, sendMessage]
    );

    const handleStarterClick = useCallback(
        (prompt: string) => {
            sendMessage(prompt);
        },
        [sendMessage]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
            }
        },
        [handleSubmit]
    );

    const isEmpty = messages.length === 0;

    /** Single input bar: model selector + textarea + send (reused in centered and bottom layout) */
    const InputBar = (
        <form
            onSubmit={handleSubmit}
            className={cn(
                'flex gap-2 items-end rounded-xl border border-border-default bg-bg-secondary',
                'focus-within:border-accent-blue/50 focus-within:ring-2 focus-within:ring-accent-blue/10 transition-shadow',
                'w-full max-w-3xl'
            )}
        >
            <div className="relative shrink-0">
                <button
                    type="button"
                    onClick={() => setModelDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 h-[44px] pl-3 pr-2.5 rounded-l-xl border-r border-border-default bg-bg-primary/50 hover:bg-bg-hover transition-colors text-[13px] font-medium text-text-primary min-w-0"
                >
                    <MessageSquare size={16} className="text-text-muted shrink-0" />
                    <span className="truncate max-w-[140px]">{selectedModel.name}</span>
                    <ChevronDown
                        size={14}
                        className={cn('text-text-muted shrink-0 transition-transform', modelDropdownOpen && 'rotate-180')}
                    />
                </button>
                {modelDropdownOpen && (
                    <>
                        <div className="fixed inset-0 z-10" aria-hidden onClick={() => setModelDropdownOpen(false)} />
                        <div className="absolute left-0 bottom-full mb-1 z-20 w-[280px] max-h-[320px] overflow-y-auto py-1 rounded-lg border border-border-default bg-bg-elevated shadow-lg">
                            {MODEL_GROUPS.map((group) => (
                                <div key={group.provider}>
                                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                                        {group.provider}
                                    </div>
                                    {group.models.map((model) => (
                                        <button
                                            key={model.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedModel(model);
                                                setModelDropdownOpen(false);
                                            }}
                                            className={cn(
                                                'w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors',
                                                selectedModel.id === model.id
                                                    ? 'bg-accent-blue-soft text-accent-blue'
                                                    : 'text-text-primary hover:bg-bg-hover'
                                            )}
                                        >
                                            <span className="text-[13px] font-medium">{model.name}</span>
                                            {model.description && (
                                                <span className="text-[11px] text-text-muted">{model.description}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Assistant…"
                rows={1}
                className="flex-1 min-h-[44px] max-h-[200px] resize-none bg-transparent px-4 py-3 text-[14px] text-text-primary placeholder:text-text-placeholder focus:outline-none"
                style={{ fieldSizing: 'content' }}
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="shrink-0 p-2.5 rounded-r-xl text-accent-blue hover:bg-accent-blue-soft disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label="Send"
            >
                <Send size={18} />
            </button>
        </form>
    );

    return (
        <div className="absolute inset-0 flex flex-col bg-bg-primary overflow-hidden">
            {isEmpty ? (
                /* Centered empty state: logo, title, starter prompts, input bar in center of screen */
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 min-h-0">
                    <div className="flex flex-col items-center w-full max-w-3xl">
                        <div className="w-14 h-14 rounded-2xl bg-bg-secondary border border-border-default flex items-center justify-center mb-6">
                            <MessageSquare size={28} className="text-text-muted" />
                        </div>
                        <h1 className="text-[22px] font-semibold text-text-primary mb-1">Assistant</h1>
                        <p className="text-[14px] text-text-secondary mb-8 text-center max-w-[400px]">
                            Choose a model and ask anything. Use a suggestion below or type your own message.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                            {STARTER_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => handleStarterClick(prompt)}
                                    disabled={isLoading}
                                    className="px-4 py-2.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-hover hover:border-border-light text-[13px] text-text-primary transition-colors disabled:opacity-50"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                        <div className="w-full flex justify-center">
                            {InputBar}
                        </div>
                        <p className="mt-3 text-[11px] text-text-muted text-center">
                            Press Enter to send, Shift+Enter for new line.
                        </p>
                    </div>
                </div>
            ) : (
                /* Conversation view: messages + fixed bottom input */
                <>
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="mx-auto max-w-3xl px-4 py-6">
                            <div className="space-y-6">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}
                                    >
                                        <div
                                            className={cn(
                                                'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                                                msg.role === 'user'
                                                    ? 'bg-accent-blue-soft'
                                                    : 'bg-bg-secondary border border-border-default'
                                            )}
                                        >
                                            {msg.role === 'user' ? (
                                                <User size={16} className="text-accent-blue" />
                                            ) : (
                                                <MessageSquare size={16} className="text-text-muted" />
                                            )}
                                        </div>
                                        <div
                                            className={cn(
                                                'flex-1 min-w-0 rounded-lg px-4 py-3 text-[14px] leading-relaxed',
                                                msg.role === 'user'
                                                    ? 'bg-accent-blue-soft text-text-primary'
                                                    : 'bg-bg-secondary border border-border-default text-text-primary'
                                            )}
                                        >
                                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-3">
                                        <div className="shrink-0 w-8 h-8 rounded-lg bg-bg-secondary border border-border-default flex items-center justify-center">
                                            <MessageSquare size={16} className="text-text-muted" />
                                        </div>
                                        <div className="flex-1 rounded-lg px-4 py-3 bg-bg-secondary border border-border-default">
                                            <span className="inline-flex gap-1">
                                                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0 border-t border-border-default bg-bg-primary px-4 py-4">
                        <div className="mx-auto flex justify-center">{InputBar}</div>
                        <p className="mx-auto max-w-3xl mt-2 text-[11px] text-text-muted text-center">
                            Press Enter to send, Shift+Enter for new line.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
