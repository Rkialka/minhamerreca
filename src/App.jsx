import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Lock, ArrowUp, ArrowDown, Check, X, Home,
    DollarSign, Receipt, ShoppingCart, Car, Heart, PartyPopper, ShoppingBag,
    BarChart2, Calendar, CreditCard, Wallet, MoreHorizontal, Edit2, Trash2,
    ArrowRightLeft, Filter, Settings, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Coffee, Sparkles
} from 'lucide-react';
import { db } from './firebaseConfig';
import {
    collection, addDoc, onSnapshot, query,
    deleteDoc, doc, updateDoc, writeBatch, serverTimestamp
} from 'firebase/firestore';

// --- CONSTANTES ---
const INITIAL_CATEGORIES = {
    'receita': { icon: 'DollarSign', label: 'Receita', color: 'bg-[#2ECC71]', type: 'receita' },
    'despesas': { icon: 'ArrowDown', label: 'Despesas', color: 'bg-[#E74C3C]', type: 'despesa' },
    'casa': { icon: 'Home', label: 'Casa', color: 'bg-[#3498DB]', type: 'despesa' },
    'saude': { icon: 'Heart', label: 'Saúde', color: 'bg-[#9B59B6]', type: 'despesa' },
    'beleza': { icon: 'Sparkles', label: 'Beleza', color: 'bg-[#FF9FF3]', type: 'despesa' },
    'transporte': { icon: 'Car', label: 'Transporte', color: 'bg-[#95A5A6]', type: 'despesa' },
    'supermercado': { icon: 'ShoppingCart', label: 'Supermercado', color: 'bg-[#F1C40F]', type: 'despesa' },
    'servicos': { icon: 'Receipt', label: 'Serviços', color: 'bg-[#1ABC9C]', type: 'despesa' },
    'educacao': { icon: 'BookOpen', label: 'Educação', color: 'bg-[#34495E]', type: 'despesa' },
    'lazer': { icon: 'PartyPopper', label: 'Lazer', color: 'bg-[#E67E22]', type: 'despesa' },
    'alimentacao': { icon: 'Coffee', label: 'Alimentação', color: 'bg-[#D35400]', type: 'despesa' },
    'vestuario': { icon: 'ShoppingBag', label: 'Vestuário', color: 'bg-[#BDC3C7]', type: 'despesa' },
    'casamento': { icon: 'PartyPopper', label: 'Casamento', color: 'bg-[#FF7675]', type: 'despesa' },
    'outros': { icon: 'MoreHorizontal', label: 'Outros', color: 'bg-[#7F8C8D]', type: 'despesa' }
};

const PAYMENT_METHODS = {
    'PIX': { label: 'Débito/Pix', icon: 'ArrowRightLeft' },
    'CARD': { label: 'Crédito', icon: 'CreditCard' },
    'CASH': { label: 'Dinheiro', icon: 'Wallet' }
};

