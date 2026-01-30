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
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [editingCell, setEditingCell] = useState(null); // { id: '...', field: '...' }

    // Monitorar tamanho da tela
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        type: 'all', // Repetição/Frequência
        payment: 'all',
        transactionType: 'all' // Receita vs Despesa
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

    // Refs
    const amountInputRef = React.useRef(null);

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
        let result = transactions.filter(t => {
            const d = new Date(t.date + 'T12:00:00');
            const matchPeriod = d.getMonth() === viewMonth && d.getFullYear() === viewYear;
            const matchCat = activeFilters.category === 'all' || t.category === activeFilters.category;
            const matchType = activeFilters.type === 'all' || t.repeatType === activeFilters.type;
            const matchPayment = activeFilters.payment === 'all' || t.paymentMethod === activeFilters.payment;
            const matchTxType = activeFilters.transactionType === 'all' || t.type === activeFilters.transactionType;
            return matchPeriod && matchCat && matchType && matchPayment && matchTxType;
        });

        // Sorting
        result.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'category') {
                valA = categories[a.category]?.label || '';
                valB = categories[b.category]?.label || '';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [transactions, viewMonth, viewYear, activeFilters, sortConfig, categories]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.type === 'receita') acc.income += t.amount;
            else acc.expense += t.amount;
            return acc;
        }, { income: 0, expense: 0 });
    }, [filteredTransactions]);

    const categoryStats = useMemo(() => {
        const stats = {};
        let totalExpenses = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'despesa') {
                stats[t.category] = (stats[t.category] || 0) + t.amount;
                totalExpenses += t.amount;
            }
        });
        return Object.entries(stats)
            .map(([cat, total]) => ({
                id: cat,
                total,
                percent: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
                config: categories[cat] || categories['outros']
            }))
            .sort((a, b) => b.total - a.total);
    }, [filteredTransactions, categories]);

    // --- ACTIONS ---
    const handleSave = async () => {
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) return;

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
        setAmount('');
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
    const PeriodHeader = ({ dark = false }) => (
        <div className={`${dark ? 'bg-[#121212] text-white' : 'bg-white text-[#2C3E50]'} px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm sticky top-0 z-30`}>
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className={`p-2 rounded-full ${dark ? 'bg-white/5' : 'bg-gray-50'}`}><ChevronLeft size={20} /></button>
                <div className="text-center">
                    {dark && <h1 className="text-lg font-bold mb-4">Relatórios</h1>}
                    <div className="flex items-center gap-4 bg-black/20 p-1 rounded-full px-4">
                        <span className="text-xs font-bold opacity-40 uppercase">{MONTHS[(viewMonth - 1 + 12) % 12].slice(0, 3)}</span>
                        <div className="bg-white/10 px-6 py-2 rounded-full">
                            <span className="text-sm font-bold">{MONTHS[viewMonth]}</span>
                        </div>
                        <span className="text-xs font-bold opacity-40 uppercase">{MONTHS[(viewMonth + 1) % 12].slice(0, 3)}</span>
                    </div>
                </div>
                <button onClick={() => changeMonth(1)} className={`p-2 rounded-full ${dark ? 'bg-white/5' : 'bg-gray-50'}`}><ChevronRight size={20} /></button>
            </div>
            {!dark && (
                <div className="flex gap-4 mt-4">
                    <div className="flex-1 bg-green-50/50 p-4 rounded-3xl border border-green-100">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Entrou</p>
                        <p className="text-lg font-bold text-green-700">{formatBoleto(totals.income)}</p>
                    </div>
                    <div className="flex-1 bg-red-50/50 p-4 rounded-3xl border border-red-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Saiu</p>
                        <p className="text-lg font-bold text-red-700">{formatBoleto(totals.expense)}</p>
                    </div>
                </div>
            )}
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

    const handleInlineUpdate = async (id, field, value) => {
        try {
            await updateDoc(doc(db, "transactions", id), { [field]: value, updatedAt: serverTimestamp() });
            setEditingCell(null);
        } catch (e) {
            alert("Erro ao atualizar: " + e.message);
        }
    };

    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // --- MAIN VIEWS ---

    if (view === 'REPORTS') return (
        <div className="min-h-screen bg-[#1F1F1F] text-white flex flex-col animate-in fade-in duration-300">
            <PeriodHeader dark={true} />

            <div className="px-6 py-4 flex items-center justify-between text-xs font-bold text-white/30 uppercase tracking-widest border-b border-white/5">
                <span>Considerando lançamentos não pagos</span>
                <span className="text-[#2ECC71]">Alterar</span>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-32">
                {categoryStats.length > 0 ? (
                    categoryStats.map(stat => (
                        <div key={stat.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full ${stat.config.color} flex items-center justify-center shadow-lg border-2 border-white/10`}>
                                    <IconRenderer name={stat.config.icon} size={22} className="text-white" />
                                </div>
                                <h3 className="font-bold text-lg">{stat.config.label}</h3>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">{formatBoleto(stat.total)}</p>
                                <p className="text-[10px] font-bold text-white/20">{stat.percent.toFixed(2)}%</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center opacity-20">
                        <BarChart2 size={60} className="mx-auto mb-4" />
                        <p className="font-bold uppercase tracking-widest text-sm">Sem dados este mês</p>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-white/5 flex justify-around p-5 z-40 rounded-t-[2.5rem]">
                <button onClick={() => setView('HOME')} className="p-2 text-white/20"><Home size={26} /></button>
                <button onClick={() => setView('REPORTS')} className="p-2 text-[#2ECC71]"><BarChart2 size={26} /></button>
                <div className="w-16"></div>
                <button onClick={() => setView('CAT_MGMT')} className="p-2 text-white/20"><Settings size={26} /></button>
            </div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
                <button onClick={() => { resetForm(); setView('ENTRY'); }} className="w-16 h-16 bg-[#2ECC71] rounded-full flex items-center justify-center shadow-2xl border-4 border-[#1F1F1F]">
                    <Plus size={32} className="text-white" strokeWidth={3} />
                </button>
            </div>
        </div>
    );

    if (view === 'ENTRY') return (
        <div className="min-h-screen bg-[#1F1F1F] text-white flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Tabs */}
            <div className="flex border-b border-white/5">
                {['despesa', 'receita', 'transferencia'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setEntryType(tab);
                            if (tab === 'receita') setSelectedCat('receita');
                            else setSelectedCat('outros');
                        }}
                        className={`flex-1 py-5 text-xs font-bold uppercase tracking-widest transition-all ${entryType === tab ? 'border-b-2 border-white text-white' : 'text-white/30'}`}
                    >
                        {tab === 'transferencia' ? 'Transferência' : tab}
                    </button>
                ))}
            </div>

            {/* Amount display */}
            <div className="p-12 text-center relative flex flex-col items-center">
                <div
                    className="relative inline-flex items-center gap-4 cursor-text"
                    onClick={() => amountInputRef.current?.focus()}
                >
                    <span className="text-6xl font-black text-white">{amount || '0.00'}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); amountInputRef.current?.focus(); }}
                        className="text-white/20 hover:text-white p-2"
                    >
                        <Edit2 size={24} />
                    </button>
                </div>
                <div className="h-0 overflow-hidden">
                    <input
                        ref={amountInputRef}
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={e => {
                            const val = e.target.value.replace(/[^0-9.,]/g, '');
                            setAmount(val);
                        }}
                        className="opacity-0"
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
                        placeholder={selectedCat === 'receita' ? "Quem pagou?" : "O que você comprou?"}
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

    // --- DESKTOP LAYOUT ---
    if (!isMobile) return (
        <div className="min-h-screen bg-[#F0F2F5] flex font-sans text-[#2C3E50]">
            {/* Sidebar */}
            <aside className="w-80 bg-[#1F1F1F] text-white p-8 flex flex-col sticky h-screen top-0 shadow-2xl">
                <div className="mb-12">
                    <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2 italic">
                        <div className="w-8 h-8 bg-[#2ECC71] rounded-lg rotate-12 flex items-center justify-center">
                            <DollarSign size={20} className="text-white -rotate-12" />
                        </div>
                        MINHA<span className="text-[#2ECC71]">MERRECA</span>
                    </h1>
                </div>

                <nav className="flex-1 space-y-2">
                    <button onClick={() => { resetForm(); setView('ENTRY'); }} className="w-full flex items-center gap-4 p-5 rounded-2xl font-black bg-[#2ECC71] text-white shadow-lg shadow-green-900/20 mb-8 active:scale-95 transition-all">
                        <Plus size={20} strokeWidth={3} /> LANÇAR AGORA
                    </button>

                    <div className="pt-4 space-y-1">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-4 mb-2">Menu Principal</p>
                        <button onClick={() => setView('HOME')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${view === 'HOME' ? 'bg-white/10 text-white shadow-xl' : 'hover:bg-white/5 text-white/40'}`}>
                            <Home size={20} /> Dashboard
                        </button>
                        <button onClick={() => setView('REPORTS')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${view === 'REPORTS' ? 'bg-white/10 text-white shadow-xl' : 'hover:bg-white/5 text-white/40'}`}>
                            <BarChart2 size={20} /> Relatórios
                        </button>
                        <button onClick={() => setView('CAT_MGMT')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${view === 'CAT_MGMT' ? 'bg-white/10 text-white shadow-xl' : 'hover:bg-white/5 text-white/40'}`}>
                            <Settings size={20} /> Categorias
                        </button>
                    </div>
                </nav>

                <div className="mt-auto bg-white/5 p-6 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">Resumo do Mês</p>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-green-500 mb-1">Entradas</p>
                            <p className="text-xl font-black">{formatBoleto(totals.income)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-red-500 mb-1">Saídas</p>
                            <p className="text-xl font-black">{formatBoleto(totals.expense)}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-12 overflow-y-auto">
                <header className="flex items-center justify-between mb-12">
                    <div>
                        <h2 className="text-3xl font-black text-[#1F1F1F] uppercase tracking-tighter">{MONTHS[viewMonth]} <span className="text-[#2ECC71]">{viewYear}</span></h2>
                        <p className="font-bold text-gray-400 text-xs uppercase tracking-widest mt-1">Spreadsheet Mode</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                        {/* Selector de Mês */}
                        <div className="flex items-center gap-2 px-2 border-r border-gray-100">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={16} /></button>
                            <span className="w-24 text-center font-black text-xs uppercase tracking-widest">{MONTHS[viewMonth]}</span>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={16} /></button>
                        </div>
                        {/* Selector de Ano */}
                        <div className="flex items-center gap-2 px-2">
                            <button onClick={() => setViewYear(prev => prev - 1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={16} /></button>
                            <span className="w-16 text-center font-black text-xs uppercase tracking-widest">{viewYear}</span>
                            <button onClick={() => setViewYear(prev => prev + 1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Desktop */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 overflow-x-auto">
                        <div className="flex items-center gap-3 min-w-max">
                            <span
                                onClick={() => setActiveFilters({ category: 'all', type: 'all', payment: 'all', transactionType: 'all' })}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black cursor-pointer transition-all ${activeFilters.transactionType === 'all' && activeFilters.category === 'all' ? 'bg-[#1F1F1F] text-white shadow-xl' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}`}
                            >Tudo</span>

                            <span
                                onClick={() => setActiveFilters({ ...activeFilters, transactionType: 'receita', category: 'all' })}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black cursor-pointer transition-all ${activeFilters.transactionType === 'receita' ? 'bg-[#1F1F1F] text-[#2ECC71] shadow-xl' : 'bg-white text-[#2ECC71] border border-gray-100 hover:border-green-200'}`}
                            >Receita</span>

                            <span
                                onClick={() => setActiveFilters({ ...activeFilters, transactionType: 'despesa', category: 'all' })}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black cursor-pointer transition-all ${activeFilters.transactionType === 'despesa' ? 'bg-[#1F1F1F] text-[#E74C3C] shadow-xl' : 'bg-white text-[#E74C3C] border border-gray-100 hover:border-red-200'}`}
                            >Despesas</span>

                            <div className="h-6 w-px bg-gray-200 mx-2"></div>

                            {Object.entries(categories).map(([k, v]) => (
                                <span
                                    key={k}
                                    onClick={() => setActiveFilters({ ...activeFilters, category: k, transactionType: 'all' })}
                                    className={`px-5 py-2.5 rounded-2xl text-xs font-black cursor-pointer transition-all ${activeFilters.category === k ? 'bg-[#1F1F1F] text-white shadow-xl' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}`}
                                >{v.label}</span>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">
                                    <th className="px-8 py-6">Status</th>
                                    <th className="px-8 py-6 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('date')}>Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th className="px-8 py-6 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('description')}>Descrição {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th className="px-8 py-6 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('category')}>Categoria {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th className="px-8 py-6 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('repeatType')}>Tipo {sortConfig.key === 'repeatType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th className="px-8 py-6 text-center cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('parcelasTotal')}>Parcelas {sortConfig.key === 'parcelasTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th className="px-8 py-6 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('paymentMethod')}>Pagamento {sortConfig.key === 'paymentMethod' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th className="px-8 py-6 cursor-pointer hover:text-[#2ECC71] transition-colors text-right" onClick={() => toggleSort('amount')}>Valor {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                                    <th className="px-8 py-6">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                {filteredTransactions.map(t => {
                                    const cat = categories[t.category] || categories['outros'];
                                    const pay = PAYMENT_METHODS[t.paymentMethod] || PAYMENT_METHODS['PIX'];
                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50/80 transition-colors group cursor-default">
                                            <td className="px-8 py-5">
                                                <button onClick={() => toggleStatus(t)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${t.status === 'pago' ? 'bg-green-100 text-[#2ECC71]' : 'bg-red-50 text-[#E74C3C]'}`}>
                                                    {t.status === 'pago' ? 'Pago' : 'Não Pago'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-5" onDoubleClick={() => setEditingCell({ id: t.id, field: 'date' })}>
                                                {editingCell?.id === t.id && editingCell.field === 'date' ? (
                                                    <input type="date" value={t.date} autoFocus onBlur={(e) => handleInlineUpdate(t.id, 'date', e.target.value)} className="bg-gray-100 p-1 rounded outline-none border border-[#2ECC71]" />
                                                ) : <span className="text-gray-400 text-xs">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                                            </td>
                                            <td className="px-8 py-5 text-[#1F1F1F]" onDoubleClick={() => setEditingCell({ id: t.id, field: 'description' })}>
                                                {editingCell?.id === t.id && editingCell.field === 'description' ? (
                                                    <input type="text" defaultValue={t.description} autoFocus onBlur={(e) => handleInlineUpdate(t.id, 'description', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(t.id, 'description', e.target.value)} className="w-full bg-gray-100 p-1 rounded outline-none border border-[#2ECC71]" />
                                                ) : t.description}
                                            </td>
                                            <td className="px-8 py-5" onDoubleClick={() => setEditingCell({ id: t.id, field: 'category' })}>
                                                {editingCell?.id === t.id && editingCell.field === 'category' ? (
                                                    <select defaultValue={t.category} autoFocus onBlur={(e) => handleInlineUpdate(t.id, 'category', e.target.value)} onChange={(e) => handleInlineUpdate(t.id, 'category', e.target.value)} className="bg-gray-100 p-1 rounded outline-none border border-[#2ECC71]">
                                                        {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${cat.color}`}></div>
                                                        <span className="text-gray-600">{cat.label}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-5" onDoubleClick={() => setEditingCell({ id: t.id, field: 'repeatType' })}>
                                                {editingCell?.id === t.id && editingCell.field === 'repeatType' ? (
                                                    <select defaultValue={t.repeatType || 'avista'} autoFocus onBlur={(e) => handleInlineUpdate(t.id, 'repeatType', e.target.value)} onChange={(e) => handleInlineUpdate(t.id, 'repeatType', e.target.value)} className="bg-gray-100 p-1 rounded outline-none border border-[#2ECC71] text-[10px] uppercase">
                                                        <option value="avista">Única</option>
                                                        <option value="fixo">Fixo</option>
                                                        <option value="parcelado">Parcelado</option>
                                                    </select>
                                                ) : <span className="text-gray-400 uppercase text-[10px]">{t.repeatType === 'avista' || !t.repeatType ? 'Única' : t.repeatType}</span>}
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-gray-400 text-xs font-black">
                                                    {t.repeatType === 'parcelado' ? `${t.parcelaNum || 1}x/${t.parcelasTotal || 1}x` : '1x'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-gray-400" onDoubleClick={() => setEditingCell({ id: t.id, field: 'paymentMethod' })}>
                                                {editingCell?.id === t.id && editingCell.field === 'paymentMethod' ? (
                                                    <select defaultValue={t.paymentMethod} autoFocus onBlur={(e) => handleInlineUpdate(t.id, 'paymentMethod', e.target.value)} onChange={(e) => handleInlineUpdate(t.id, 'paymentMethod', e.target.value)} className="bg-gray-100 p-1 rounded outline-none border border-[#2ECC71] text-xs uppercase">
                                                        {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                    </select>
                                                ) : <span className="uppercase text-[10px]">{pay.label}</span>}
                                            </td>
                                            <td className={`px-8 py-5 text-right text-lg font-black ${t.type === 'receita' ? 'text-green-500' : 'text-red-500'}`} onDoubleClick={() => setEditingCell({ id: t.id, field: 'amount' })}>
                                                {editingCell?.id === t.id && editingCell.field === 'amount' ? (
                                                    <input type="text" defaultValue={t.amount} autoFocus onBlur={(e) => handleInlineUpdate(t.id, 'amount', parseFloat(e.target.value.replace(',', '.')) || 0)} onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(t.id, 'amount', parseFloat(e.target.value.replace(',', '.')) || 0)} className="w-24 bg-gray-100 p-1 rounded outline-none border border-[#2ECC71] text-right" />
                                                ) : (
                                                    <>{t.type === 'receita' ? '+' : '-'} {formatBoleto(t.amount)}</>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!loading && filteredTransactions.length === 0 && (
                            <div className="py-32 text-center text-gray-300 flex flex-col items-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <AlertCircle size={40} />
                                </div>
                                <p className="font-black text-xl tracking-tight text-gray-400">Nenhuma merreca encontrada</p>
                                <p className="text-sm font-bold mt-1">Ajuste os filtros ou mude o mês.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Overlays / Modals */}
            {view === 'ENTRY' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-[500px] h-full bg-[#1F1F1F] shadow-2xl animate-in slide-in-from-right duration-500">
                        {/* Aqui reutilizamos a UI de ENTRY que já temos */}
                        <div className="h-full flex flex-col">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <h1 className="text-xl font-black italic">NOVO <span className="text-[#2ECC71]">LANÇAMENTO</span></h1>
                                <button onClick={() => setView('HOME')} className="text-white/20 hover:text-white"><X size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {/* O conteúdo do ENTRY Mobile funciona bem aqui no painel lateral */}
                                {view === 'ENTRY' && (
                                    <div className="p-0"> {/* Wrapper para evitar conflito de padding */}
                                        {/* Copiamos apenas a lógica de renderização do ENTRY Mobile aqui */}
                                        {/* Tabs */}
                                        <div className="flex border-b border-white/5">
                                            {['despesa', 'receita', 'transferencia'].map(tab => (
                                                <button key={tab} onClick={() => { setEntryType(tab); if (tab === 'receita') setSelectedCat('receita'); else setSelectedCat('outros'); }} className={`flex-1 py-6 text-[10px] font-black uppercase tracking-widest transition-all ${entryType === tab ? 'border-b-4 border-[#2ECC71] text-white' : 'text-white/20'}`}>{tab}</button>
                                            ))}
                                        </div>
                                        {/* Amount */}
                                        <div className="p-12 text-center bg-black/20">
                                            <div className="relative inline-flex items-center gap-4 cursor-text" onClick={() => amountInputRef.current?.focus()}>
                                                <span className="text-7xl font-black tracking-tighter">{amount || '0,00'}</span>
                                                <Edit2 size={24} className="text-white/10" />
                                            </div>
                                            <input ref={amountInputRef} type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} className="opacity-0 w-0 h-0" autoFocus />
                                        </div>
                                        {/* Fields */}
                                        <div className="p-8 space-y-8">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Descrição</p>
                                                <input placeholder={selectedCat === 'receita' ? "Quem pagou?" : "O que você comprou?"} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold outline-none focus:border-[#2ECC71]/50" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Categoria</p>
                                                    <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold outline-none appearance-none">
                                                        {Object.entries(categories).map(([k, v]) => <option key={k} value={k} className="text-black">{v.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Pagamento</p>
                                                    <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold outline-none appearance-none">
                                                        {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k} className="text-black">{v.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Data</p>
                                                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-bold outline-none" />
                                            </div>
                                            <button onClick={handleSave} className="w-full bg-[#2ECC71] text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-green-900/20 active:scale-95 transition-all">SALVAR LANÇAMENTO</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {feedback && (
                <div className="fixed bottom-12 right-12 z-[200] bg-[#2ECC71] text-white px-8 py-4 rounded-2xl font-black shadow-2xl animate-in slide-in-from-right duration-300"> {feedback} </div>
            )}
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
                <button onClick={() => setView('REPORTS')} className={`p-2 transition-all ${view === 'REPORTS' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><BarChart2 size={26} strokeWidth={2.5} /></button>
                <div className="w-16"></div>
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
