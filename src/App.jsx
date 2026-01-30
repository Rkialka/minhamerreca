import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Lock, ArrowUp, ArrowDown, Check, X,
    DollarSign, Receipt, ShoppingCart, Car, Heart, PartyPopper, ShoppingBag
} from 'lucide-react';
import { db } from './firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

// --- CONFIGURAÇÃO DE UI ---
const CATEGORIES = {
    'entrada': {
        icon: <DollarSign size={24} />,
        label: 'Dinheiro que Entrou',
        color: 'bg-[#2ECC71]', // Verde Prosperidade
        colorText: 'text-[#2ECC71]',
        type: 'receita'
    },
    'boletos': {
        icon: <Receipt size={24} />,
        label: 'Contas da Casa',
        color: 'bg-[#F1C40F]', // Amarelo Atenção
        colorText: 'text-[#F1C40F]',
        type: 'despesa'
    },
    'comida': {
        icon: <ShoppingCart size={24} />,
        label: 'Comida e Mercado',
        color: 'bg-[#3498DB]', // Azul
        colorText: 'text-[#3498DB]',
        type: 'despesa'
    },
    'transporte': {
        icon: <Car size={24} />,
        label: 'Uber / Transporte',
        color: 'bg-[#95A5A6]', // Cinza
        colorText: 'text-[#95A5A6]',
        type: 'despesa'
    },
    'saude': {
        icon: <Heart size={24} />,
        label: 'Saúde e Beleza',
        color: 'bg-[#E74C3C]', // Vermelho (mas usado como rosa/saude)
        colorText: 'text-[#E74C3C]',
        type: 'despesa'
    },
    'lazer': {
        icon: <PartyPopper size={24} />,
        label: 'Lazer e Rolê',
        color: 'bg-[#9B59B6]', // Roxo
        colorText: 'text-[#9B59B6]',
        type: 'despesa'
    },
    'outros': {
        icon: <ShoppingBag size={24} />,
        label: 'Comprinhas / Outros',
        color: 'bg-[#34495E]', // Grafite
        colorText: 'text-[#34495E]',
        type: 'despesa'
    }
};