const IconRenderer = ({ name, size = 20, className = "" }) => {
    const icons = {
        Plus, Lock, ArrowUp, ArrowDown, Check, X, Home,
        DollarSign, Receipt, ShoppingCart, Car, Heart, PartyPopper, ShoppingBag,
        BarChart2, Calendar, CreditCard, Wallet, MoreHorizontal, Edit2, Trash2,
        ArrowRightLeft, Filter, Settings, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Coffee, Sparkles
    };
    const Icon = icons[name] || MoreHorizontal;
    return <Icon size={size} className={className} />;
};

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function MinhaMerreca() {
    const [view, setView] = useState('HOME'); // HOME, ENTRY, REPORTS, CAT_MGMT
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState(INITIAL_CATEGORIES);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState(null);

    // Sync Categorias do Firebase
    useEffect(() => {
        const q = query(collection(db, "categories"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                // Se estiver vazio, não fazemos nada ou poderíamos inicializar, 
                // mas vamos manter as INITIAL_CATEGORIES como fallback.
                return;
            }
            const data = {};
            snapshot.docs.forEach(d => {
                data[d.id] = d.data();
            });
            setCategories(prev => ({ ...prev, ...data }));
        });
        return () => unsubscribe();
    }, []);

    // Navegação de Período
    const now = new Date();
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [viewYear, setViewYear] = useState(now.getFullYear());

    // Filtros
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        category: 'all',
        type: 'all', // avista, fixo, parcelado
        payment: 'all'
    });

    // Form State
    const [entryType, setEntryType] = useState('despesa'); // receita, despesa, transferencia
    const [amount, setAmount] = useState('0.00');
    const [description, setDescription] = useState('');
    const [selectedCat, setSelectedCat] = useState('outros');
    const [selectedPayment, setSelectedPayment] = useState('PIX');
    const [entryDate, setEntryDate] = useState(now.toISOString().split('T')[0]);
    const [repeatType, setRepeatType] = useState('avista'); // avista, fixo, parcelado
    const [installments, setInstallments] = useState(1);

    // Edição
    const [editingId, setEditingId] = useState(null);

    // --- FIREBASE SYNC ---
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "transactions"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTransactions(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- COMPUTED DATA ---
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date + 'T12:00:00');
            const matchPeriod = d.getMonth() === viewMonth && d.getFullYear() === viewYear;
            const matchCat = activeFilters.category === 'all' || t.category === activeFilters.category;
            const matchType = activeFilters.type === 'all' || t.repeatType === activeFilters.type;
            const matchPayment = activeFilters.payment === 'all' || t.paymentMethod === activeFilters.payment;
            return matchPeriod && matchCat && matchType && matchPayment;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, viewMonth, viewYear, activeFilters]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.type === 'receita') acc.income += t.amount;
            else acc.expense += t.amount;
            return acc;
        }, { income: 0, expense: 0 });
    }, [filteredTransactions]);

    // --- ACTIONS ---
    const handleSave = async () => {
        const val = parseFloat(amount);
        if (val <= 0) return;

        const baseData = {
            amount: val,
            description: description || categories[selectedCat]?.label || 'Lançamento',
            category: selectedCat,
            paymentMethod: selectedPayment,
            type: entryType,
            repeatType: repeatType,
            updatedAt: serverTimestamp()
        };

        try {
            const batch = writeBatch(db);
            const startDate = new Date(entryDate + 'T12:00:00');

            if (repeatType === 'fixo') {
                for (let i = 0; i < 12; i++) {
                    const d = new Date(startDate);
                    d.setMonth(d.getMonth() + i);
                    const newDoc = doc(collection(db, "transactions"));
                    batch.set(newDoc, { ...baseData, date: d.toISOString().split('T')[0], status: i === 0 ? 'pago' : 'não pago' });
                }
                await batch.commit();
            } else if (repeatType === 'parcelado') {
                for (let i = 0; i < installments; i++) {
                    const d = new Date(startDate);
                    d.setMonth(d.getMonth() + i);
                    const newDoc = doc(collection(db, "transactions"));
                    batch.set(newDoc, {
                        ...baseData,
                        date: d.toISOString().split('T')[0],
                        status: 'não pago',
                        parcelaNum: i + 1,
                        parcelasTotal: installments
                    });
                }
                await batch.commit();
            } else {
                if (editingId) {
                    await updateDoc(doc(db, "transactions", editingId), {
                        ...baseData,
                        date: entryDate,
                        status: transactions.find(tx => tx.id === editingId)?.status || 'pago'
                    });
                } else {
                    await addDoc(collection(db, "transactions"), { ...baseData, date: entryDate, status: 'pago' });
                }
            }

            showToast("Anotado!");
            resetForm();
            setView('HOME');
        } catch (e) {
            alert("Erro ao salvar: " + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Quer mesmo apagar essa merreca?")) {
            await deleteDoc(doc(db, "transactions", id));
        }
    };

    const toggleStatus = async (t) => {
        const newStatus = t.status === 'pago' ? 'não pago' : 'pago';
        await updateDoc(doc(db, "transactions", t.id), { status: newStatus });
    };

    const showToast = (msg) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2000);
    };

    const resetForm = () => {
        setAmount('0.00');
        setDescription('');
        setRepeatType('avista');
        setInstallments(1);
        setEditingId(null);
    };

    const changeMonth = (offset) => {
        let nm = viewMonth + offset;
        let ny = viewYear;
        if (nm > 11) { nm = 0; ny++; }
        if (nm < 0) { nm = 11; ny--; }
        setViewMonth(nm);
        setViewYear(ny);
    };

    const formatBoleto = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- UI COMPONENTS ---

    // Header com Seletor de Mês
    const PeriodHeader = () => (
        <div className="bg-white px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.04)] sticky top-0 z-30">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => changeMonth(-1)} className="p-2 bg-gray-50 rounded-full text-gray-400"><ChevronLeft size={20} /></button>
                <div className="text-center">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[#2ECC71]">{viewYear}</h2>
                    <h1 className="text-xl font-bold text-[#2C3E50]">{MONTHS[viewMonth]}</h1>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 bg-gray-50 rounded-full text-gray-400"><ChevronRight size={20} /></button>
            </div>

            <div className="flex gap-4">
                <div className="flex-1 bg-green-50/50 p-4 rounded-3xl border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Entrou</p>
                    <p className="text-lg font-bold text-green-700">{formatBoleto(totals.income)}</p>
                </div>
                <div className="flex-1 bg-red-50/50 p-4 rounded-3xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Saiu</p>
                    <p className="text-lg font-bold text-red-700">{formatBoleto(totals.expense)}</p>
                </div>
            </div>
        </div>
    );

    // Item de Transação
    const TransactionItem = ({ t }) => {
        const cat = categories[t.category] || categories['outros'];
        const pay = PAYMENT_METHODS[t.paymentMethod] || PAYMENT_METHODS['PIX'];
        const isToday = new Date(t.date + 'T12:00:00').toDateString() === new Date().toDateString();
        const isOverdue = t.status === 'não pago' && isToday;
        const isPlus = t.type === 'receita';

        return (
            <div className={`bg-white p-4 rounded-[1.8rem] shadow-sm border-2 transition-all mb-3 ${isOverdue ? 'border-red-500 bg-red-50/20' : 'border-transparent'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${cat.color} text-white shadow-sm`}>
                            <IconRenderer name={cat.icon} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{pay.label} • {cat.label}</p>
                            <h3 className="font-bold text-[#2C3E50] leading-tight">{t.description}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-bold text-md ${isPlus ? 'text-green-500' : 'text-red-500'}`}>
                            {isPlus ? '+' : '-'} {formatBoleto(t.amount)}
                        </p>
                        {t.parcelasTotal && (
                            <p className="text-[10px] font-bold text-gray-300">Total: {formatBoleto(t.amount * t.parcelasTotal)} • {t.parcelaNum}/{t.parcelasTotal}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-300" />
                        <span className="text-[11px] font-bold text-gray-400">{new Date(t.date + 'T12:00:00').toLocaleDateString()}</span>
                        {t.repeatType && t.repeatType !== 'avista' && (
                            <span className="bg-gray-100 text-[9px] px-2 py-0.5 rounded-full font-bold text-gray-500 uppercase">
                                {t.repeatType === 'parcelado' ? `${t.parcelasTotal}x` : 'Fixo'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => toggleStatus(t)} className={`p-1.5 rounded-xl transition-all ${t.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:text-red-400'}`}>
                            <Check size={16} strokeWidth={3} />
                        </button>
                        <button onClick={() => {
                            setEditingId(t.id);
                            setAmount(t.amount.toString());
                            setDescription(t.description);
                            setSelectedCat(t.category);
                            setSelectedPayment(t.paymentMethod);
                            setEntryDate(t.date);
                            setEntryType(t.type);
                            setRepeatType(t.repeatType || 'avista');
                            setView('ENTRY');
                        }} className="p-1.5 text-gray-300 hover:text-blue-500"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                </div>
            </div>
        );
    };

    const deleteCategory = async (id) => {
        if (Object.keys(INITIAL_CATEGORIES).includes(id)) {
            alert("Esta categoria é essencial e não pode ser apagada.");
            return;
        }
        if (confirm("Deseja apagar esta categoria? Lançamentos nela serão mantidos, mas podem ficar sem ícone.")) {
            await deleteDoc(doc(db, "categories", id));
        }
    };

    const addCategory = async () => {
        const name = prompt("Nome da nova categoria:");
        if (!name) return;
        const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        await addDoc(collection(db, "categories"), {
            label: name,
            icon: 'MoreHorizontal', // Simplificado para esse exemplo
            color: 'bg-[#7F8C8D]',
            type: 'despesa'
        });
    };

    // --- MAIN VIEWS ---

    if (view === 'ENTRY') return (
        <div className="min-h-screen bg-[#1F1F1F] text-white flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Tabs */}
            <div className="flex border-b border-white/5">
                {['despesa', 'receita', 'transferencia'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setEntryType(tab)}
                        className={`flex-1 py-5 text-xs font-bold uppercase tracking-widest transition-all ${entryType === tab ? 'border-b-2 border-white text-white' : 'text-white/30'}`}
                    >
                        {tab === 'transferencia' ? 'Transferência' : tab}
                    </button>
                ))}
            </div>

            {/* Amount display */}
            <div className="p-12 text-center relative">
                <div className="relative inline-flex items-center gap-4">
                    <span className="text-6xl font-black text-white">{amount}</span>
                    <button className="text-white/20"><Edit2 size={24} /></button>
                </div>
                <div className="mt-4">
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="bg-transparent border-none text-center outline-none w-full text-transparent"
                        autoFocus
                    />
                </div>
            </div>

            {/* Field List */}
            <div className="flex-1 bg-[#121212] rounded-t-[3rem] p-8 space-y-6 overflow-y-auto">
                {/* Categoria */}
                <div className="flex items-center gap-4 px-2">
                    <div className="p-3 bg-white/5 rounded-2xl text-white/40"><MoreHorizontal size={20} /></div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Categoria</p>
                        <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="w-full bg-transparent font-bold outline-none text-white appearance-none">
                            {Object.entries(categories).map(([k, v]) => <option key={k} value={k} className="text-black">{v.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Pago com */}
                <div className="flex items-center gap-4 px-2">
                    <div className="p-3 bg-white/5 rounded-2xl text-white/40"><CreditCard size={20} /></div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Pago com</p>
                        <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} className="w-full bg-transparent font-bold outline-none text-white appearance-none">
                            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k} className="text-black">{v.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Data */}
                <div className="flex items-center gap-4 px-2">
                    <div className="p-3 bg-white/5 rounded-2xl text-white/40"><Calendar size={20} /></div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Data</p>
                        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full bg-transparent font-bold outline-none text-white" />
                    </div>
                </div>

                {/* Repetir */}
                <div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4 px-2">Repetir lançamento</p>
                    <div className="flex gap-4 px-2">
                        <button onClick={() => setRepeatType(repeatType === 'fixo' ? 'avista' : 'fixo')} className={`flex-1 py-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest ${repeatType === 'fixo' ? 'border-[#2ECC71] bg-[#2ECC71]/10 text-[#2ECC71]' : 'border-white/5 text-white/20'}`}>Fixo</button>
                        <button onClick={() => setRepeatType(repeatType === 'parcelado' ? 'avista' : 'parcelado')} className={`flex-1 py-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest ${repeatType === 'parcelado' ? 'border-[#2ECC71] bg-[#2ECC71]/10 text-[#2ECC71]' : 'border-white/5 text-white/20'}`}>Parcelado</button>
                    </div>
                    {repeatType === 'parcelado' && (
                        <div className="mt-4 px-4 flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                            <span className="text-xs font-bold text-white/40">Parcelado em:</span>
                            <div className="flex items-center gap-2">
                                <input type="number" value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className="bg-white/10 w-12 text-center py-2 rounded-xl font-bold outline-none" />
                                <span className="text-xs font-bold text-white/40">x</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Descrição */}
                <div className="px-2">
                    <input
                        placeholder="O que você comprou?"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl outline-none focus:border-white/20 font-bold"
                    />
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="bg-[#1F1F1F] p-8 flex justify-center relative">
                <button
                    onClick={handleSave}
                    className="w-20 h-20 bg-[#2ECC71] rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                >
                    <Check size={40} className="text-white" strokeWidth={3} />
                </button>
                <button onClick={() => setView('HOME')} className="absolute left-8 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white"><X size={24} /></button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-32">
            <PeriodHeader />

            {/* FEEDBACK TOAST */}
            {feedback && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#2C3E50] text-white px-8 py-3 rounded-full font-bold shadow-2xl animate-in fade-in slide-in-from-top duration-300">
                    {feedback}
                </div>
            )}

            {/* Listagem */}
            <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-400 text-sm">{filteredTransactions.length} Movimentações</h3>
                    <button onClick={() => setFilterMenuOpen(!filterMenuOpen)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400"><Filter size={18} /></button>
                </div>

                {filterMenuOpen && (
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-6 space-y-4 animate-in slide-in-from-top">
                        <div>
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Por Categoria</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                <button onClick={() => setActiveFilters({ ...activeFilters, category: 'all' })} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${activeFilters.category === 'all' ? 'bg-[#2ECC71] text-white' : 'bg-gray-50 text-gray-400'}`}>Tudo</button>
                                {Object.entries(categories).map(([k, v]) => (
                                    <button key={k} onClick={() => setActiveFilters({ ...activeFilters, category: k })} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${activeFilters.category === k ? 'bg-[#2ECC71] text-white' : 'bg-gray-50 text-gray-400'}`}>{v.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Por Tipo</p>
                                <select value={activeFilters.type} onChange={e => setActiveFilters({ ...activeFilters, type: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl outline-none text-xs font-bold text-gray-500">
                                    <option value="all">Qualquer</option>
                                    <option value="avista">À Vista</option>
                                    <option value="fixo">Fixo</option>
                                    <option value="parcelado">Parcelado</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Pagamento</p>
                                <select value={activeFilters.payment} onChange={e => setActiveFilters({ ...activeFilters, payment: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl outline-none text-xs font-bold text-gray-500">
                                    <option value="all">Qualquer</option>
                                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    {loading ? (
                        <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                    ) : filteredTransactions.length > 0 ? (
                        filteredTransactions.map(t => <TransactionItem key={t.id} t={t} />)
                    ) : (
                        <div className="py-20 text-center opacity-30">
                            <AlertCircle size={48} className="mx-auto mb-4" />
                            <p className="font-bold">Nada por aqui neste mês!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-5 z-40 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <button onClick={() => setView('HOME')} className={`p-2 transition-all ${view === 'HOME' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Home size={26} strokeWidth={2.5} /></button>
                <div className="w-20"></div>
                <button onClick={() => setView('CAT_MGMT')} className={`p-2 transition-all ${view === 'CAT_MGMT' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Settings size={26} strokeWidth={2.5} /></button>
            </div>

            {/* FAB */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={() => { resetForm(); setView('ENTRY'); }}
                    className="w-20 h-20 bg-[#2ECC71] rounded-full flex items-center justify-center shadow-[0_15px_40px_rgba(46,204,113,0.3)] border-8 border-white active:scale-95 transition-all"
                >
                    <Plus size={40} className="text-white" strokeWidth={3} />
                </button>
            </div>

            {/* GESTÃO DE CATEGORIAS */}
            {view === 'CAT_MGMT' && (
                <div className="fixed inset-0 bg-[#F8F9FA] z-[100] p-6 animate-in fade-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-bold text-[#2C3E50]">Minhas Categorias</h1>
                        <button onClick={() => setView('HOME')} className="p-3 bg-white rounded-full text-gray-400 shadow-sm"><X size={24} /></button>
                    </div>
                    <div className="space-y-3 overflow-y-auto max-h-[70vh] pb-20">
                        {Object.entries(categories).map(([k, v]) => (
                            <div key={k} className="bg-white p-5 rounded-3xl flex items-center justify-between shadow-sm border border-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${v.color} text-white shadow-sm`}>
                                        <IconRenderer name={v.icon} />
                                    </div>
                                    <p className="font-bold text-[#2C3E50]">{v.label}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => deleteCategory(k)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA] to-transparent">
                        <button onClick={addCategory} className="w-full bg-[#2C3E50] text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl">
                            <Plus size={20} /> Nova Categoria
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
