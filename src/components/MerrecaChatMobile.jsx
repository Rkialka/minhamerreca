import React, { useState, useEffect, useRef } from 'react';
import { SendHorizontal, Paperclip, ChevronLeft, Sparkles, Mic, Camera, FileText, BarChart3, Share2, Download } from 'lucide-react';

// --- Rich message renderer: handles **bold**, - bullets, numbered lists, line breaks ---
const FormattedMessage = ({ content, isUser }) => {
    const lines = content.split('\n');

    const renderInline = (text, keyPrefix) => {
        // Handle **bold** segments
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={`${keyPrefix}-${i}`} className="font-black">{part.slice(2, -2)}</strong>;
            }
            return <span key={`${keyPrefix}-${i}`}>{part}</span>;
        });
    };

    const elements = [];
    let listItems = [];
    let listType = null; // 'bullet' or 'number'

    const flushList = () => {
        if (listItems.length > 0) {
            if (listType === 'number') {
                elements.push(
                    <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2 ml-1">
                        {listItems.map((item, i) => (
                            <li key={i} className="flex gap-2 items-start">
                                <span className={`font-black text-xs mt-0.5 shrink-0 ${isUser ? 'text-white/70' : 'text-[#8E44AD]'}`}>{item.num}.</span>
                                <span>{renderInline(item.text, `li-${elements.length}-${i}`)}</span>
                            </li>
                        ))}
                    </ol>
                );
            } else {
                elements.push(
                    <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2 ml-1">
                        {listItems.map((item, i) => (
                            <li key={i} className="flex gap-2 items-start">
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isUser ? 'bg-white/50' : 'bg-[#8E44AD]'}`}></span>
                                <span>{renderInline(item.text, `li-${elements.length}-${i}`)}</span>
                            </li>
                        ))}
                    </ul>
                );
            }
            listItems = [];
            listType = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Numbered list: "1. text", "2. text" etc
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
            if (listType !== 'number') flushList();
            listType = 'number';
            listItems.push({ num: numMatch[1], text: numMatch[2] });
            continue;
        }

        // Bullet list: "- text" or "• text"
        const bulletMatch = trimmed.match(/^[-•]\s+(.+)/);
        if (bulletMatch) {
            if (listType !== 'bullet') flushList();
            listType = 'bullet';
            listItems.push({ text: bulletMatch[1] });
            continue;
        }

        // Not a list item -> flush any pending list
        flushList();

        // Empty line = spacer
        if (!trimmed) {
            elements.push(<div key={`sp-${i}`} className="h-2" />);
            continue;
        }

        // Regular text line
        elements.push(
            <p key={`p-${i}`} className="leading-relaxed">
                {renderInline(trimmed, `p-${i}`)}
            </p>
        );
    }

    flushList(); // flush any remaining list

    return <div className="space-y-0.5">{elements}</div>;
};

export const MerrecaChatMobile = ({ onClose, messages, onSendMessage, isLoading, onFileUpload, onVoice, isListening, onShareWhatsApp, onExportReport }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    const showChips = messages.length <= 2;

    const chips = [
        { icon: FileText, label: 'Importar extrato', color: 'from-blue-500 to-blue-600', action: () => fileInputRef.current?.click() },
        { icon: Camera, label: 'Fotografar recibo', color: 'from-amber-500 to-orange-500', action: () => cameraInputRef.current?.click() },
        { icon: Mic, label: 'Falar com a Merreca', color: 'from-purple-500 to-purple-600', action: onVoice },
        { icon: BarChart3, label: 'Relatório do mês', color: 'from-emerald-500 to-green-600', action: () => onSendMessage('Gere um relatório completo e detalhado do mês atual com análise de gastos por categoria, comparativo com mês anterior e dicas de economia.') },
        { icon: Share2, label: 'Compartilhar no WhatsApp', color: 'from-green-500 to-green-600', action: onShareWhatsApp },
    ];

    const isReportMessage = (content) => {
        return content && content.length > 300 && (content.includes('Relatório') || content.includes('relatório') || content.includes('RELATÓRIO'));
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col font-outfit animate-in slide-in-from-right duration-300">
            {/* Clean Header */}
            <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-gray-50 transition-all">
                        <ChevronLeft size={22} />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8E44AD] to-[#9B59B6] flex items-center justify-center shadow-sm">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-slate-800 tracking-tight">Merreca</h3>
                            <p className="text-[11px] font-bold text-[#8E44AD] uppercase tracking-widest">Consultora IA</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gray-50/50">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={idx}>
                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                {!isUser && (
                                    <div className="w-7 h-7 rounded-lg bg-[#8E44AD] flex items-center justify-center mr-2 mt-1 shrink-0">
                                        <Sparkles size={14} className="text-white" />
                                    </div>
                                )}
                                <div
                                    className={`
                                        max-w-[85%] px-4 py-3 text-[13px]
                                        ${isUser
                                            ? 'bg-[#8E44AD] text-white rounded-2xl rounded-tr-md font-bold'
                                            : 'bg-white text-slate-700 rounded-2xl rounded-tl-md border border-gray-100 shadow-sm font-medium'
                                        }
                                    `}
                                >
                                    <FormattedMessage content={msg.content} isUser={isUser} />
                                </div>
                            </div>
                            {/* Export PDF button for report messages */}
                            {!isUser && isReportMessage(msg.content) && onExportReport && (
                                <div className="flex justify-start ml-9 mt-2">
                                    <button
                                        onClick={() => onExportReport(msg.content)}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#8E44AD]/10 text-[#8E44AD] rounded-xl text-xs font-bold hover:bg-[#8E44AD]/20 transition-all active:scale-95"
                                    >
                                        <Download size={14} />
                                        Exportar como PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Suggestion Chips */}
                {showChips && !isLoading && (
                    <div className="py-2">
                        <p className="text-xs font-bold text-slate-400 mb-3 ml-1">Sugestões rápidas</p>
                        <div className="flex flex-wrap gap-2">
                            {chips.map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={chip.action}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-slate-600 hover:border-[#8E44AD] hover:text-[#8E44AD] transition-all active:scale-95 shadow-sm"
                                >
                                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${chip.color} flex items-center justify-center`}>
                                        <chip.icon size={13} className="text-white" />
                                    </div>
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="w-7 h-7 rounded-lg bg-[#8E44AD] flex items-center justify-center mr-2 shrink-0">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div className="bg-white px-5 py-4 rounded-2xl rounded-tl-md border border-gray-100 shadow-sm flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-[#8E44AD]/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-[#8E44AD]/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-[#8E44AD]/40 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileUpload}
                accept="image/*,application/pdf,.xls,.xlsx,.ofx"
            />
            <input
                ref={cameraInputRef}
                type="file"
                className="hidden"
                onChange={onFileUpload}
                accept="image/*"
                capture="environment"
            />

            {/* Clean Input Area */}
            <div className="bg-white px-4 py-3 border-t border-gray-100 shrink-0 pb-8 lg:pb-3">
                <div className="flex items-center gap-2">
                    <label className="p-2.5 rounded-xl text-slate-400 hover:text-[#8E44AD] hover:bg-purple-50 cursor-pointer transition-all shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip size={20} />
                    </label>

                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-[#8E44AD] focus-within:ring-2 focus-within:ring-[#8E44AD]/10 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Pergunte à Merreca..."
                            className="w-full bg-transparent px-4 py-3 outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
                        />
                    </div>

                    {/* Mic button */}
                    {onVoice && (
                        <button
                            onClick={onVoice}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                isListening
                                    ? 'bg-[#8E44AD] text-white shadow-md animate-pulse'
                                    : 'text-slate-400 hover:text-[#8E44AD] hover:bg-purple-50'
                            }`}
                        >
                            <Mic size={20} />
                        </button>
                    )}

                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="w-11 h-11 bg-[#8E44AD] rounded-xl flex items-center justify-center text-white shadow-md active:scale-95 transition-all disabled:opacity-30 shrink-0"
                    >
                        <SendHorizontal size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
