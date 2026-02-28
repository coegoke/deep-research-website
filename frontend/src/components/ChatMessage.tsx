import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Bot, User, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { ResearchingIndicator } from './ResearchingIndicator';
import { TypewriterMarkdown } from './TypewriterMarkdown';

interface ChatMessageProps {
    message: Message;
    isTyping?: boolean;
}

export function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [isReasoningOpen, setIsReasoningOpen] = useState(false);

    const links = (message.events || []).reduce((acc, event) => {
        if (event.type === 'links_found' && event.links) {
            const newLinks = event.links.filter(l => !acc.find(x => x.url === l.url));
            return [...acc, ...newLinks];
        }
        return acc;
    }, [] as { title: string; url: string }[]);

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
            <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                    {isUser ? (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                            <User size={20} />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-md">
                            <Bot size={22} />
                        </div>
                    )}
                </div>

                {/* Content Box */}
                <div className="flex-col max-w-full">
                    {!isUser && message.events && message.events.length > 0 && (
                        <ResearchingIndicator events={message.events} />
                    )}

                    {!isUser && message.reasoning && (
                        <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm transition-all duration-300">
                            <button
                                onClick={() => setIsReasoningOpen(!isReasoningOpen)}
                                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100/50 hover:text-indigo-600 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <BrainCircuit size={16} className={isReasoningOpen ? "text-indigo-500" : "text-slate-400"} />
                                    <span>AI Reasoning Process</span>
                                </div>
                                {isReasoningOpen ? (
                                    <ChevronUp size={16} className="text-slate-400" />
                                ) : (
                                    <ChevronDown size={16} className="text-slate-400" />
                                )}
                            </button>

                            <div
                                className={`transition-all duration-300 ease-in-out ${isReasoningOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="border-t border-slate-100 p-4 pt-3 text-sm text-slate-600 overflow-y-auto max-h-[600px] prose prose-sm max-w-none prose-p:font-mono prose-p:leading-relaxed prose-p:opacity-80">
                                    <TypewriterMarkdown content={message.reasoning} isTyping={isTyping && !message.content} fastMode={true} />
                                </div>
                            </div>
                        </div>
                    )}

                    {message.content && (
                        <div className={`p-5 rounded-2xl shadow-sm ${isUser
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none prose prose-slate prose-a:text-blue-600 max-w-none shadow-sm'
                            }`}>
                            {isUser ? (
                                <p className="whitespace-pre-wrap">{message.content}</p>
                            ) : (
                                <>
                                    <TypewriterMarkdown content={message.content} isTyping={isTyping} />
                                    {links.length > 0 && !isTyping && (
                                        <div className="mt-8 pt-6 border-t border-slate-100/60">
                                            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                                Sources
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {links.map((link, idx) => {
                                                    let domain = '';
                                                    try {
                                                        domain = new URL(link.url).hostname.replace('www.', '');
                                                    } catch (e) {
                                                        domain = 'link';
                                                    }
                                                    return (
                                                        <a
                                                            key={idx}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all text-left no-underline group"
                                                        >
                                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-indigo-400 transition-colors" />
                                                                {domain}
                                                            </span>
                                                            <span className="font-medium text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors">
                                                                {link.title || link.url}
                                                            </span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
