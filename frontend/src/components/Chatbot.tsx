'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X, Loader2, Home, MapPin, BedDouble, Ruler, TrendingDown, TrendingUp, Minus, Sparkles, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PropertyRecommendation {
    id: number;
    title: string;
    price: number;
    price_formatted: string;
    location: string;
    rooms: string;
    area: number;
    property_type: string;
    condition: string | null;
    main_image_url: string | null;
    price_assessment: string | null;
    match_reasons: string[];
    score: number;
}

interface ChatMessage {
    type: 'user' | 'bot';
    content: string;
    recommendations?: PropertyRecommendation[];
    timestamp: Date;
}

interface Suggestion {
    text: string;
    icon?: React.ReactNode;
}

const SUGGESTIONS: Suggestion[] = [
    { text: "2+kk apartment in Praha 2 under 7 million", icon: <Home className="w-3 h-3" /> },
    { text: "Family house with garden", icon: <Home className="w-3 h-3" /> },
    { text: "Undervalued investment properties", icon: <TrendingDown className="w-3 h-3" /> },
    { text: "Modern flat with balcony and parking", icon: <BedDouble className="w-3 h-3" /> },
];

const QUICK_FILTERS = [
    { label: "Best deals", query: "Show me undervalued properties" },
    { label: "Large apartments", query: "3+1 or larger apartment" },
    { label: "With parking", query: "Property with parking space" },
    { label: "New construction", query: "New or renovated property" },
];

function PriceAssessmentBadge({ assessment }: { assessment: string | null }) {
    if (!assessment) return null;

    const config = {
        below_market: {
            label: 'Below Market',
            className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            icon: <TrendingDown className="w-3 h-3" />,
        },
        at_market: {
            label: 'Fair Price',
            className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            icon: <Minus className="w-3 h-3" />,
        },
        above_market: {
            label: 'Above Market',
            className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: <TrendingUp className="w-3 h-3" />,
        },
    };

    const style = config[assessment as keyof typeof config] || config.at_market;

    return (
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", style.className)}>
            {style.icon}
            {style.label}
        </span>
    );
}

function PropertyCard({ property }: { property: PropertyRecommendation }) {
    return (
        <Link href={`/properties/${property.id}`}>
            <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700">
                    {property.main_image_url ? (
                        <img
                            src={property.main_image_url}
                            alt={property.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Home className="w-8 h-8" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {property.title}
                        </h4>
                    </div>
                    <p className="text-primary dark:text-primary-400 font-bold text-sm">
                        {property.price_formatted}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {property.location}
                        </span>
                        <span className="flex items-center gap-1">
                            <BedDouble className="w-3 h-3" />
                            {property.rooms}
                        </span>
                        <span className="flex items-center gap-1">
                            <Ruler className="w-3 h-3" />
                            {property.area}m²
                        </span>
                    </div>
                    <div className="mt-2">
                        <PriceAssessmentBadge assessment={property.price_assessment} />
                    </div>
                    {property.match_reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {property.match_reasons.slice(0, 2).map((reason, idx) => (
                                <span
                                    key={idx}
                                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded"
                                >
                                    {reason}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            type: 'bot',
            content: "Hello! I'm your AI property assistant. Tell me what you're looking for and I'll find the best matches for you.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const handleScroll = useCallback(() => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            type: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/v1/chatbot/recommend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage.content }),
            });

            if (!response.ok) {
                throw new Error('Failed to get recommendations');
            }

            const data = await response.json();

            const botMessage: ChatMessage = {
                type: 'bot',
                content: data.message,
                recommendations: data.recommendations,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: ChatMessage = {
                type: 'bot',
                content: "I'm sorry, I couldn't process your request. Please make sure the backend server is running and try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        inputRef.current?.focus();
    };

    const handleQuickFilter = async (query: string) => {
        setInput(query);
        // Auto-send after a brief delay
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.form?.requestSubmit();
            }
        }, 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearConversation = () => {
        setMessages([
            {
                type: 'bot',
                content: "Conversation cleared. How can I help you find your perfect property?",
                timestamp: new Date(),
            },
        ]);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl hover:scale-105 active:scale-95",
                    isOpen && "hidden"
                )}
            >
                <Sparkles className="h-5 w-5" />
                <span className="font-medium">AI Property Search</span>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-all duration-300",
                        isMinimized ? "h-[60px] w-[320px]" : "h-[600px] w-[420px]"
                    )}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-t-2xl cursor-pointer"
                        onClick={() => isMinimized && setIsMinimized(false)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">AI Property Assistant</h3>
                                {!isMinimized && (
                                    <p className="text-xs text-white/80">Powered by smart recommendations</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {!isMinimized && messages.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); clearConversation(); }}
                                    className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                    title="Clear conversation"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <ChevronDown className={cn("h-5 w-5 transition-transform", isMinimized && "rotate-180")} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Quick Filters */}
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {QUICK_FILTERS.map((filter, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuickFilter(filter.query)}
                                            disabled={isLoading}
                                            className="flex-shrink-0 text-xs bg-white dark:bg-slate-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-slate-700 dark:text-slate-300 hover:text-primary-700 dark:hover:text-primary-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 transition-colors disabled:opacity-50"
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Messages */}
                            <div
                                ref={messagesContainerRef}
                                onScroll={handleScroll}
                                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                            >
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex",
                                            message.type === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={cn("max-w-[90%]", message.type === 'bot' && "flex gap-2")}>
                                            {message.type === 'bot' && (
                                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mt-1">
                                                    <Sparkles className="w-4 h-4 text-primary" />
                                                </div>
                                            )}
                                            <div>
                                                <div
                                                    className={cn(
                                                        "rounded-2xl px-4 py-2.5",
                                                        message.type === 'user'
                                                            ? "bg-primary text-white rounded-br-md"
                                                            : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white rounded-bl-md"
                                                    )}
                                                >
                                                    <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>

                                                    {/* Recommendations */}
                                                    {message.recommendations && message.recommendations.length > 0 && (
                                                        <div className="mt-3 space-y-2">
                                                            {message.recommendations.map((property) => (
                                                                <PropertyCard key={property.id} property={property} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className={cn(
                                                    "text-[10px] mt-1 text-slate-400",
                                                    message.type === 'user' ? "text-right" : "text-left ml-1"
                                                )}>
                                                    {formatTime(message.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="flex gap-2">
                                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                            </div>
                                            <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 dark:bg-slate-800">
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span className="text-sm">Finding the best properties...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Scroll to bottom button */}
                            {showScrollButton && (
                                <button
                                    onClick={scrollToBottom}
                                    className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-700 shadow-lg rounded-full p-2 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                                </button>
                            )}

                            {/* Suggestions */}
                            {messages.length <= 2 && (
                                <div className="px-4 pb-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Try asking:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {SUGGESTIONS.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionClick(suggestion.text)}
                                                className="flex items-center gap-1.5 text-xs bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2.5 py-1.5 rounded-full transition-colors"
                                            >
                                                {suggestion.icon}
                                                <span className="truncate max-w-[160px]">{suggestion.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input */}
                            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="border-t border-slate-200 p-4 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Describe your ideal property..."
                                        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 transition-all"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary-dark hover:scale-105 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:scale-100 dark:disabled:bg-slate-700"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
