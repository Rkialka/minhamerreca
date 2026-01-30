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
    'dani': { icon: 'Heart', label: 'Dani', color: 'bg-[#FF7675]', type: 'receita' },
    'portipar': { icon: 'DollarSign', label: 'Portipar', color: 'bg-[#2ECC71]', type: 'receita' },
    'gui': { icon: 'Heart', label: 'Gui', color: 'bg-[#FF7675]', type: 'receita' },
    'lindezo': { icon: 'Heart', label: 'Lindezo', color: 'bg-[#FF7675]', type: 'receita' },
    'airbnb': { icon: 'Home', label: 'Airbnb', color: 'bg-[#FF5A5F]', type: 'receita' },
    'outras-receitas': { icon: 'MoreHorizontal', label: 'Outras Receitas', color: 'bg-[#7F8C8D]', type: 'receita' },
    'mercado': { icon: 'ShoppingCart', label: 'Mercado', color: 'bg-[#F1C40F]', type: 'despesa' },
    'casa': { icon: 'Home', label: 'Casa', color: 'bg-[#3498DB]', type: 'despesa' },
    'saude': { icon: 'Heart', label: 'Saúde', color: 'bg-[#9B59B6]', type: 'despesa' },
    'beleza': { icon: 'Sparkles', label: 'Beleza', color: 'bg-[#FF9FF3]', type: 'despesa' },
    'transporte': { icon: 'Car', label: 'Transporte', color: 'bg-[#95A5A6]', type: 'despesa' },
    'servicos': { icon: 'Receipt', label: 'Serviços', color: 'bg-[#1ABC9C]', type: 'despesa' },
    'educacao': { icon: 'BookOpen', label: 'Educação', color: 'bg-[#34495E]', type: 'despesa' },
    'lazer': { icon: 'PartyPopper', label: 'Lazer', color: 'bg-[#E67E22]', type: 'despesa' },
    'alimentacao': { icon: 'Coffee', label: 'Alimentação', color: 'bg-[#D35400]', type: 'despesa' },
    'vestuario': { icon: 'ShoppingBag', label: 'Vestuário', color: 'bg-[#BDC3C7]', type: 'despesa' },
    'casamento': { icon: 'Heart', label: 'Casamento', color: 'bg-[#FF7675]', type: 'despesa' },
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
    const [selectedCat, setSelectedCat] = useState('dani');
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
            if (t.type === 'receita') acc.income += Number(t.amount) || 0;
            else acc.expense += Number(t.amount) || 0;
            return acc;
        }, { income: 0, expense: 0 });
    }, [filteredTransactions]);

    const categoryStats = useMemo(() => {
        const stats = {};
        let totalExpenses = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'despesa' || t.amount < 0) {
                const amount = Math.abs(Number(t.amount) || 0);
                stats[t.category] = (stats[t.category] || 0) + amount;
                totalExpenses += amount;
            }
        });
        return Object.entries(stats)
            .map(([cat, total]) => ({
                id: cat,
                total,
                percent: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
                config: categories[cat] || categories['outros']
            }))
            .filter(item => item.id !== 'teste' && item.config.type !== 'receita')
            .sort((a, b) => b.total - a.total);
    }, [filteredTransactions, categories]);

    const yearlyData = useMemo(() => {
        const matrix = {}; // { catId: [Jan, Feb, ..., Total] }
        const monthIncome = new Array(12).fill(0);
        const monthExpense = new Array(12).fill(0);

        transactions.forEach(t => {
            const d = new Date(t.date + 'T12:00:00');
            if (d.getFullYear() === viewYear) {
                const m = d.getMonth();
                const amt = Math.abs(Number(t.amount) || 0);

                if (t.type === 'receita') {
                    monthIncome[m] += amt;
                } else if (t.type === 'despesa' || t.amount < 0) {
                    if (!matrix[t.category]) matrix[t.category] = new Array(13).fill(0);
                    matrix[t.category][m] += amt;
                    matrix[t.category][12] += amt; // Row total
                    monthExpense[m] += amt;
                }
            }
        });

        const incomeValues = [...monthIncome, monthIncome.reduce((a, b) => a + b, 0)];
        const expenseValues = [...monthExpense, monthExpense.reduce((a, b) => a + b, 0)];
        const balanceValues = incomeValues.map((v, i) => v - expenseValues[i]);

        const sortedRows = Object.entries(matrix)
            .map(([id, values]) => ({ id, values, config: categories[id] || categories['outros'] }))
            .sort((a, b) => b.values[12] - a.values[12]);

        return {
            rows: sortedRows,
            summary: {
                income: incomeValues,
                expense: expenseValues,
                balance: balanceValues
            }
        };
    }, [transactions, viewYear, categories]);

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
        setTimeout(() => setFeedback(null), 3000);
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setRepeatType('avista');
        setInstallments(1);
        setEditingId(null);
        setSelectedCat(entryType === 'receita' ? 'dani' : 'outros');
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
        <div className="bg-white text-[#2C3E50] px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm sticky top-0 z-30">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full bg-gray-50"><ChevronLeft size={20} /></button>
                <div className="text-center">
                    <div className="flex items-center gap-4 bg-gray-100 p-1 rounded-full px-4">
                        <span className="text-xs font-bold opacity-40 uppercase">{MONTHS[(viewMonth - 1 + 12) % 12].slice(0, 3)}</span>
                        <div className="bg-white px-6 py-2 rounded-full shadow-sm">
                            <span className="text-sm font-bold text-[#2ECC71]">{MONTHS[viewMonth]}</span>
                        </div>
                        <span className="text-xs font-bold opacity-40 uppercase">{MONTHS[(viewMonth + 1) % 12].slice(0, 3)}</span>
                    </div>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full bg-gray-50"><ChevronRight size={20} /></button>
            </div>
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{pay.label} • {cat.label}</p>
                            <h3 className="font-bold text-slate-800 leading-tight">{t.description}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-bold text-md ${isPlus ? 'text-green-600' : 'text-red-500'}`}>
                            {isPlus ? '+' : '-'} {formatBoleto(t.amount)}
                        </p>
                        {t.parcelasTotal && (
                            <p className="text-[10px] font-bold text-slate-400">Total: {formatBoleto(t.amount * t.parcelasTotal)} • {t.parcelaNum}/{t.parcelasTotal}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-500">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                        {t.repeatType && t.repeatType !== 'avista' && (
                            <span className="bg-gray-100 text-[9px] px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">
                                {t.repeatType === 'parcelado' ? `${t.parcelasTotal}x` : 'Fixo'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => toggleStatus(t)} className={`p-1.5 rounded-xl transition-all ${t.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-slate-400 hover:text-red-400'}`}>
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
                        }} className="p-1.5 text-slate-300 hover:text-blue-500"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
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

    if (view === 'REPORTS' && isMobile) return (
        <div className="h-screen bg-white text-[#2C3E50] flex flex-col animate-in fade-in duration-300 overflow-hidden">
            <PeriodHeader />
            <div className="flex-1 px-8 py-4 overflow-y-auto">
                <div className="space-y-4">
                    {categoryStats.map((stat, idx) => (
                        <div key={idx} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="font-black text-slate-800">{stat.config.label}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.percent.toFixed(1)}% do total</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-slate-800">{formatBoleto(stat.total)}</p>
                            </div>
                        </div>
                    ))}
                    {categoryStats.length === 0 && (
                        <div className="py-20 text-center opacity-30 italic font-bold">Sem despesas registradas</div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-4 z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <button onClick={() => setView('CAT_MGMT')} className={`p-3 transition-colors ${view === 'CAT_MGMT' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Settings size={24} /></button>
                <button onClick={() => setView('REPORTS')} className={`p-3 transition-colors ${view === 'REPORTS' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><BarChart2 size={24} /></button>
                <button onClick={() => setView('HOME')} className={`p-3 transition-colors ${view === 'HOME' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Home size={24} /></button>
                <button onClick={() => { resetForm(); setView('ENTRY'); }} className="w-14 h-14 bg-[#2ECC71] rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all">
                    <Plus size={28} strokeWidth={4} />
                </button>
            </div>
        </div>
    );

    if (view === 'ENTRY') return (
        <div className="min-h-screen bg-white text-[#2C3E50] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Tabs */}
            <div className="flex border-b border-gray-50 bg-[#F8F9FA] pt-12">
                {['despesa', 'receita', 'transferencia'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setEntryType(tab);
                            if (tab === 'receita') setSelectedCat('dani');
                            else setSelectedCat('outros');
                        }}
                        className={`flex-1 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${entryType === tab ? (tab === 'receita' ? 'text-[#2ECC71] border-b-4 border-[#2ECC71]' : (tab === 'despesa' ? 'text-red-500 border-b-4 border-red-500' : 'text-[#1F1F1F] border-b-4 border-[#1F1F1F]')) : 'text-gray-300'}`}
                    >
                        {tab === 'transferencia' ? 'Transferência' : tab}
                    </button>
                ))}
            </div>

            {/* Amount display */}
            <div className="p-8 text-center bg-white flex-shrink-0">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">Valor do Lançamento</p>
                <div className="max-w-md mx-auto relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-gray-200">R$</span>
                    <input
                        type="text"
                        placeholder="0,00"
                        value={amount}
                        onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                        className="w-full bg-gray-50 border border-gray-100 p-6 rounded-[3rem] font-black text-4xl outline-none focus:border-[#2ECC71] text-[#2C3E50] text-center pl-16 shadow-inner"
                        autoFocus
                    />
                </div>
            </div>

            {/* Field List */}
            <div className="flex-1 bg-[#F8F9FA] rounded-t-[4rem] p-10 space-y-8 shadow-[0_-20px_50px_rgba(0,0,0,0.02)] border-t border-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Categoria */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Categoria</p>
                        <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="w-full bg-transparent font-black text-lg outline-none text-[#2C3E50] border-none">
                            {Object.entries(categories).filter(([k, v]) => !['receita', 'despesa'].includes(v.label.toLowerCase()) && v.type === entryType).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>

                    {/* Pago com */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Método de Pagamento</p>
                        <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} className="w-full bg-transparent font-black text-lg outline-none text-[#2C3E50] border-none">
                            {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Data */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Data (AAAA-MM-DD)</p>
                        <input type="text" placeholder="2026-01-30" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full bg-transparent font-black text-lg outline-none text-[#2C3E50] border-none" />
                    </div>

                    {/* Descrição */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Descrição</p>
                        <input
                            placeholder={selectedCat === 'receita' ? "Quem pagou?" : "O que você comprou?"}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-transparent font-black text-lg outline-none text-[#2C3E50] border-none"
                        />
                    </div>
                </div>

                {/* Repetir */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-50">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6 text-center">Frequência</p>
                    <div className="flex gap-4">
                        <button onClick={() => setRepeatType('avista')} className={`flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${repeatType === 'avista' ? 'bg-[#1F1F1F] text-white shadow-xl' : 'bg-gray-50 text-gray-300'}`}>À Vista</button>
                        <button onClick={() => setRepeatType('fixo')} className={`flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${repeatType === 'fixo' ? 'bg-[#1F1F1F] text-white shadow-xl' : 'bg-gray-50 text-gray-300'}`}>Fixo</button>
                        <button onClick={() => setRepeatType('parcelado')} className={`flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all ${repeatType === 'parcelado' ? 'bg-[#1F1F1F] text-white shadow-xl' : 'bg-gray-50 text-gray-300'}`}>Parcelado</button>
                    </div>
                    {repeatType === 'parcelado' && (
                        <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Número de parcelas:</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setInstallments(Math.max(1, installments - 1))} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#2C3E50] font-black hover:bg-gray-100">-</button>
                                <span className="text-2xl font-black text-[#2C3E50] w-8 text-center">{installments}</span>
                                <button onClick={() => setInstallments(installments + 1)} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#2C3E50] font-black hover:bg-gray-100">+</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-10 bg-white flex justify-center items-center relative">
                <button onClick={() => setView('HOME')} className="absolute left-10 p-4 text-gray-300 hover:text-red-500 transition-colors"><X size={32} /></button>
                <button
                    onClick={handleSave}
                    className={`w-24 h-24 ${entryType === 'receita' ? 'bg-[#2ECC71] shadow-[0_20px_50px_rgba(46,204,113,0.4)]' : (entryType === 'despesa' ? 'bg-red-500 shadow-[0_20px_50px_rgba(239,68,68,0.4)]' : 'bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)]')} rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all`}
                >
                    <Check size={40} className="text-white" strokeWidth={4} />
                </button>
            </div>
        </div>
    );

    // --- DESKTOP LAYOUT ---
    if (!isMobile) return (
        <div className="h-screen bg-[#FDFDFD] text-[#2C3E50] flex font-sans overflow-hidden">
            {/* Sidebar Fixa */}
            <aside className="w-96 bg-white p-8 flex flex-col h-screen overflow-y-auto border-r border-gray-100 z-50">
                <div className="mb-8 flex items-center justify-center border-b border-gray-50 pb-8">
                    <img src="./logo.png" alt="Minha Merreca" className="h-20 object-contain w-auto" />
                </div>

                <div className="space-y-6 mb-10">
                    <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                        <button onClick={() => setView('HOME')} className={`flex-1 flex items-center justify-center p-4 rounded-xl transition-all ${view === 'HOME' ? 'bg-[#2ECC71] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-white'}`} title="Dashboard"><Home size={20} strokeWidth={2.5} /></button>
                        <button onClick={() => setView('REPORTS')} className={`flex-1 flex items-center justify-center p-4 rounded-xl transition-all ${view === 'REPORTS' ? 'bg-[#2ECC71] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-white'}`} title="Mês a Mês"><BarChart2 size={20} strokeWidth={2.5} /></button>
                        <button onClick={() => setView('CAT_MGMT')} className={`flex-1 flex items-center justify-center p-4 rounded-xl transition-all ${view === 'CAT_MGMT' ? 'bg-[#2ECC71] text-white shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-white'}`} title="Categorias"><Settings size={20} strokeWidth={2.5} /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col bg-green-50/50 p-4 rounded-2xl border border-green-100">
                            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1 text-center">Entradas</span>
                            <span className="font-extrabold text-sm text-green-700 text-center tabular-nums">{formatBoleto(totals.income)}</span>
                        </div>
                        <div className="flex flex-col bg-red-50/50 p-4 rounded-2xl border border-red-100">
                            <span className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1 text-center">Saídas</span>
                            <span className="font-extrabold text-sm text-red-700 text-center tabular-nums">{formatBoleto(totals.expense)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 space-y-6 shadow-inner">
                    <div className="flex bg-white rounded-2xl p-1 border border-gray-100">
                        {['despesa', 'receita'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setEntryType(tab);
                                    if (tab === 'receita') setSelectedCat('dani');
                                    else setSelectedCat('outros');
                                }}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entryType === tab ? (tab === 'receita' ? 'bg-[#2ECC71] text-white shadow-lg' : 'bg-red-500 text-white shadow-lg') : 'text-gray-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block px-1">Quanto?</label>
                            <input
                                placeholder="0,00"
                                value={amount}
                                onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                                className="w-full bg-white border border-gray-100 p-5 rounded-2xl font-black text-2xl outline-none focus:border-[#2ECC71] text-[#2C3E50] text-center"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block px-1">O que é?</label>
                            <input
                                placeholder="Descrição"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-white border border-gray-100 p-5 rounded-2xl font-bold text-sm outline-none focus:border-[#2ECC71] text-[#2C3E50]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="bg-white border border-gray-100 p-4 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none text-gray-500 cursor-pointer">
                                {Object.entries(categories).filter(([k, v]) => !['receita', 'despesa'].includes(v.label.toLowerCase()) && v.type === entryType).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} className="bg-white border border-gray-100 p-4 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none text-gray-500 cursor-pointer">
                                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block px-1">Data (DD/MM/YY)</label>
                            <input
                                type="text"
                                placeholder="2026-01-30"
                                value={entryDate}
                                onChange={e => setEntryDate(e.target.value)}
                                className="w-full bg-white border border-gray-100 p-4 rounded-xl text-sm font-black text-gray-500 outline-none text-center"
                            />
                        </div>

                        <button onClick={handleSave} className={`w-full ${entryType === 'receita' ? 'bg-[#2ECC71]' : 'bg-red-500'} text-white py-5 rounded-2xl font-black text-sm tracking-widest shadow-lg active:scale-95 transition-all mt-2`}>LANÇAR AGORA</button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FDFDFD]">
                <header className="py-10 flex items-center justify-center flex-shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-[#2ECC71]"><ChevronLeft size={18} /></button>
                            <div className="px-10 text-center min-w-[200px]">
                                <span className="font-black text-sm uppercase tracking-[0.2em] text-[#2C3E50]">{MONTHS[viewMonth]} {viewYear}</span>
                            </div>
                            <button onClick={() => changeMonth(1)} className="p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-[#2ECC71]"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                </header>

                {view === 'HOME' && (
                    <div className="px-12 pb-20 flex-1 overflow-hidden flex flex-col">
                        <div className="bg-white rounded-[3.5rem] shadow-xl border border-gray-100 overflow-hidden flex-1 flex flex-col">
                            <div className="p-4 border-b border-gray-50 flex items-center bg-gray-50/50 overflow-x-auto scrollbar-hide">
                                <div className="flex items-center gap-4 min-w-max w-full text-gray-400">
                                    <button onClick={() => setActiveFilters({ category: 'all', type: 'all', payment: 'all', transactionType: 'all' })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeFilters.transactionType === 'all' && activeFilters.category === 'all' && activeFilters.type === 'all' ? 'bg-[#2ECC71] text-white shadow-sm' : 'hover:text-gray-600'}`}>Tudo</button>
                                    <span className="text-gray-200">|</span>
                                    <button onClick={() => setActiveFilters({ ...activeFilters, transactionType: 'receita' })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeFilters.transactionType === 'receita' ? 'bg-green-100 text-green-700' : 'hover:text-gray-600'}`}>Receitas</button>
                                    <button onClick={() => setActiveFilters({ ...activeFilters, transactionType: 'despesa' })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeFilters.transactionType === 'despesa' ? 'bg-red-100 text-red-700' : 'hover:text-gray-600'}`}>Despesas</button>
                                    <span className="text-gray-200">|</span>
                                    {['avista', 'fixo', 'parcelado'].map(f => (
                                        <button key={f} onClick={() => setActiveFilters({ ...activeFilters, type: f })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeFilters.type === f ? 'bg-gray-200 text-gray-800' : 'hover:text-gray-600'}`}>{f}</button>
                                    ))}
                                    <span className="text-gray-200">|</span>
                                    {Object.keys(PAYMENT_METHODS).map(k => (
                                        <button key={k} onClick={() => setActiveFilters({ ...activeFilters, payment: k })} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${activeFilters.payment === k ? 'bg-gray-200 text-gray-800' : 'hover:text-gray-600'}`}>{k}</button>
                                    ))}
                                    <span className="text-gray-200">|</span>
                                    {Object.entries(categories).filter(([k, v]) => k !== 'teste' && k !== 'despesas' && v.type !== 'receita').map(([k, v]) => (
                                        <button key={k} onClick={() => setActiveFilters({ ...activeFilters, category: k })} className={`px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${activeFilters.category === k ? 'bg-gray-200 text-gray-800' : 'hover:text-gray-600'}`}>{v.label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 bg-gray-50/20">
                                            <th className="px-8 py-8">Status</th>
                                            <th className="px-8 py-8 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('date')}>Data</th>
                                            <th className="px-8 py-8 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('description')}>Descrição</th>
                                            <th className="px-8 py-8 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('category')}>Categoria</th>
                                            <th className="px-8 py-8 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('repeatType')}>Tipo</th>
                                            <th className="px-8 py-8 text-center cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('parcelasTotal')}>Parcelas</th>
                                            <th className="px-8 py-8 cursor-pointer hover:text-[#2ECC71] transition-colors" onClick={() => toggleSort('paymentMethod')}>Pagamento</th>
                                            <th className="px-8 py-8 cursor-pointer hover:text-[#2ECC71] transition-colors text-right" onClick={() => toggleSort('amount')}>Valor</th>
                                            <th className="px-8 py-8">Observações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 font-bold text-sm text-slate-800">
                                        {filteredTransactions.map(t => {
                                            const cat = categories[t.category] || categories['outros'];
                                            const pay = PAYMENT_METHODS[t.paymentMethod] || PAYMENT_METHODS['PIX'];
                                            const isEditing = (field) => editingCell?.id === t.id && editingCell?.field === field;

                                            return (
                                                <tr key={t.id} className="hover:bg-gray-50 transition-colors group cursor-default">
                                                    <td className="px-8 py-6">
                                                        <button onClick={() => toggleStatus(t)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${t.status === 'pago' ? 'bg-[#2ECC71] text-white shadow-sm' : 'border border-gray-200 text-slate-400'}`}>
                                                            {t.status === 'pago' ? 'PAGO' : 'PENDENTE'}
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-6" onDoubleClick={() => setEditingCell({ id: t.id, field: 'date' })}>
                                                        {isEditing('date') ? (
                                                            <input
                                                                type="date"
                                                                defaultValue={t.date}
                                                                autoFocus
                                                                onBlur={(e) => handleInlineUpdate(t.id, 'date', e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(t.id, 'date', e.target.value)}
                                                                className="bg-white border border-gray-200 p-2 rounded text-[11px] outline-none w-full"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-500 text-[11px] tabular-nums font-black">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-slate-800" onDoubleClick={() => setEditingCell({ id: t.id, field: 'description' })}>
                                                        {isEditing('description') ? (
                                                            <input
                                                                type="text"
                                                                defaultValue={t.description}
                                                                autoFocus
                                                                onBlur={(e) => handleInlineUpdate(t.id, 'description', e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(t.id, 'description', e.target.value)}
                                                                className="bg-white border border-gray-200 p-2 rounded text-sm outline-none w-full font-bold"
                                                            />
                                                        ) : (
                                                            <span>{t.description}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6" onDoubleClick={() => setEditingCell({ id: t.id, field: 'category' })}>
                                                        {isEditing('category') ? (
                                                            <select
                                                                defaultValue={t.category}
                                                                autoFocus
                                                                onChange={(e) => handleInlineUpdate(t.id, 'category', e.target.value)}
                                                                onBlur={() => setEditingCell(null)}
                                                                className="bg-white border border-gray-200 p-2 rounded text-[10px] outline-none w-full uppercase font-black"
                                                            >
                                                                {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                            </select>
                                                        ) : (
                                                            <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">{cat.label}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-slate-400 uppercase text-[9px] font-black tracking-widest">{t.repeatType === 'avista' || !t.repeatType ? 'À Vista' : t.repeatType}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="text-slate-500 text-[10px] tabular-nums font-black tracking-widest">
                                                            {t.repeatType === 'parcelado' ? `${t.parcelaNum || 1}/${t.parcelasTotal || 1}` : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-slate-500" onDoubleClick={() => setEditingCell({ id: t.id, field: 'paymentMethod' })}>
                                                        {isEditing('paymentMethod') ? (
                                                            <select
                                                                defaultValue={t.paymentMethod}
                                                                autoFocus
                                                                onChange={(e) => handleInlineUpdate(t.id, 'paymentMethod', e.target.value)}
                                                                onBlur={() => setEditingCell(null)}
                                                                className="bg-white border border-gray-200 p-2 rounded text-[9px] outline-none w-full uppercase font-black"
                                                            >
                                                                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                            </select>
                                                        ) : (
                                                            <span className="uppercase text-[9px] font-black tracking-[0.1em]">{pay.label}</span>
                                                        )}
                                                    </td>
                                                    <td className={`px-8 py-6 text-right text-lg font-black ${t.type === 'receita' ? 'text-[#2ECC71]' : 'text-slate-800'}`} onDoubleClick={() => setEditingCell({ id: t.id, field: 'amount' })}>
                                                        {isEditing('amount') ? (
                                                            <input
                                                                type="text"
                                                                defaultValue={t.amount}
                                                                autoFocus
                                                                onBlur={(e) => handleInlineUpdate(t.id, 'amount', parseFloat(e.target.value.replace(',', '.')) || 0)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(t.id, 'amount', parseFloat(e.target.value.replace(',', '.')) || 0)}
                                                                className="bg-white border border-gray-200 p-2 rounded text-right text-lg outline-none w-full font-black"
                                                            />
                                                        ) : (
                                                            <span>{t.type === 'receita' ? '+' : '-'} {formatBoleto(t.amount)}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                placeholder="Notas..."
                                                                defaultValue={t.notes || ''}
                                                                onBlur={(e) => handleInlineUpdate(t.id, 'notes', e.target.value)}
                                                                className="bg-transparent border-none outline-none text-[10px] text-slate-400 focus:text-slate-800 w-full font-bold"
                                                            />
                                                            <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'REPORTS' && (
                    <div className="px-12 pb-20 flex-1 overflow-hidden flex flex-col">
                        <div className="bg-white rounded-[3.5rem] shadow-xl border border-gray-100 overflow-hidden flex-1 flex flex-col p-8">
                            <div className="flex items-center justify-between mb-8 flex-shrink-0">
                                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                                    <button onClick={() => setViewYear(v => v - 1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft size={16} /></button>
                                    <span className="w-16 text-center font-black text-xs uppercase tracking-widest">{viewYear}</span>
                                    <button onClick={() => setViewYear(v => v + 1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto bg-white rounded-3xl border border-gray-50">
                                <table className="w-full text-left border-collapse min-w-[1200px]">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-[#2C3E50]/40 border-b border-gray-100 bg-gray-50">
                                            <th className="px-6 py-4 w-64 sticky left-0 z-20 bg-gray-100/80">Categoria</th>
                                            {MONTHS.map(m => <th key={m} className="px-2 py-4 text-center">{m.slice(0, 3)}</th>)}
                                            <th className="px-6 py-4 text-right bg-green-50 text-[#2ECC71]">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {/* Summary Rows (Receita, Despesas, Saldo) */}
                                        <tr className="bg-yellow-400 group text-slate-800">
                                            <td className="px-6 py-2 sticky left-0 z-10 bg-yellow-400 border-r border-yellow-500/20">
                                                <span className="font-black text-[11px] uppercase tracking-wider">Receita</span>
                                            </td>
                                            {yearlyData.summary.income.slice(0, 12).map((val, idx) => (
                                                <td key={idx} className="px-2 py-2 text-center tabular-nums font-black text-xs text-pink-600">
                                                    {val > 0 ? formatBoleto(val).replace('R$', '').trim() : ''}
                                                </td>
                                            ))}
                                            <td className="px-6 py-2 text-right tabular-nums bg-yellow-500/20 font-black text-slate-800 text-xs">
                                                {formatBoleto(yearlyData.summary.income[12])}
                                            </td>
                                        </tr>
                                        <tr className="bg-pink-100 group text-slate-800">
                                            <td className="px-6 py-2 sticky left-0 z-10 bg-pink-100 border-r border-pink-200">
                                                <span className="font-black text-[11px] uppercase tracking-wider">Despesas</span>
                                            </td>
                                            {yearlyData.summary.expense.slice(0, 12).map((val, idx) => (
                                                <td key={idx} className="px-2 py-2 text-center tabular-nums font-black text-xs text-pink-600">
                                                    {val > 0 ? formatBoleto(val).replace('R$', '').trim() : ''}
                                                </td>
                                            ))}
                                            <td className="px-6 py-2 text-right tabular-nums bg-pink-200 font-black text-slate-800 text-xs">
                                                {formatBoleto(yearlyData.summary.expense[12])}
                                            </td>
                                        </tr>
                                        <tr className="bg-green-500 group text-white">
                                            <td className="px-6 py-2 sticky left-0 z-10 bg-green-500 border-r border-green-600">
                                                <span className="font-black text-[11px] uppercase tracking-wider">Saldo</span>
                                            </td>
                                            {yearlyData.summary.balance.slice(0, 12).map((val, idx) => (
                                                <td key={idx} className={`px-2 py-2 text-center tabular-nums font-black text-xs ${val >= 0 ? 'text-green-100' : 'text-red-200'}`}>
                                                    {formatBoleto(val).replace('R$', '').trim()}
                                                </td>
                                            ))}
                                            <td className="px-6 py-2 text-right tabular-nums bg-green-600 font-black text-white text-xs">
                                                {formatBoleto(yearlyData.summary.balance[12])}
                                            </td>
                                        </tr>

                                        {/* Category Rows */}
                                        {yearlyData.rows.map(row => (
                                            <tr key={row.id} className="hover:bg-gray-50 transition-colors group text-[#2C3E50]">
                                                <td className="px-6 py-2 bg-white sticky left-0 z-10 border-r border-gray-50">
                                                    <span className="font-black text-[11px] uppercase tracking-wider">{row.config.label}</span>
                                                </td>
                                                {row.values.slice(0, 12).map((val, idx) => (
                                                    <td key={idx} className={`px-2 py-2 text-center tabular-nums font-extrabold text-xs ${val > 0 ? 'text-pink-500' : 'text-gray-200'}`}>
                                                        {val > 0 ? formatBoleto(val).replace('R$', '').trim() : '0'}
                                                    </td>
                                                ))}
                                                <td className="px-6 py-2 text-right tabular-nums bg-gray-50 font-black text-slate-800 text-xs">
                                                    {formatBoleto(row.values[12])}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* TOTAL (bottom) */}
                                        <tr className="bg-gray-50 font-black text-[#2C3E50] border-t-2 border-gray-200">
                                            <td className="px-6 py-4 sticky left-0 z-10 bg-gray-50 border-r border-gray-100">
                                                <span className="text-[11px] uppercase tracking-wider">TOTAL</span>
                                            </td>
                                            {yearlyData.summary.expense.slice(0, 12).map((val, idx) => (
                                                <td key={idx} className="px-2 py-4 text-center tabular-nums text-xs text-pink-600">
                                                    {formatBoleto(val).replace('R$', '').trim()}
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 text-right tabular-nums bg-gray-100/50 text-slate-800 text-xs">
                                                {formatBoleto(yearlyData.summary.expense[12])}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Overlays / Modals */}
            {view === 'CAT_MGMT' && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] animate-in fade-in duration-300 flex justify-end" onClick={() => setView('HOME')}>
                    <div className="w-[600px] h-full shadow-2xl bg-white border-l border-gray-100 p-10 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h1 className="text-3xl font-black text-[#2C3E50] tracking-tighter">Minhas Categorias</h1>
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">Personalize seus filtros</p>
                            </div>
                            <button onClick={() => setView('HOME')} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors shadow-sm"><X size={24} /></button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto pb-32">
                            {Object.entries(categories)
                                .filter(([k]) => k !== 'teste')
                                .map(([k, v]) => (
                                    <div key={k} className="bg-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm border border-gray-50 group hover:border-[#2ECC71]/30 transition-all">
                                        <div className="flex items-center gap-5">
                                            <div>
                                                <p className="font-black text-lg text-[#2C3E50] leading-tight">{v.label}</p>
                                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">{v.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {!Object.keys(INITIAL_CATEGORIES).includes(k) && (
                                                <button onClick={() => deleteCategory(k)} className="p-3 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="pt-8 border-t border-gray-50 bg-white">
                            <button onClick={addCategory} className="w-full bg-[#1F1F1F] text-white py-6 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-black active:scale-[0.98] transition-all shadow-lg">
                                <Plus size={20} strokeWidth={4} /> Adicionar Nova Categoria
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // --- MOBILE LAYOUT ---
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
            <div className="px-6 py-6 scroll-smooth">
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
                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Movimentação</p>
                                <select value={activeFilters.transactionType} onChange={e => setActiveFilters({ ...activeFilters, transactionType: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl outline-none text-xs font-bold text-gray-500">
                                    <option value="all">Tudo</option>
                                    <option value="receita">Receitas</option>
                                    <option value="despesa">Despesas</option>
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
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-between px-10 py-5 z-40 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <button onClick={() => setView('HOME')} className={`p-2 transition-all ${view === 'HOME' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Home size={26} strokeWidth={2.5} /></button>
                <button onClick={() => setView('REPORTS')} className={`p-2 transition-all ${view === 'REPORTS' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><BarChart2 size={26} strokeWidth={2.5} /></button>
                <button onClick={() => setView('CAT_MGMT')} className={`p-2 transition-all ${view === 'CAT_MGMT' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Settings size={26} strokeWidth={2.5} /></button>
                <button
                    onClick={() => { resetForm(); setView('ENTRY'); }}
                    className="w-16 h-16 bg-[#2ECC71] rounded-2xl flex items-center justify-center shadow-[0_15px_40px_rgba(46,204,113,0.3)] active:scale-95 transition-all"
                >
                    <Plus size={32} className="text-white" strokeWidth={3} />
                </button>
            </div>

            {/* Category Management */}
            {view === 'CAT_MGMT' && (
                <div className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[200] animate-in fade-in duration-300 flex ${!isMobile ? 'justify-end' : ''}`} onClick={() => setView('HOME')}>
                    <div className={`${!isMobile ? 'w-[600px] h-full shadow-2xl bg-white border-l border-gray-100' : 'w-full h-full bg-[#F8F9FA]'} p-10 flex flex-col`} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h1 className="text-3xl font-black text-[#2C3E50] tracking-tighter">Minhas Categorias</h1>
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">Personalize seus filtros</p>
                            </div>
                            <button onClick={() => setView('HOME')} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors shadow-sm"><X size={24} /></button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto pb-32">
                            {Object.entries(categories)
                                .filter(([k]) => k !== 'teste')
                                .map(([k, v]) => (
                                    <div key={k} className="bg-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm border border-gray-50 group hover:border-[#2ECC71]/30 transition-all">
                                        <div className="flex items-center gap-5">
                                            <div>
                                                <p className="font-black text-lg text-[#2C3E50] leading-tight">{v.label}</p>
                                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">{v.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {!Object.keys(INITIAL_CATEGORIES).includes(k) && k !== 'dani' && k !== 'portipar' && k !== 'gui' && k !== 'lindezo' && k !== 'airbnb' && (
                                                <button onClick={() => deleteCategory(k)} className="p-3 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="pt-8 border-t border-gray-50 bg-white">
                            <button onClick={addCategory} className="w-full bg-[#1F1F1F] text-white py-6 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-black active:scale-[0.98] transition-all shadow-lg">
                                <Plus size={20} strokeWidth={4} /> Adicionar Nova Categoria
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // --- MOBILE LAYOUT ---
    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-32">
            <PeriodHeader />

            <div className="px-6 py-6 h-[calc(100vh-280px)] overflow-y-auto">
                <div className="space-y-2">
                    {filteredTransactions.map(t => (
                        <div key={t.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-8 rounded-full ${t.type === 'receita' ? 'bg-[#2ECC71]' : 'bg-red-400'}`} />
                                <div>
                                    <h3 className="font-bold text-xs text-slate-800 line-clamp-1">{t.description}</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{categories[t.category]?.label || 'Outros'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-black text-xs ${t.type === 'receita' ? 'text-[#2ECC71]' : 'text-slate-800'}`}>
                                    {t.type === 'receita' ? '+' : '-'} {formatBoleto(t.amount)}
                                </p>
                                <div className="flex items-center justify-end gap-2 mt-1">
                                    <button onClick={() => toggleStatus(t)} className={`p-1 rounded-md transition-all ${t.status === 'pago' ? 'text-[#2ECC71]' : 'text-slate-300'}`}>
                                        <Check size={14} strokeWidth={4} />
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
                                    }} className="text-slate-200"><Edit2 size={12} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredTransactions.length === 0 && (
                        <div className="py-20 text-center opacity-20 italic font-bold">Nenhuma merreca encontrada</div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-4 z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <button onClick={() => setView('CAT_MGMT')} className={`p-3 transition-colors ${view === 'CAT_MGMT' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Settings size={24} /></button>
                <button onClick={() => setView('REPORTS')} className={`p-3 transition-colors ${view === 'REPORTS' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><BarChart2 size={24} /></button>
                <button onClick={() => setView('HOME')} className={`p-3 transition-colors ${view === 'HOME' ? 'text-[#2ECC71]' : 'text-gray-300'}`}><Home size={24} /></button>
                <button onClick={() => { resetForm(); setView('ENTRY'); }} className="w-14 h-14 bg-[#2ECC71] rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all">
                    <Plus size={28} strokeWidth={4} />
                </button>
            </div>
        </div>
    );
}
