import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

interface TypewriterMarkdownProps {
    content: string;
    isTyping: boolean;
    fastMode?: boolean;
}

export function TypewriterMarkdown({ content, isTyping, fastMode = false }: TypewriterMarkdownProps) {
    const [displayedContent, setDisplayedContent] = useState('');

    useEffect(() => {
        if (!isTyping) {
            setDisplayedContent(content);
            return;
        }

        let i = displayedContent.length;
        if (i >= content.length) return;

        const baseSpeed = fastMode ? 8 : 15;
        const char = content[i];
        let delay = baseSpeed;
        let chunkSize = fastMode ? 2 : 1; // Process more chars at once in fastMode

        if (!fastMode) {
            if (char === '.' || char === '!' || char === '?') delay = baseSpeed * 15;
            else if (char === ',' || char === ';') delay = baseSpeed * 10;
            else if (char === ' ') delay = baseSpeed * 3;
            else delay = baseSpeed + (Math.random() * 10 - 5);
        }

        const timeoutId = setTimeout(() => {
            setDisplayedContent(content.substring(0, i + chunkSize));
        }, delay);

        return () => clearTimeout(timeoutId);
    }, [content, isTyping, displayedContent]);

    return (
        <div className="relative text-slate-700 leading-relaxed max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3 text-indigo-900" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium mt-4 mb-2 text-slate-800" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1.5" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5" {...props} />,
                    li: ({ node, ...props }) => <li className="marker:text-indigo-400" {...props} />,
                    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-2 transition-colors font-medium break-words" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                    code: ({ node, inline, ...props }: any) =>
                        inline
                            ? <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono text-sm border border-indigo-100 break-words" {...props} />
                            : <code className="block bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-sm overflow-x-auto my-4 shadow-sm" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-300 pl-4 py-2 italic text-slate-600 bg-indigo-50/50 rounded-r-lg my-4" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm"><table className="w-full text-left text-sm" {...props} /></div>,
                    thead: ({ node, ...props }) => <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-xs" {...props} />,
                    tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-100 bg-white" {...props} />,
                    tr: ({ node, ...props }) => <tr className="hover:bg-slate-50/50 transition-colors" {...props} />,
                    th: ({ node, ...props }) => <th className="px-4 py-3 whitespace-nowrap" {...props} />,
                    td: ({ node, ...props }) => <td className="px-4 py-3 align-top min-w-[120px]" {...props} />
                }}
            >
                {displayedContent}
            </ReactMarkdown>
            {isTyping && displayedContent.length < content.length && (
                <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block w-2.5 h-4 bg-indigo-500 ml-1 rounded-sm align-middle shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                />
            )}
        </div>
    );
}
