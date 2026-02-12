import React, { useState, useEffect, useRef } from 'react';
import { SendHorizontal, Paperclip, FileText, Image, Mic, X, ChevronLeft, MoreVertical, Phone, Video } from 'lucide-react';

export const MerrecaChatMobile = ({ onClose, messages, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);

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

        // Play sending sound (optional)
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed", e));
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-[#E5DDD5] flex flex-col font-sans animate-in slide-in-from-right duration-300">
            {/* WhatsApp Header */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full text-white">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/20">
                            <img src="./logo.png" alt="M" className="w-8 h-8 object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-bold text-base leading-tight">Merreca ✨</h3>
                            <p className="text-[11px] text-white/80">Online agora</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-white">
                    <Video size={22} className="opacity-80" />
                    <Phone size={20} className="opacity-80" />
                    <MoreVertical size={20} className="opacity-80" />
                </div>
            </div>

            {/* Messages Area (WhatsApp Background) */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5]"
                style={{
                    backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                    backgroundBlendMode: "overlay",
                    backgroundRepeat: "repeat"
                }}
            >
                {/* Encryption Notice */}
                <div className="flex justify-center mb-6">
                    <div className="bg-[#FFFCF3] text-slate-500 text-[10px] px-3 py-1.5 rounded-lg shadow-sm text-center max-w-[80%] border border-[#F1F1F0]">
                        As mensagens são protegidas por criptografia de ponta a ponta. Ninguém fora dessa conversa pode lê-las.
                    </div>
                </div>

                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                            <div
                                className={`
                                    max-w-[80%] px-3 py-1.5 rounded-lg shadow-sm relative text-sm leading-relaxed
                                    ${isUser ? 'bg-[#D9FDD3] text-black rounded-tr-none' : 'bg-white text-black rounded-tl-none'}
                                `}
                            >
                                {/* Message Tail (CSS Hack) */}
                                <div className={`absolute top-0 w-0 h-0 border-8 ${isUser ? '-right-2 border-l-[#D9FDD3] border-t-transparent border-b-transparent border-r-transparent' : '-left-2 border-r-white border-t-transparent border-b-transparent border-l-transparent'}`}></div>

                                {msg.content}

                                <div className="text-[9px] text-gray-400 text-right mt-1 flex items-center justify-end gap-1">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isUser && <span className="text-[#53BDEB]">✓✓</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#F0F2F5] px-2 py-2 flex items-end gap-2 shrink-0 pb-6 lg:pb-2">
                <button className="p-3 bg-white hover:bg-gray-100 rounded-full text-slate-500 transition-colors shadow-sm mb-1">
                    <Paperclip size={20} />
                </button>

                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center px-4 py-1.5 min-h-[50px] mb-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Mensagem"
                        className="w-full bg-transparent outline-none text-slate-700 text-base placeholder:text-slate-400"
                    />
                    <button className="text-slate-400 mr-2"><FileText size={20} /></button>
                    <button className="text-slate-400"><Image size={20} /></button>
                </div>

                <div className="mb-1">
                    {input.trim() ? (
                        <button
                            onClick={handleSend}
                            className="w-12 h-12 bg-[#00A884] rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
                        >
                            <SendHorizontal size={20} className="ml-0.5" />
                        </button>
                    ) : (
                        <button
                            className="w-12 h-12 bg-[#00A884] rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
                        >
                            <Mic size={20} />
                        </button>
                    )}
                </div>
            </div>

            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3" className="hidden"></audio>
        </div>
    );
};
