import React, { useState, useRef, useEffect } from 'react';
import { Message, AgentEvent } from './types';
import { ChatMessage } from './components/ChatMessage';
import { streamChat } from './api';
import { Send, Loader2, Sparkles, Code, Brain } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your Deep Research AI Assistant. What would you like me to research today? I will search the web, read pages, and synthesize information for you.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const botMsgId = (Date.now() + 1).toString();

    // Add initial bot placeholder
    setMessages(prev => [...prev, {
      id: botMsgId,
      role: 'assistant',
      content: '',
      events: []
    }]);

    streamChat(
      userMsg.content,
      (event: AgentEvent) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const botMsgIndex = newMessages.findIndex(m => m.id === botMsgId);
          if (botMsgIndex === -1) return prev;

          const botMsg = { ...newMessages[botMsgIndex] };
          if (!botMsg.events) botMsg.events = [];

          if (event.type === 'answer') {
            botMsg.content = event.content || '';
          } else if (event.type === 'reasoning') {
            botMsg.reasoning = (botMsg.reasoning || '') + (event.content || '');
            // Do NOT append reasoning to events list to prevent duplicate UI rendering
          } else {
            // For non-answer events, append to events array to show in Researching component
            botMsg.events = [...botMsg.events, event];
          }

          newMessages[botMsgIndex] = botMsg;
          return newMessages;
        });
      },
      () => {
        setMessages(prev => {
          const newMessages = [...prev];
          const botMsgIndex = newMessages.findIndex(m => m.id === botMsgId);
          if (botMsgIndex !== -1) {
            newMessages[botMsgIndex].events = [...(newMessages[botMsgIndex].events || []), { type: 'done' as any }];
          }
          return newMessages;
        });
        setIsTyping(false);
      },
      (errError) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const botMsgIndex = newMessages.findIndex(m => m.id === botMsgId);
          if (botMsgIndex !== -1) {
            newMessages[botMsgIndex].content = `**Error:** An error occurred during research -> ${errError}`;
          }
          return newMessages;
        });
        setIsTyping(false);
      }
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-indigo-50 px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 w-1/3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-0.5 shadow-md">
            <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
              <Sparkles className="text-indigo-600" size={20} />
            </div>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight">
            Deep Research AI
          </h1>
        </div>
        <div className="hidden md:flex items-center justify-center gap-6 w-1/3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Brain size={14} /> Agentic
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Code size={14} /> MCP Linked
          </div>
        </div>
        <div className="w-1/3 flex justify-end">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600 transition-colors">
            Help
          </a>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 md:px-0 bg-[#fbfcfd]">
        <div className="max-w-4xl mx-auto py-8">
          {messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isTyping={isTyping && index === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-indigo-50 px-4 py-6 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto flex gap-4 pr-[2px]">
          <form
            onSubmit={handleSubmit}
            className="flex-1 relative group"
          >
            <textarea
              className="w-full bg-indigo-50/30 border border-indigo-100 placeholder:text-slate-400 text-slate-800 rounded-3xl pt-4 pb-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white transition-all resize-none shadow-sm hover:shadow-md"
              placeholder="What would you like me to deeply research for you today?"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="absolute right-3 top-3 bottom-3 aspect-square bg-indigo-600 text-white rounded-2xl flex items-center justify-center transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg disabled:hover:shadow-none"
            >
              {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
            </button>
            <div className="absolute top-[85px] left-6 text-xs text-slate-400">
              Press <kbd className="font-sans px-1 py-0.5 border border-slate-200 rounded-md bg-slate-50">Enter</kbd> to submit, <kbd className="font-sans px-1 py-0.5 border border-slate-200 rounded-md bg-slate-50">Shift</kbd> + <kbd className="font-sans px-1 py-0.5 border border-slate-200 rounded-md bg-slate-50">Enter</kbd> for new line
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default App;
