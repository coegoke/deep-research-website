import React from 'react';
import { AgentEvent } from '../types';
import { ChevronDown, ChevronRight, Search, FileText, CheckCircle2, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResearchingIndicatorProps {
    events: AgentEvent[];
}

export function ResearchingIndicator({ events }: ResearchingIndicatorProps) {
    const [expanded, setExpanded] = React.useState(false);

    if (events.length === 0) return null;

    const isDone = events.some(e => e.type === 'answer' || e.type === 'done');

    // Collect found links
    const links = events.reduce((acc, event) => {
        if (event.type === 'links_found' && event.links) {
            const newLinks = event.links.filter(l => !acc.find(x => x.url === l.url));
            return [...acc, ...newLinks];
        }
        return acc;
    }, [] as { title: string; url: string }[]);

    const latestStatus = events.filter(e => e.type === 'status').pop();
    const reasoningEvents = events.filter(e => e.type === 'reasoning');

    return (
        <div className="w-full flex-col flex mb-4 border border-blue-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300 hover:shadow-md">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 flex items-center justify-between bg-blue-50/50 hover:bg-blue-50 transition-colors"
            >
                <div className="flex items-center space-x-3">
                    {isDone ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            className="p-2.5 bg-gradient-to-br from-green-100 to-emerald-100 text-green-600 rounded-xl shadow-inner border border-green-200"
                        >
                            <CheckCircle2 size={18} />
                        </motion.div>
                    ) : (
                        <div className="relative p-2.5 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 rounded-xl overflow-hidden border border-indigo-100 shadow-inner">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            >
                                <Search size={18} />
                            </motion.div>
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                                animate={{ x: ['-200%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            />
                        </div>
                    )}
                    <span className="font-medium text-slate-700">
                        {isDone ? 'Research Complete' : (latestStatus?.message || 'Researching...')}
                    </span>
                </div>
                <div className="text-slate-400">
                    {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-t border-blue-100 bg-white overflow-hidden"
                    >
                        <div className="p-4 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">

                            {/* Reasoning Block */}
                            {reasoningEvents.length > 0 && (
                                <div className="mb-4 bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                                    <h4 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Lightbulb size={14} /> Agent Reasoning
                                    </h4>
                                    <div className="space-y-2">
                                        {reasoningEvents.map((ev, idx) => (
                                            <p key={idx} className="text-xs text-slate-600 leading-relaxed italic">
                                                "{ev.content}"
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <AnimatePresence>
                                    {events.map((event, idx) => {
                                        if (event.type === 'status') {
                                            return (
                                                <motion.div
                                                    key={`status-${idx}`}
                                                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                                    className="text-sm font-medium flex items-center gap-3 py-1"
                                                >
                                                    <div className="relative flex items-center justify-center w-4 h-4">
                                                        <motion.div
                                                            className="absolute w-2 h-2 rounded-full bg-indigo-400"
                                                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                                            transition={{ repeat: Infinity, duration: 2 }}
                                                        />
                                                        <div className="absolute w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                                    </div>
                                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-slate-600">
                                                        {event.message}
                                                    </span>
                                                </motion.div>
                                            )
                                        }
                                        if (event.type === 'tool_call') {
                                            return (
                                                <motion.div
                                                    key={`tool-${idx}`}
                                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                                    className="ml-4 text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-2"
                                                >
                                                    <FileText size={14} className="mt-0.5 text-blue-500 flex-shrink-0" />
                                                    <div className="break-all whitespace-pre-wrap">
                                                        <span className="font-semibold text-slate-700">{event.tool}</span>(
                                                        {JSON.stringify(event.args).substring(0, 100)}{JSON.stringify(event.args).length > 100 ? '...' : ''})
                                                    </div>
                                                </motion.div>
                                            )
                                        }
                                        return null;
                                    })}
                                </AnimatePresence>
                            </div>

                            {links.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                                    className="pt-3 border-t border-slate-100 mt-3"
                                >
                                    <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                        Searched {links.length} sites
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {links.map((link, idx) => {
                                            let domain = '';
                                            try {
                                                domain = new URL(link.url).hostname.replace('www.', '');
                                            } catch (e) {
                                                domain = 'link';
                                            }
                                            return (
                                                <div
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200"
                                                >
                                                    <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                        <Search size={8} className="text-slate-400" />
                                                    </div>
                                                    {domain}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
