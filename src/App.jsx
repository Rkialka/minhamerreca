import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Lock, ArrowUp, ArrowDown, Check, X, Home,
    DollarSign, Receipt, ShoppingCart, Car, Heart, PartyPopper, ShoppingBag,
    BarChart2, Calendar, CreditCard, Wallet, MoreHorizontal, Edit2, Trash2, Copy,
    ArrowRightLeft, Filter, Settings, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Coffee, Sparkles, EyeOff, Menu, SendHorizontal, Paperclip, FileText, Image
} from 'lucide-react';
import * as Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import { db } from './firebaseConfig';
import {
    collection, addDoc, onSnapshot, query,
    deleteDoc, doc, updateDoc, writeBatch, serverTimestamp, setDoc
} from 'firebase/firestore';

// --- CONSTANTES ---
const INITIAL_CATEGORIES = {
    'dani': { icon: 'Heart', label: 'Dani', color: 'bg-[#FF7675]', type: 'entrada' },
    'portipar': { icon: 'DollarSign', label: 'Portipar', color: 'bg-[#2ECC71]', type: 'entrada' },
    'gui': { icon: 'Heart', label: 'Gui', color: 'bg-[#FF7675]', type: 'entrada' },
    'lindezo': { icon: 'Heart', label: 'Lindezo', color: 'bg-[#FF7675]', type: 'entrada' },
    'airbnb': { icon: 'Home', label: 'Airbnb', color: 'bg-[#FF5A5F]', type: 'entrada' },
    'outras-receitas': { icon: 'MoreHorizontal', label: 'Outras Entradas', color: 'bg-[#7F8C8D]', type: 'entrada' },
    'mercado': { icon: 'ShoppingCart', label: 'Mercado', color: 'bg-[#F1C40F]', type: 'saida' },
    'casa': { icon: 'Home', label: 'Casa', color: 'bg-[#3498DB]', type: 'saida' },
    'saude': { icon: 'Heart', label: 'Saúde', color: 'bg-[#9B59B6]', type: 'saida' },
    'beleza': { icon: 'Sparkles', label: 'Beleza', color: 'bg-[#FF9FF3]', type: 'saida' },
    'transporte': { icon: 'Car', label: 'Transporte', color: 'bg-[#95A5A6]', type: 'saida' },
    'servicos': { icon: 'Receipt', label: 'Serviços', color: 'bg-[#1ABC9C]', type: 'saida' },
    'educacao': { icon: 'BookOpen', label: 'Educação', color: 'bg-[#34495E]', type: 'saida' },
    'lazer': { icon: 'PartyPopper', label: 'Lazer', color: 'bg-[#E67E22]', type: 'saida' },
    'alimentacao': { icon: 'Coffee', label: 'Alimentação', color: 'bg-[#D35400]', type: 'saida' },
    'vestuario': { icon: 'ShoppingBag', label: 'Vestuário', color: 'bg-[#BDC3C7]', type: 'saida' },
    'casamento': { icon: 'Heart', label: 'Casamento', color: 'bg-[#FF7675]', type: 'saida' },
    'outros': { icon: 'MoreHorizontal', label: 'Outros', color: 'bg-[#7F8C8D]', type: 'saida' }
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
        BarChart2, Calendar, CreditCard, Wallet, MoreHorizontal, Edit2, Trash2, Copy,
        ArrowRightLeft, Filter, Settings, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Coffee, Sparkles, EyeOff, SendHorizontal
    };
    const Icon = icons[name] || MoreHorizontal;
    return <Icon size={size} className={className} />;
};

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-[#2C3E50]">
                    <AlertCircle size={64} className="text-red-500 mb-6" />
                    <h1 className="text-2xl font-black mb-4">Algo deu errado!</h1>
                    <div className="bg-white p-6 rounded-2xl shadow-sm text-left w-full max-w-lg overflow-auto border border-red-100">
                        <p className="font-bold text-red-500 mb-2">Erro: {this.state.error?.message}</p>
                        <pre className="text-[10px] text-gray-500 whitespace-pre-wrap font-mono">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-8 py-4 bg-[#2C3E50] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        Tentar Novamente
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="mt-4 px-8 py-3 bg-transparent text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-red-500"
                    >
                        Limpar Dados Locais (Reset)
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

function MinhaMerrecaContent() {
    const [view, setView] = useState('HOME'); // HOME, ENTRY, REPORTS, CAT_MGMT
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState(INITIAL_CATEGORIES);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [editingCell, setEditingCell] = useState(null); // { id: '...', field: '...' }
    const [editingCatId, setEditingCatId] = useState(null);
    const [merrecaOpen, setMerrecaOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: 'Olá! Sou a Merreca, sua assistente financeira. Como posso ajudar você hoje?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [deleteModal, setDeleteModal] = useState(null); // { id, type, repeatType }

    // Monitorar tamanho da tela
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync Chat do Firebase
    useEffect(() => {
        const q = query(collection(db, "chat_history"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const msgs = snapshot.docs
                    .map(d => d.data())
                    .sort((a, b) => a.timestamp - b.timestamp);
                if (msgs.length > 0) setChatMessages(msgs);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync Categorias do Firebase
    useEffect(() => {
        const q = query(collection(db, "categories"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = {};
                snapshot.docs.forEach(d => {
                    data[d.id] = d.data();
                });
                setCategories(prev => ({ ...prev, ...data }));
            }
        });
        return () => unsubscribe();
    }, []);

    // Scroll chat to bottom
    useEffect(() => {
        if (merrecaOpen) {
            const bottom = document.getElementById('chat-bottom');
            bottom?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, merrecaOpen, isTyping]);

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
    const [entryType, setEntryType] = useState('saida'); // entrada, saida
    const [amount, setAmount] = useState('0.00');
    const [description, setDescription] = useState('');
    const [selectedCat, setSelectedCat] = useState('dani');
    const [selectedPayment, setSelectedPayment] = useState('PIX');
    const [entryDate, setEntryDate] = useState(now.toISOString().split('T')[0]);
    const [repeatType, setRepeatType] = useState('avista'); // avista, fixo, parcelado
    const [installments, setInstallments] = useState(1);
    const [ignoreInReports, setIgnoreInReports] = useState(false);
    const [status, setStatus] = useState('pago'); // pago, pendente

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

    // Splash Screen State
    const [showSplash, setShowSplash] = useState(true);
    const [showSuccessSplash, setShowSuccessSplash] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
            if (isMobile) setView('ENTRY');
        }, 3000);
        return () => clearTimeout(timer);
    }, [isMobile]);

    // --- COMPUTED DATA ---
    const monthTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date + 'T12:00:00');
            return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
        });
    }, [transactions, viewMonth, viewYear]);

    const filteredTransactions = useMemo(() => {
        let result = monthTransactions.filter(t => {
            const matchCat = activeFilters.category === 'all' || t.category === activeFilters.category;
            const matchType = activeFilters.type === 'all' || t.repeatType === activeFilters.type;
            const matchPayment = activeFilters.payment === 'all' || t.paymentMethod === activeFilters.payment;
            let matchTxType = true;
            if (activeFilters.transactionType !== 'all') {
                const rawType = t.type || 'saida';
                const normType = rawType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (activeFilters.transactionType === 'entrada') matchTxType = normType === 'entrada' || normType === 'receita';
                else if (activeFilters.transactionType === 'saida') matchTxType = normType === 'saida' || normType === 'despesa';
            }
            return matchCat && matchType && matchPayment && matchTxType;
        });
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
    }, [monthTransactions, activeFilters, sortConfig, categories]);

    const totals = useMemo(() => {
        let income = 0;
        let expense = 0;
        monthTransactions.forEach((t) => {
            const rawType = t.type || 'saida';
            const type = rawType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const status = (t.status || 'pendente').toLowerCase();
            let amount = t.amount;
            if (typeof amount === 'string') amount = parseFloat(amount.replace(',', '.'));
            amount = Number(amount);
            if (t.ignoreInReports) return;
            if (status !== 'pago') return;
            if (isNaN(amount) || amount === 0) return;
            const absAmount = Math.abs(amount);
            if (type === 'entrada' || type === 'receita') income += absAmount;
            else if (type === 'saida' || type === 'despesa') expense += absAmount;
        });
        return {
            income: Math.round(income * 100) / 100,
            expense: Math.round(expense * 100) / 100,
            balance: Math.round((income - expense) * 100) / 100
        };
    }, [monthTransactions]);

    const categoryStats = useMemo(() => {
        const stats = {};
        let totalExpenses = 0;
        filteredTransactions.forEach(t => {
            const rawType = t.type || 'saida';
            const type = rawType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const status = (t.status || 'pendente').toLowerCase();
            if (t.ignoreInReports) return;
            if (status !== 'pago') return;
            if (type === 'saida' || type === 'despesa') {
                let amount = t.amount;
                if (typeof amount === 'string') amount = parseFloat(amount.replace(',', '.'));
                amount = Number(amount);
                if (!isNaN(amount) && amount !== 0) {
                    const absAmount = Math.abs(amount);
                    const catKey = categories[t.category] ? t.category : 'outros';
                    stats[catKey] = (stats[catKey] || 0) + absAmount;
                    totalExpenses += absAmount;
                }
            }
        });
        return Object.entries(stats)
            .map(([cat, total]) => ({
                id: cat,
                total,
                percent: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
                config: categories[cat] || categories['outros']
            }))
            .filter(item => item.id !== 'teste' && item.config.type !== 'entrada' && item.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [filteredTransactions, categories]);

    const yearlyData = useMemo(() => {
        const matrix = {};
        const monthIncome = new Array(12).fill(0);
        const monthExpense = new Array(12).fill(0);
        transactions.forEach(t => {
            if (t.ignoreInReports) return;
            if ((t.status || '').toLowerCase() !== 'pago') return;
            const d = new Date(t.date + 'T12:00:00');
            if (d.getFullYear() === viewYear) {
                const m = d.getMonth();
                let amt = t.amount;
                if (typeof amt === 'string') amt = parseFloat(amt.replace(',', '.'));
                amt = Number(amt);
                if (isNaN(amt) || amt === 0) return;
                const absAmt = Math.abs(amt);
                const rawType = t.type || 'saida';
                const type = rawType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (type === 'entrada' || type === 'receita') monthIncome[m] += absAmt;
                else if (type === 'saida' || type === 'despesa') {
                    const catKey = categories[t.category] ? t.category : 'outros';
                    if (!matrix[catKey]) matrix[catKey] = new Array(13).fill(0);
                    matrix[catKey][m] += absAmt;
                    matrix[catKey][12] += absAmt;
                    monthExpense[m] += absAmt;
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
            summary: { income: incomeValues, expense: expenseValues, balance: balanceValues }
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
            ignoreInReports: ignoreInReports,
            updatedAt: serverTimestamp()
        };
        try {
            const batch = writeBatch(db);
            const startDate = new Date(entryDate + 'T12:00:00');
            if (repeatType === 'fixo') {
                if (editingId) {
                    await updateDoc(doc(db, "transactions", editingId), { ...baseData, date: entryDate, status: transactions.find(tx => tx.id === editingId)?.status || 'pago' });
                } else {
                    for (let i = 0; i < 12; i++) {
                        const d = new Date(startDate);
                        d.setMonth(d.getMonth() + i);
                        const newDoc = doc(collection(db, "transactions"));
                        batch.set(newDoc, { ...baseData, date: d.toISOString().split('T')[0], status: i === 0 ? status : 'não pago' });
                    }
                    await batch.commit();
                }
            } else if (repeatType === 'parcelado') {
                if (editingId) {
                    await updateDoc(doc(db, "transactions", editingId), { ...baseData, date: entryDate, status: transactions.find(tx => tx.id === editingId)?.status || 'pago' });
                } else {
                    for (let i = 0; i < installments; i++) {
                        const d = new Date(startDate);
                        d.setMonth(d.getMonth() + i);
                        const newDoc = doc(collection(db, "transactions"));
                        batch.set(newDoc, { ...baseData, date: d.toISOString().split('T')[0], status: 'não pago', parcelaNum: i + 1, parcelasTotal: installments });
                    }
                    await batch.commit();
                }
            } else {
                if (editingId) {
                    await updateDoc(doc(db, "transactions", editingId), { ...baseData, date: entryDate, status: transactions.find(tx => tx.id === editingId)?.status || 'pago' });
                } else {
                    await addDoc(collection(db, "transactions"), { ...baseData, date: entryDate, status: status });
                }
            }
            setShowSuccessSplash(true);
            setTimeout(() => {
                setShowSuccessSplash(false);
                resetForm();
                if (isMobile) setView('HOME');
            }, 3000);
        } catch (e) { alert("Erro ao salvar: " + e.message); }
    };

    const handleDelete = async (id) => {
        const transaction = transactions.find(t => t.id === id);
        if (transaction && (transaction.repeatType === 'fixo' || transaction.repeatType === 'parcelado')) {
            setDeleteModal({ id, transaction });
        } else {
            if (confirm("Quer mesmo apagar essa merreca?")) await deleteDoc(doc(db, "transactions", id));
        }
    };

    const handleDeleteConfirm = async (option) => {
        if (!deleteModal) return;
        const { id, transaction } = deleteModal;
        try {
            if (option === 'single') await deleteDoc(doc(db, "transactions", id));
            else if (option === 'future') {
                const currentDate = new Date(transaction.date + 'T12:00:00');
                const batch = writeBatch(db);
                transactions.forEach(t => {
                    const tDate = new Date(t.date + 'T12:00:00');
                    if (t.category === transaction.category && t.description === transaction.description && t.repeatType === transaction.repeatType && tDate >= currentDate) {
                        batch.delete(doc(db, "transactions", t.id));
                    }
                });
                await batch.commit();
            }
            setDeleteModal(null);
            showToast("Apagado!");
        } catch (e) { alert("Erro ao apagar: " + e.message); }
    };

    const handleDuplicate = async (transaction) => {
        try {
            const newTransaction = { ...transaction, date: new Date().toISOString().split('T')[0], status: 'não pago', updatedAt: serverTimestamp() };
            delete newTransaction.id;
            delete newTransaction.createdAt;
            await addDoc(collection(db, "transactions"), newTransaction);
            showToast("Duplicado!");
        } catch (e) { alert("Erro ao duplicar: " + e.message); }
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
        setIgnoreInReports(false);
        setStatus('pago');
        setSelectedCat(entryType === 'entrada' ? 'dani' : 'outros');
    };

    const changeMonth = (offset) => {
        let nm = viewMonth + offset;
        let ny = viewYear;
        if (nm > 11) { nm = 0; ny++; }
        if (nm < 0) { nm = 11; ny--; }
        setViewMonth(nm);
        setViewYear(ny);
    };

    const formatBoleto = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // --- MERRECA CHAT FUNCTIONS ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsTyping(true);
        const userMsg = { role: 'user', content: `Anexei um arquivo: ${file.name}. Analisando...`, timestamp: Date.now() };
        setChatMessages(prev => [...prev, userMsg]);
        await addDoc(collection(db, "chat_history"), userMsg);

        try {
            let fileContent = "";
            if (file.type.includes('image')) {
                const { data: { text } } = await Tesseract.recognize(file);
                fileContent = text;
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                fileContent = XLSX.utils.sheet_to_txt(workbook.Sheets[workbook.SheetNames[0]]);
            } else if (file.type === 'application/pdf') {
                fileContent = "PDF upload for analysis via GPT-4 Vision simulation.";
            }

            await askMerreca(`[ARQUIVO ANALISADO: ${file.name}]\nConteúdo extraído:\n${fileContent.slice(0, 2000)}\n\nPor favor, analise este documento e sugira os lançamentos necessários ou responda minhas dúvidas sobre ele.`, true);
        } catch (error) {
            console.error(error);
            const errMsg = { role: 'assistant', content: 'Erro ao ler o arquivo. Tente novamente.', timestamp: Date.now() };
            setChatMessages(prev => [...prev, errMsg]);
            await addDoc(collection(db, "chat_history"), errMsg);
        } finally {
            setIsTyping(false);
        }
    };

    const askMerreca = async (userMessage, isAuto = false) => {
        if (!userMessage.trim()) return;

        if (!isAuto) {
            const userMsg = { role: 'user', content: userMessage, timestamp: Date.now() };
            setChatMessages(prev => [...prev, userMsg]);
            await addDoc(collection(db, "chat_history"), userMsg);
        }

        setChatInput('');
        setIsTyping(true);

        const apiKey = "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";

        try {
            const monthTxs = monthTransactions.filter(t => !t.ignoreInReports && t.status === 'pago');
            const summary = monthTxs.slice(0, 30).map(t => `${t.date}: ${t.description} - ${formatBoleto(t.amount)} (${categories[t.category]?.label})`).join('\n');
            const historicalSummary = MONTHS.map((m, i) => {
                const inc = yearlyData.summary.income[i];
                const exp = yearlyData.summary.expense[i];
                if (inc === 0 && exp === 0) return null;
                return `${m}/${viewYear}: Entradas ${formatBoleto(inc)}, Saídas ${formatBoleto(exp)}`;
            }).filter(Boolean).join('\n');

            const systemPrompt = `Você é "Merreca", assistente financeiro. Responda de forma curta e amigável.
            DADOS DO ANO: ${historicalSummary}
            DADOS MÊS: Entradas ${formatBoleto(totals.income)}, Saídas ${formatBoleto(totals.expense)}, Saldo ${formatBoleto(totals.balance)}
            TAXONOMIA (Categorias disponíveis): ${Object.values(categories).map(c => c.label).join(', ')}

            REGRAS PARA LANÇAMENTO AUTOMÁTICO:
            Se houver dados de despesa/receita, adicione ao fim: [NEW_TRANSACTION: { "description": "...", "amount": 0.00, "category": "cat_id", "type": "saida|entrada", "date": "YYYY-MM-DD" }]`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'system', content: systemPrompt }, ...chatMessages.slice(-8).map(m => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage }],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            const aiContent = data.choices[0].message.content;

            const txMatch = aiContent.match(/\[NEW_TRANSACTION: (.*?)\]/);
            if (txMatch) {
                try {
                    const txData = JSON.parse(txMatch[1]);
                    await addDoc(collection(db, "transactions"), { ...txData, status: 'pago', repeatType: 'avista', installments: 1, ignoreInReports: false, createdAt: serverTimestamp() });
                } catch (err) { console.error(err); }
            }

            const aiMsg = { role: 'assistant', content: aiContent.replace(/\[NEW_TRANSACTION: .*?\]/, '✅ Lançamento realizado!'), timestamp: Date.now() };
            setChatMessages(prev => [...prev, aiMsg]);
            await addDoc(collection(db, "chat_history"), aiMsg);
        } catch (e) { console.error(e); }
        finally { setIsTyping(false); }
    };

    const renderMerrecaChat = () => {
        if (!merrecaOpen) return null;
        return (
            <div className="fixed inset-0 bg-[#2C3E50]/80 backdrop-blur-md z-[300] flex items-center justify-center p-4" onClick={() => setMerrecaOpen(false)}>
                <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="bg-gradient-to-br from-[#8E44AD] to-[#6C3483] p-8 text-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Sparkles size={24} className="text-yellow-300" />
                            <div><h2 className="text-2xl font-black">Merreca Chat</h2><p className="opacity-60 text-xs">Sua IA Financeira</p></div>
                        </div>
                        <button onClick={() => setMerrecaOpen(false)} className="p-3 bg-white/10 rounded-2xl"><X size={20} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col bg-[#FDFDFD]">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-5 rounded-[2rem] font-bold text-sm border whitespace-pre-wrap ${msg.role === 'assistant' ? 'bg-white text-slate-800' : 'bg-[#8E44AD] text-white'}`}>
                                    {msg.content.split('**').map((part, i) => i % 2 === 1 ? <b key={i} className="font-black">{part}</b> : part)}
                                </div>
                            </div>
                        ))}
                        <div id="chat-bottom"></div>
                    </div>
                    <div className="p-8 bg-white border-t border-gray-100">
                        <form
                            onSubmit={(e) => { e.preventDefault(); askMerreca(chatInput); }}
                            className="flex items-center gap-3 bg-gray-50 p-2 rounded-[2.5rem] border border-gray-100 focus-within:border-[#8E44AD] transition-all"
                        >
                            <label className="flex items-center justify-center w-12 h-12 rounded-full text-slate-400 hover:text-[#8E44AD] hover:bg-white hover:shadow-md cursor-pointer transition-all shrink-0">
                                <Paperclip size={22} />
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept="image/*,application/pdf,.xls,.xlsx"
                                />
                            </label>

                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Pergunte ou anexe algo..."
                                className="flex-1 bg-transparent px-2 py-4 font-bold text-sm outline-none text-slate-700"
                            />

                            <button
                                type="submit"
                                disabled={isTyping || !chatInput.trim()}
                                className="bg-[#8E44AD] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shrink-0"
                            >
                                <SendHorizontal size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    // --- UI COMPONENTS ---
    const PeriodHeader = () => (
        <div className="bg-white text-[#2C3E50] px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm sticky top-0 z-30">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full bg-gray-50"><ChevronLeft size={20} /></button>
                <div className="text-center font-bold text-sm text-[#8E44AD] bg-gray-100 px-4 py-2 rounded-full">{MONTHS[viewMonth]} {viewYear}</div>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full bg-gray-50"><ChevronRight size={20} /></button>
            </div>
            <div className="flex gap-4">
                <div className="flex-1 bg-green-50 p-4 rounded-3xl border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Entrou</p>
                    <p className="text-lg font-bold text-green-700">{formatBoleto(totals.income)}</p>
                </div>
                <div className="flex-1 bg-red-50 p-4 rounded-3xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Saiu</p>
                    <p className="text-lg font-bold text-red-700">{formatBoleto(totals.expense)}</p>
                </div>
            </div>
        </div>
    );

    const TransactionItem = ({ t }) => {
        const cat = categories[t.category] || categories['outros'];
        const isPlus = (t.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'entrada';
        return (
            <div className="bg-white p-5 rounded-[2.5rem] shadow-sm mb-4 border border-gray-50 hover:shadow-md transition-all group">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 ${cat.color} rounded-[1.8rem] flex items-center justify-center text-white shadow-sm`}>
                            <IconRenderer name={cat.icon} size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{cat.label}</p>
                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-[#8E44AD] transition-colors line-clamp-1">{t.description}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full">{new Date(t.date + 'T12:00:00').toLocaleDateString()}</span>
                                {t.repeatType !== 'avista' && (
                                    <span className="text-[10px] font-bold text-purple-400 bg-purple-50 px-2 py-0.5 rounded-full uppercase italic">
                                        {t.repeatType === 'fixo' ? 'Fixo' : `Parcela ${t.parcelaNum}/${t.parcelasTotal}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <p className={`text-xl font-black tabular-nums ${isPlus ? 'text-green-500' : 'text-red-500'}`}>
                            {isPlus ? '+' : '-'} {formatBoleto(t.amount)}
                        </p>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => toggleStatus(t)} className={`p-2 rounded-xl transition-all ${t.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                <Check size={16} strokeWidth={3} />
                            </button>
                            <button onClick={() => {
                                setEditingId(t.id);
                                setAmount(t.amount.toString());
                                setDescription(t.description);
                                setSelectedCat(t.category);
                                setSelectedPayment(t.paymentMethod);
                                setEntryType(t.type || 'saida');
                                setEntryDate(t.date);
                                setRepeatType(t.repeatType || 'avista');
                                setInstallments(t.parcelasTotal || 1);
                                setIgnoreInReports(t.ignoreInReports || false);
                                setView('ENTRY');
                            }} className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    if (showSplash) return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center animate-out fade-out duration-500 delay-[2500ms]">
            <div className="animate-in zoom-in duration-1000">
                <img src="./logo.png" alt="Minha Merreca" className="w-64 h-auto object-contain mb-8" />
            </div>
            <div className="w-12 h-12 border-4 border-[#8E44AD] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (showSuccessSplash) return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center animate-in zoom-in duration-300">
            <div className="mb-8">
                <img src="./logo.png" alt="Minha Merreca" className="w-56 h-auto object-contain" />
            </div>
            <div className="bg-[#8E44AD]/10 p-6 rounded-full mb-6">
                <Check size={64} className="text-[#8E44AD]" strokeWidth={4} />
            </div>
            <h1 className="text-4xl font-black text-[#2C3E50] tracking-tight">Anotado!</h1>
            <p className="text-gray-400 font-bold mt-2 animate-pulse">Salvando sua merreca...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24 lg:flex">
            {/* Sidebar Desktop */}
            <aside className={`hidden lg:flex flex-col bg-white border-r w-72 h-screen sticky top-0 transition-all ${!sidebarOpen ? 'w-20' : ''}`}>
                <div className="p-8"><h1 className={`font-black text-2xl text-[#8E44AD] transition-all ${!sidebarOpen ? 'opacity-0 scale-0' : ''}`}>MERRECA</h1></div>
                <nav className="flex-1 px-4 space-y-2">
                    <button onClick={() => setView('HOME')} className={`w-full flex items-center p-4 rounded-2xl gap-3 font-bold ${view === 'HOME' ? 'bg-[#8E44AD] text-white' : 'text-slate-400'}`}><Home size={20} /> {sidebarOpen && "Início"}</button>
                    <button onClick={() => setView('REPORTS')} className={`w-full flex items-center p-4 rounded-2xl gap-3 font-bold ${view === 'REPORTS' ? 'bg-[#8E44AD] text-white' : 'text-slate-400'}`}><BarChart2 size={20} /> {sidebarOpen && "Relatórios"}</button>
                    <button onClick={() => setView('CAT_MGMT')} className={`w-full flex items-center p-4 rounded-2xl gap-3 font-bold ${view === 'CAT_MGMT' ? 'bg-[#8E44AD] text-white' : 'text-slate-400'}`}><Settings size={20} /> {sidebarOpen && "Categorias"}</button>
                    <button onClick={() => setMerrecaOpen(true)} className="w-full flex items-center p-4 rounded-2xl gap-3 font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"><Sparkles size={20} /> {sidebarOpen && "Merreca Chat"}</button>
                </nav>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {isMobile ? <PeriodHeader /> : null}

                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                    {feedback && <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-8 py-4 rounded-full font-bold shadow-2xl z-[500] animate-in fade-in slide-in-from-top-4">{feedback}</div>}

                    {view === 'HOME' && (
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-wider">Últimas Merrecas</h2>
                            {filteredTransactions.map(t => <TransactionItem key={t.id} t={t} />)}
                            {filteredTransactions.length === 0 && <div className="py-20 text-center text-slate-300 font-bold italic">Nada por aqui ainda...</div>}
                        </div>
                    )}

                    {view === 'ENTRY' && (
                        <div className="max-w-xl mx-auto">
                            <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-gray-100">
                                <div className="flex bg-gray-100 p-2 rounded-[2.5rem] mb-10">
                                    <button
                                        onClick={() => { setEntryType('saida'); setSelectedCat('outros'); }}
                                        className={`flex-1 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all ${entryType === 'saida' ? 'bg-white text-red-500 shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        💔 Despesa
                                    </button>
                                    <button
                                        onClick={() => { setEntryType('entrada'); setSelectedCat('dani'); }}
                                        className={`flex-1 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all ${entryType === 'entrada' ? 'bg-white text-green-500 shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        💰 Receita
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="group">
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest">Valor da Merreca</label>
                                        <div className="relative flex items-center">
                                            <span className="absolute left-6 text-2xl font-black text-slate-300">R$</span>
                                            <input
                                                autoFocus
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                placeholder="0,00"
                                                className="w-full text-6xl font-black text-slate-800 outline-none pl-20 py-4 bg-gray-50/50 rounded-[2.5rem] border-2 border-transparent focus:border-[#8E44AD] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-4 tracking-widest text-center">Onde foi isso?</label>
                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                            {Object.entries(categories)
                                                .filter(([_, c]) => c.type === entryType || c.type === 'both')
                                                .map(([id, c]) => (
                                                    <button
                                                        key={id}
                                                        onClick={() => setSelectedCat(id)}
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-3xl transition-all border-2 ${selectedCat === id ? `border-[#8E44AD] bg-[#8E44AD] text-white shadow-lg scale-110 z-10` : 'border-transparent bg-gray-50 hover:bg-gray-100 text-slate-400'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selectedCat === id ? 'bg-white text-[#8E44AD]' : `${c.color} text-white`}`}>
                                                            <IconRenderer name={c.icon} size={20} />
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">{c.label}</span>
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest">Data</label>
                                            <input
                                                type="date"
                                                value={entryDate}
                                                onChange={e => setEntryDate(e.target.value)}
                                                className="w-full p-5 bg-gray-50 rounded-[2rem] font-bold text-slate-700 outline-none border-2 border-transparent focus:border-[#8E44AD] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest">Pagamento</label>
                                            <select
                                                value={selectedPayment}
                                                onChange={e => setSelectedPayment(e.target.value)}
                                                className="w-full p-5 bg-gray-50 rounded-[2rem] font-bold text-slate-700 outline-none border-2 border-transparent focus:border-[#8E44AD] transition-all appearance-none"
                                            >
                                                {Object.entries(PAYMENT_METHODS).map(([id, p]) => (
                                                    <option key={id} value={id}>{p.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest">Descrição (Opcional)</label>
                                        <input
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Ex: Compra do mês no Atacadão"
                                            className="w-full p-5 bg-gray-50 rounded-[2rem] font-bold text-slate-700 outline-none border-2 border-transparent focus:border-[#8E44AD] transition-all placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="bg-gray-50 p-6 rounded-[2.5rem] space-y-4 border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Repetição</label>
                                            <div className="flex gap-2">
                                                {['avista', 'fixo', 'parcelado'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setRepeatType(type)}
                                                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${repeatType === type ? 'bg-[#8E44AD] text-white shadow-md' : 'bg-white text-slate-400 hover:bg-gray-100'}`}
                                                    >
                                                        {type === 'avista' ? 'À vista' : type === 'fixo' ? 'Fixo' : 'Parcelado'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {repeatType === 'parcelado' && (
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Número de Parcelas</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="72"
                                                    value={installments}
                                                    onChange={e => setInstallments(parseInt(e.target.value))}
                                                    className="w-20 p-2 bg-white rounded-xl text-center font-black text-[#8E44AD] outline-none border border-gray-200"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest cursor-pointer flex items-center gap-2" onClick={() => setIgnoreInReports(!ignoreInReports)}>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${ignoreInReports ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}`}>
                                                    {ignoreInReports && <Check size={14} className="text-white" />}
                                                </div>
                                                Ignorar em relatórios
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-4">
                                        <button
                                            onClick={handleSave}
                                            className="w-full bg-[#8E44AD] text-white py-8 rounded-[2.5rem] font-black text-xl shadow-[0_20px_50px_rgba(142,68,173,0.3)] hover:translate-y-[-4px] active:translate-y-[2px] active:shadow-inner transition-all uppercase tracking-[0.2em]"
                                        >
                                            🚀 {editingId ? 'Atualizar Merreca' : 'Anotar Merreca'}
                                        </button>
                                        <button
                                            onClick={() => { resetForm(); setView('HOME'); }}
                                            className="w-full py-4 text-slate-300 font-bold uppercase tracking-widest text-[10px] hover:text-slate-500 transition-colors"
                                        >
                                            Cancelar e Voltar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'REPORTS' && (
                        <div className="max-w-7xl mx-auto">
                            <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-gray-100">
                                <div className="flex items-center justify-between mb-12">
                                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">Relatório <span className="text-[#8E44AD]">Anual</span></h2>
                                    <div className="flex bg-gray-100 p-1 rounded-full">
                                        <button onClick={() => setViewMonth(now.getMonth())} className="px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 hover:text-[#8E44AD]">Ir para hoje</button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto -mx-10 px-10">
                                    <table className="w-full text-left min-w-[1000px] border-separate border-spacing-y-2">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                <th className="px-6 pb-6">Categoria</th>
                                                {MONTHS.map(m => <th key={m} className="px-4 pb-6 text-center">{m.slice(0, 3)}</th>)}
                                                <th className="px-6 pb-6 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearlyData.rows.map((row) => (
                                                <tr key={row.id} className="group hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-4 px-6 bg-white rounded-l-[1.5rem] border-y border-l border-gray-50 flex items-center gap-3">
                                                        <div className={`w-10 h-10 ${row.config.color} rounded-2xl flex items-center justify-center text-white shadow-sm`}>
                                                            <IconRenderer name={row.config.icon} size={18} />
                                                        </div>
                                                        <span className="font-bold text-slate-700">{row.config.label}</span>
                                                    </td>
                                                    {row.values.slice(0, 12).map((v, i) => (
                                                        <td key={i} className={`py-4 px-4 text-center tabular-nums text-sm border-y border-gray-50 ${i === viewMonth ? 'bg-purple-50/50 font-black text-[#8E44AD]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                            {v > 0 ? v.toFixed(0) : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="py-4 px-6 text-right font-black text-slate-800 bg-gray-50/50 rounded-r-[1.5rem] border-y border-r border-gray-50 tabular-nums">
                                                        {row.values[12].toFixed(0)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-green-50/50">
                                                <td className="py-6 px-6 font-black text-green-600 rounded-l-[2rem] text-sm uppercase tracking-widest">💰 Entradas</td>
                                                {yearlyData.summary.income.slice(0, 12).map((v, i) => (
                                                    <td key={i} className={`py-6 px-4 text-center tabular-nums text-sm font-black text-green-700 ${i === viewMonth ? 'bg-green-100/50' : ''}`}>
                                                        {v > 0 ? v.toFixed(0) : '-'}
                                                    </td>
                                                ))}
                                                <td className="py-6 px-6 text-right font-black text-green-700 rounded-r-[2rem] tabular-nums">{yearlyData.summary.income[12].toFixed(0)}</td>
                                            </tr>
                                            <tr className="bg-red-50/50">
                                                <td className="py-6 px-6 font-black text-red-600 rounded-l-[2rem] text-sm uppercase tracking-widest">💔 Saídas</td>
                                                {yearlyData.summary.expense.slice(0, 12).map((v, i) => (
                                                    <td key={i} className={`py-6 px-4 text-center tabular-nums text-sm font-black text-red-700 ${i === viewMonth ? 'bg-red-100/50' : ''}`}>
                                                        {v > 0 ? v.toFixed(0) : '-'}
                                                    </td>
                                                ))}
                                                <td className="py-6 px-6 text-right font-black text-red-700 rounded-r-[2rem] tabular-nums">{yearlyData.summary.expense[12].toFixed(0)}</td>
                                            </tr>
                                            <tr className="bg-slate-800 text-white">
                                                <td className="py-8 px-6 font-black rounded-l-[2.5rem] text-sm uppercase tracking-[0.2em]">Saldo Livre</td>
                                                {yearlyData.summary.balance.slice(0, 12).map((v, i) => (
                                                    <td key={i} className={`py-8 px-4 text-center tabular-nums text-lg font-black ${v >= 0 ? 'text-green-400' : 'text-red-400'} ${i === viewMonth ? 'bg-white/10' : ''}`}>
                                                        {v.toFixed(0)}
                                                    </td>
                                                ))}
                                                <td className="py-8 px-6 text-right font-black text-white rounded-r-[2.5rem] text-xl tabular-nums">{yearlyData.summary.balance[12].toFixed(0)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'CAT_MGMT' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-gray-100">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-8">Gerenciar <span className="text-[#8E44AD]">Categorias</span></h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(categories).map(([id, c]) => (
                                        <div key={id} className="flex items-center justify-between p-6 bg-gray-50 rounded-[2.5rem] group hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all border-2 border-transparent hover:border-[#8E44AD]/10">
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 ${c.color} rounded-[1.8rem] flex items-center justify-center text-white shadow-lg`}>
                                                    <IconRenderer name={c.icon} size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#8E44AD] mb-1">{c.type === 'entrada' ? 'Receita' : 'Despesa'}</p>
                                                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider">{c.label}</h3>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingCatId(id)} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-[#8E44AD] border-2 border-transparent hover:border-[#8E44AD]/20 transition-all shadow-sm">
                                                    <Edit2 size={18} />
                                                </button>
                                                {!INITIAL_CATEGORIES[id] && (
                                                    <button onClick={async () => {
                                                        if (confirm(`Apagar categoria "${c.label}"?`)) await deleteDoc(doc(db, "categories", id));
                                                    }} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-red-500 border-2 border-transparent hover:border-red-500/20 transition-all shadow-sm">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setEditingCatId('NEW')}
                                        className="flex items-center justify-center p-8 bg-gray-100 rounded-[2.5rem] border-4 border-dashed border-gray-200 text-slate-400 hover:border-[#8E44AD]/30 hover:text-[#8E44AD] hover:bg-white group transition-all"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Plus size={32} className="group-hover:scale-125 transition-transform" />
                                            <span className="font-black uppercase tracking-widest text-xs">Nova Categoria</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {isMobile ? (
                    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center z-[150] rounded-t-[2.5rem]">
                        <button onClick={() => setView('HOME')} className={`p-4 ${view === 'HOME' ? 'text-[#8E44AD]' : 'text-slate-300'}`}><Home size={24} /></button>
                        <button onClick={() => setView('REPORTS')} className={`p-4 ${view === 'REPORTS' ? 'text-[#8E44AD]' : 'text-slate-300'}`}><BarChart2 size={24} /></button>
                        <button onClick={() => { resetForm(); setView('ENTRY'); }} className="w-16 h-16 bg-[#8E44AD] text-white rounded-3xl flex items-center justify-center shadow-2xl -mt-12"><Plus size={32} strokeWidth={4} /></button>
                        <button onClick={() => setMerrecaOpen(true)} className="p-4 text-[#8E44AD]"><Sparkles size={24} /></button>
                        <button onClick={() => setView('CAT_MGMT')} className={`p-4 ${view === 'CAT_MGMT' ? 'text-[#8E44AD]' : 'text-slate-300'}`}><Settings size={24} /></button>
                    </nav>
                ) : null}

                {deleteModal && (
                    <div className="fixed inset-0 bg-black/60 z-[600] flex items-center justify-center p-6 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center animate-in zoom-in duration-300">
                            <h2 className="text-3xl font-black mb-4">Atenção!</h2>
                            <p className="font-bold text-slate-400 mb-8">Esta é uma merreca recorrente. O que deseja fazer?</p>
                            <div className="space-y-3">
                                <button onClick={() => handleDeleteConfirm('single')} className="w-full bg-slate-100 py-4 rounded-2xl font-bold">Apenas agora</button>
                                <button onClick={() => handleDeleteConfirm('future')} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase">Apagar tudo</button>
                                <button onClick={() => setDeleteModal(null)} className="w-full py-4 text-slate-300 font-bold uppercase text-xs">Desistir</button>
                            </div>
                        </div>
                    </div>
                )}

                {renderMerrecaChat()}

                {editingCatId && (
                    <div className="fixed inset-0 bg-[#2C3E50]/80 backdrop-blur-xl z-[600] flex items-center justify-center p-6" onClick={() => setEditingCatId(null)}>
                        <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 text-center animate-in zoom-in duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h2 className="text-4xl font-black mb-10 text-slate-800 tracking-tight">Categoria</h2>
                            <div className="space-y-8 text-left">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest">Nome</label>
                                    <input
                                        defaultValue={editingCatId === 'NEW' ? '' : categories[editingCatId]?.label}
                                        placeholder="Ex: Assinaturas"
                                        id="cat-name"
                                        className="w-full p-6 bg-gray-50 rounded-[2.5rem] font-bold text-slate-800 outline-none border-2 border-transparent focus:border-[#8E44AD] transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest">Tipo</label>
                                        <select
                                            id="cat-type"
                                            defaultValue={editingCatId === 'NEW' ? 'saida' : categories[editingCatId]?.type}
                                            className="w-full p-6 bg-gray-50 rounded-[2.5rem] font-bold text-slate-800 outline-none appearance-none"
                                        >
                                            <option value="saida">💔 Despesa</option>
                                            <option value="entrada">💰 Receita</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest">Ícone</label>
                                        <select
                                            id="cat-icon"
                                            defaultValue={editingCatId === 'NEW' ? 'ShoppingCart' : categories[editingCatId]?.icon}
                                            className="w-full p-6 bg-gray-50 rounded-[2.5rem] font-bold text-slate-800 outline-none appearance-none"
                                        >
                                            <option value="ShoppingCart">🛒 Mercado</option>
                                            <option value="Home">🏠 Casa</option>
                                            <option value="Heart">❤️ Saúde/Dani</option>
                                            <option value="Car">🚗 Transporte</option>
                                            <option value="Coffee">☕ Alimentação</option>
                                            <option value="ShoppingBag">🛍️ Compras</option>
                                            <option value="PartyPopper">🎉 Lazer</option>
                                            <option value="DollarSign">💵 Receita</option>
                                            <option value="MoreHorizontal">➕ Outros</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const name = document.getElementById('cat-name').value;
                                        const type = document.getElementById('cat-type').value;
                                        const icon = document.getElementById('cat-icon').value;
                                        if (!name) return;
                                        const catData = { label: name, type, icon, color: type === 'entrada' ? 'bg-[#2ECC71]' : 'bg-[#E67E22]' };
                                        if (editingCatId === 'NEW') {
                                            const id = name.toLowerCase().replace(/\s+/g, '-');
                                            await setDoc(doc(db, "categories", id), catData);
                                        } else {
                                            await updateDoc(doc(db, "categories", editingCatId), catData);
                                        }
                                        setEditingCatId(null);
                                        showToast("Categoria salva!");
                                    }}
                                    className="w-full bg-[#8E44AD] text-white py-8 rounded-[2.5rem] font-black text-xl shadow-xl hover:translate-y-[-4px] active:translate-y-[2px] transition-all uppercase tracking-widest"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function MinhaMerreca() {
    return (
        <ErrorBoundary>
            <MinhaMerrecaContent />
        </ErrorBoundary>
    );
}