export default function MinhaMerreca() {
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [view, setView] = useState('HOME'); // HOME, ENTRY
    const [transactions, setTransactions] = useState([]);
    const [feedback, setFeedback] = useState(null); // 'OK'
    const [loading, setLoading] = useState(true);

    // Form State
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);

    // --- FAXINA DE DADOS ANTIGOS (Executa uma vez após login) ---
    useEffect(() => {
        const cleanup = async () => {
            try {
                const q = query(collection(db, "transactions"));
                // Busca tudo uma vez para limpar
                onSnapshot(q, (snapshot) => {
                    snapshot.docs.forEach(snapshotDoc => {
                        const raw = snapshotDoc.data();
                        let d;
                        if (raw.createdAt?.toDate) d = raw.createdAt.toDate();
                        else if (raw.createdAt) d = new Date(raw.createdAt);
                        else if (raw.data) d = new Date(raw.data);
                        else d = new Date();

                        if (d.getFullYear() < 2026) {
                            deleteDoc(doc(db, "transactions", snapshotDoc.id)).catch(() => { });
                        }
                    });
                }, { onlyOnce: true }); // Executa apenas uma vez
            } catch (e) {
                console.error("Erro na faxina:", e);
            }
        };
        cleanup();
    }, []);

    // --- FIREBASE SYNC (ULTRA RESISTENTE) ---
    useEffect(() => {
        setLoading(true);

        const q = query(collection(db, "transactions"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const freshDocs = [];
                snapshot.docs.forEach(snapshotDoc => {
                    try {
                        const raw = snapshotDoc.data();
                        const id = snapshotDoc.id;

                        let d;
                        if (raw.createdAt?.toDate) d = raw.createdAt.toDate();
                        else if (raw.createdAt) d = new Date(raw.createdAt);
                        else if (raw.data) d = new Date(raw.data);
                        else d = new Date();

                        // Mostrar apenas 2026+ na tela
                        if (d.getFullYear() >= 2026) {
                            freshDocs.push({
                                id: id,
                                valor: Number(raw.valor || raw.amount || 0),
                                categoria: String(raw.categoria || raw.category || 'outros').toLowerCase(),
                                descricao: String(raw.descricao || raw.description || 'Sem descrição'),
                                tipo: raw.tipo || (raw.category === 'income' ? 'receita' : 'despesa'),
                                displayDate: d.toLocaleDateString('pt-BR'),
                                sortTime: d.getTime()
                            });
                        }
                    } catch (e) { }
                });

                freshDocs.sort((a, b) => b.sortTime - a.sortTime);
                setTransactions(freshDocs);
                setLoading(false);
            } catch (err) {
                console.error("Erro Sync:", err);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // --- COMPUTED ---
    const balance = useMemo(() => {
        return transactions.reduce((acc, curr) => {
            if (curr.tipo === 'receita' || curr.categoria === 'entrada') return acc + curr.valor;
            return acc - curr.valor;
        }, 0);
    }, [transactions]);

    // --- ACTIONS ---
    const handleSave = async (catKey) => {
        if (!amount) return;

        const cat = CATEGORIES[catKey];
        const val = parseFloat(amount.replace(',', '.'));

        try {
            await addDoc(collection(db, "transactions"), {
                valor: val,
                categoria: catKey, // chave interna
                descricao: cat.label, // Salva o nome amigável como descrição padrao
                tipo: cat.type,
                createdAt: new Date(),
                data: new Date().toISOString().split('T')[0]
            });

            // Feedback Visual
            setFeedback('OK! Tá anotado');
            setTimeout(() => {
                setFeedback(null);
                setAmount('');
                setSelectedCategory(null);
                setView('HOME');
            }, 1000);

        } catch (e) {
            alert("Erro ao salvar: " + e.message);
        }
    };

    const formatMoney = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- VIEWS ---

    if (feedback) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#2ECC71] text-white animate-in zoom-in duration-300">
            <Check size={80} className="mb-4" />
            <h1 className="text-3xl font-bold">{feedback}</h1>
        </div>
    );

    if (view === 'ENTRY') return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
            {/* Header / Logo */}
            <div className="flex justify-between items-center mb-4 mt-1">
                <div className="w-10"></div>
                <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
                <button onClick={() => setView('HOME')} className="p-2.5 bg-white shadow-sm border border-gray-100 rounded-full text-gray-400 active:scale-90 transition-transform">
                    <X size={18} />
                </button>
            </div>

            {/* Input Gigante */}
            <div className="mb-4 text-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#2ECC71]/5 rounded-full blur-3xl"></div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Quanto foi a merreca?</label>
                <div className="relative inline-flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#2ECC71] mr-2">R$</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0,00"
                        className="text-5xl font-bold bg-transparent outline-none text-[#2C3E50] placeholder-gray-100 w-full max-w-[220px]"
                        autoFocus
                    />
                </div>
            </div>

            {/* Grid de Categorias */}
            <div className="flex-1 overflow-y-auto">
                <h3 className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">O que você comprou?</h3>
                <div className="grid grid-cols-2 gap-3 pb-8">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <button
                            key={key}
                            onClick={() => handleSave(key)}
                            className={`p-4 rounded-[1.5rem] bg-white border-2 border-transparent flex flex-col items-center gap-2 transition-all active:scale-95 shadow-sm hover:border-gray-100
                                ${cat.type === 'receita' ? 'bg-green-50/50 border-green-100' : ''}
                            `}
                        >
                            <div className={`p-3 rounded-xl ${cat.color} text-white shadow-md`}>
                                {cat.icon}
                            </div>
                            <span className="font-bold text-[11px] text-[#2C3E50] text-center leading-tight">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // HOME VIEW
    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#2C3E50] pb-32 relative overflow-x-hidden">

            {/* Topo Saldo */}
            <div className="bg-white p-8 pt-10 rounded-b-[3rem] shadow-xl border-b border-gray-100 relative overflow-hidden">
                <div className="absolute top-4 right-6 opacity-[0.05] scale-125 rotate-12">
                    <img src="/logo.png" alt="" className="h-20 object-contain" />
                </div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-2">Quanto eu tenho agora:</p>
                <h1 className={`text-5xl font-bold mb-4 tracking-tighter ${balance >= 0 ? 'text-[#2C3E50]' : 'text-[#E74C3C]'}`}>
                    {loading ? "..." : formatMoney(balance)}
                </h1>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-2xl inline-flex border border-gray-100 shadow-inner">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400' : 'bg-[#2ECC71]'} shadow-[0_0_8px_#2ECC71]`}></div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        {loading ? "Conectando..." : "MinhaMerreca em dia"}
                    </span>
                </div>
            </div>

            {/* Lista Recente (Simplificada) */}
            <div className="p-6">
                <h2 className="text-lg font-bold mb-4 text-[#2C3E50]">Últimas Movimentações</h2>
                <div className="space-y-3">
                    {transactions.slice(0, 10).map(t => {
                        const catConfig = CATEGORIES[t.categoria] || CATEGORIES['outros'];
                        const isPlus = t.tipo === 'receita';
                        return (
                            <div key={t.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${catConfig.color} text-white`}>
                                        {catConfig.icon}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-[#2C3E50]">{t.descricao}</p>
                                        <p className="text-xs text-gray-400">{t.displayDate}</p>
                                    </div>
                                </div>
                                <span className={`font-bold ${isPlus ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                    {isPlus ? '+' : '-'} {formatMoney(t.valor)}
                                </span>
                            </div>
                        )
                    })}
                    {transactions.length === 0 && (
                        <div className="bg-white/40 border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center">
                            <p className="text-gray-400 font-bold text-sm">Nenhuma merreca anotada ainda...</p>
                            <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest">Clique no botão abaixo para começar!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* FAB Gigante */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
                <button
                    onClick={() => setView('ENTRY')}
                    className="bg-[#2ECC71] text-white w-20 h-20 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90 border-4 border-[#F8F9FA]"
                >
                    <Plus size={40} strokeWidth={3} />
                </button>
            </div>

        </div>
    );
}
