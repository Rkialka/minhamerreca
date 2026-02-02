import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Lock, ArrowUp, ArrowDown, Check, X, Home,
    DollarSign, Receipt, ShoppingCart, Car, Heart, PartyPopper, ShoppingBag,
    BarChart2, Calendar, CreditCard, Wallet, MoreHorizontal, Edit2, Trash2, Copy,
    ArrowRightLeft, Filter, Settings, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Coffee, Sparkles, EyeOff, Menu, SendHorizontal, Paperclip, FileText, Image
} from 'lucide-react';
import * as Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import { db } from './firebaseConfig';
import {
    collection, addDoc, onSnapshot, query,
    deleteDoc, doc, updateDoc, writeBatch, serverTimestamp, setDoc
} from 'firebase/firestore';

// Configuração do Worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

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

const STATUS_OPTIONS = {
    'pago': { label: 'PAGO', color: 'bg-[#2ECC71] text-white' },
    'pendente': { label: 'PENDENTE', color: 'bg-white text-slate-300 border border-slate-100' },
    'atrasado': { label: 'ATRASADO', color: 'bg-red-500 text-white' }
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
    const [amount, setAmount] = useState('0,00');
    const [description, setDescription] = useState('');
    const [selectedCat, setSelectedCat] = useState('dani');
    const [selectedPayment, setSelectedPayment] = useState('PIX');
    const [entryDate, setEntryDate] = useState(now.toISOString().split('T')[0]);
    const [repeatType, setRepeatType] = useState('avista'); // avista, fixo, parcelado
    const [installments, setInstallments] = useState(1);
    const [ignoreInReports, setIgnoreInReports] = useState(false);
    const [status, setStatus] = useState('pago'); // pago, pendente
    const [observations, setObservations] = useState('');

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

    const annualData = useMemo(() => {
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
        const cleanAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
        const baseData = {
            amount: cleanAmount,
            description: description || categories[selectedCat]?.label || 'Lançamento',
            category: selectedCat,
            paymentMethod: selectedPayment,
            type: entryType,
            repeatType: repeatType,
            ignoreInReports: ignoreInReports,
            status: status,
            observations: observations,
            updatedAt: serverTimestamp()
        };
        try {
            const batch = writeBatch(db);
            const startDate = new Date(entryDate + 'T12:00:00');
            if (repeatType === 'fixo') {
                if (editingId) {
                    await updateDoc(doc(db, "transactions", editingId), {
                        ...baseData,
                        date: entryDate
                    });
                } else {
                    for (let i = 0; i < 12; i++) {
                        const d = new Date(startDate);
                        d.setMonth(d.getMonth() + i);
                        const newDoc = doc(collection(db, "transactions"));
                        batch.set(newDoc, { ...baseData, date: d.toISOString().split('T')[0], status: i === 0 ? status : 'pendente' });
                    }
                    await batch.commit();
                }
            } else if (repeatType === 'parcelado') {
                if (editingId) {
                    await updateDoc(doc(db, "transactions", editingId), { ...baseData, date: entryDate });
                } else {
                    for (let i = 0; i < installments; i++) {
                        const d = new Date(startDate);
                        d.setMonth(d.getMonth() + i);
                        const newDoc = doc(collection(db, "transactions"));
                        batch.set(newDoc, { ...baseData, date: d.toISOString().split('T')[0], status: 'pendente', parcelaNum: i + 1, parcelasTotal: installments });
                    }
                    await batch.commit();
                }
            } else {
                if (editingId) {
                    await updateDoc(doc(db, "transactions", editingId), { ...baseData, date: entryDate });
                } else {
                    await addDoc(collection(db, "transactions"), { ...baseData, date: entryDate, createdAt: serverTimestamp() });
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
        const cycle = { 'pago': 'pendente', 'pendente': 'atrasado', 'atrasado': 'pago' };
        const next = cycle[t.status || 'pago'] || 'pago';
        await updateDoc(doc(db, "transactions", t.id), { status: next });
    };

    const showToast = (msg) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 3000);
    };

    const resetForm = () => {
        setAmount('0,00');
        setDescription('');
        setRepeatType('avista');
        setInstallments(1);
        setEditingId(null);
        setIgnoreInReports(false);
        setStatus('pago');
        setSelectedCat(entryType === 'entrada' ? 'dani' : 'outros');
    };

    const handleAmountChange = (e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (!val) {
            setAmount('0,00');
            return;
        }
        const numeric = parseInt(val, 10);
        const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(numeric);
        setAmount(formatted + ',00');
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
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + "\n";
                }
                fileContent = fullText;
            }

            if (!fileContent.trim() && file.type === 'application/pdf') {
                fileContent = "O PDF parece estar vazio ou é uma imagem (escaner). Tente enviar uma foto nítida do documento.";
            }

            await askMerreca(`[ARQUIVO ANALISADO: ${file.name}]\nConteúdo extraído:\n${fileContent.slice(0, 3000)}\n\nPor favor, analise este documento, extraia os valores, datas e descrições, e sugira os lançamentos. Se houver algo estranho, me avise!`, true);
        } catch (error) {
            console.error(error);
            const errMsg = { role: 'assistant', content: 'Ops! Tive um problema ao ler esse arquivo. Pode conferir se ele está certinho ou tentar me mandar uma foto?', timestamp: Date.now() };
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
            const summary = monthTxs.slice(0, 40).map(t => `${t.date}: ${t.description} - ${formatBoleto(t.amount)} (${categories[t.category]?.label})`).join('\n');
            const historicalSummary = MONTHS.map((m, i) => {
                const inc = annualData.summary.income[i];
                const exp = annualData.summary.expense[i];
                if (inc === 0 && exp === 0) return null;
                return `${m}/${viewYear}: Entradas ${formatBoleto(inc)}, Saídas ${formatBoleto(exp)}`;
            }).filter(Boolean).join('\n');

            const systemPrompt = `Você é a "Merreca", a consultora financeira pessoal e inteligente mais top do Brasil.
            Seu estilo é uma mistura de Nathalia Arcuri (direta, focada em metas e economia) com uma assistente premium de alta tecnologia.
            
            DIRETRIZES DE PERSONALIDADE:
            1. Seja PROATIVA: Se você ver que o usuário gastou muito em uma categoria, avise! Se o saldo estiver baixo, sugira economia. 
            2. Seja DIVERTIDA mas PROFISSIONAL: Use emojis ocasionalmente ✨, mas mantenha o foco nos números.
            3. SEMPRE sugira 3 ações práticas ao final: "Eu posso: 1. Criticar seus gastos com iFood; 2. Analisar esse PDF de extrato; 3. Planejar sua próxima viagem."
            4. Se o usuário mandar um arquivo, analise TUDO detalhadamente e sugira os lançamentos exatos.

            DADOS ATUAIS:
            - Saldo do Mês: ${formatBoleto(totals.balance)}
            - Total Entradas: ${formatBoleto(totals.income)}
            - Total Saídas: ${formatBoleto(totals.expense)}
            - Histórico do Ano: ${historicalSummary}
            - Últimos Lançamentos: ${summary}
            
            ESTRUTURA DE CATEGORIAS DISPONÍVEIS:
            ${Object.entries(categories).map(([id, c]) => `${id}: ${c.label}`).join(', ')}

            REGRA DE LANÇAMENTO (OBRIGATÓRIO):
            Sempre que identificar uma nova despesa ou receita (seja por texto ou arquivo), inclua no final da resposta:
            [NEW_TRANSACTION: { "description": "...", "amount": 0.00, "category": "cat_id", "type": "saida|entrada", "date": "YYYY-MM-DD" }]
            
            Use a categoria que melhor se encaixa. Se não souber, use 'outros'.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const aiContent = data.choices[0].message.content;

            const txMatch = aiContent.match(/\[NEW_TRANSACTION: (.*?)\]/);
            if (txMatch) {
                try {
                    const txData = JSON.parse(txMatch[1]);
                    await addDoc(collection(db, "transactions"), {
                        ...txData,
                        status: 'pago',
                        repeatType: 'avista',
                        paymentMethod: 'PIX', // Default
                        installments: 1,
                        ignoreInReports: false,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } catch (err) { console.error("Erro ao processar transaction JSON:", err); }
            }

            const cleanContent = aiContent.replace(/\[NEW_TRANSACTION: .*?\]/g, '✅ Lançamento realizado com sucesso!').trim();
            const aiMsg = { role: 'assistant', content: cleanContent, timestamp: Date.now() };
            setChatMessages(prev => [...prev, aiMsg]);
            await addDoc(collection(db, "chat_history"), aiMsg);
        } catch (e) {
            console.error(e);
            const errMsg = { role: 'assistant', content: "Eita, tive um probleminha técnico aqui. Pode repetir? 😅", timestamp: Date.now() };
            setChatMessages(prev => [...prev, errMsg]);
        }
        finally { setIsTyping(false); }
    };

    const renderMerrecaChat = () => {
        if (!merrecaOpen) return null;
        return (
            <div className="fixed inset-0 bg-[#2C3E50]/80 backdrop-blur-md z-[300] flex items-center justify-center p-4" onClick={() => setMerrecaOpen(false)}>
                <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="bg-gradient-to-br from-[#8E44AD] via-[#9B59B6] to-[#6C3483] p-8 text-white flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md animate-pulse-soft">
                                <Sparkles size={28} className="text-yellow-300" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight">Merreca ✨</h2>
                                <p className="opacity-80 text-xs font-bold uppercase tracking-widest mt-1">Sua Consultora Financeira PRO</p>
                            </div>
                        </div>
                        <button onClick={() => setMerrecaOpen(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all relative z-10">
                            <X size={20} />
                        </button>
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
    // --- UI COMPONENTS ---
    const MonthSelector = ({ viewMonth, changeMonth }) => {
        const months = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];

        return (
            <div className="flex items-center justify-center gap-12 py-6 px-6">
                <button onClick={() => changeMonth(-1)} className="p-2 text-slate-200 hover:text-slate-400 transition-all"><ChevronLeft size={16} /></button>
                <div className="bg-white px-16 py-3 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 text-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">{months[viewMonth]}</span>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 text-slate-200 hover:text-slate-400 transition-all"><ChevronRight size={16} /></button>
            </div>
        );
    };

    const FilterBar = ({ categories, activeFilters, setActiveFilters }) => {
        const filters = [
            { id: 'all', label: 'TUDO' },
            { id: 'entrada', label: 'ENTRADAS' },
            { id: 'saida', label: 'SAÍDAS' },
            { id: 'avista', label: 'AVISTA' },
            { id: 'fixo', label: 'FIXO' },
            { id: 'parcelado', label: 'PARCELADO' },
            { id: 'PIX', label: 'PIX' },
            { id: 'CARD', label: 'CARD' },
            { id: 'CASH', label: 'CASH' }
        ];

        const isActive = (f) => {
            if (f.id === 'all') return activeFilters.category === 'all' && activeFilters.type === 'all' && activeFilters.transactionType === 'all' && activeFilters.payment === 'all';
            if (['entrada', 'saida'].includes(f.id)) return activeFilters.transactionType === f.id;
            if (['avista', 'fixo', 'parcelado'].includes(f.id)) return activeFilters.type === f.id;
            if (['PIX', 'CARD', 'CASH'].includes(f.id)) return activeFilters.payment === f.id;
            return activeFilters.category === f.id;
        };

        const handleFilter = (f) => {
            if (f.id === 'all') {
                setActiveFilters({ category: 'all', type: 'all', payment: 'all', transactionType: 'all' });
            } else if (['entrada', 'saida'].includes(f.id)) {
                setActiveFilters(prev => ({ ...prev, transactionType: f.id }));
            } else if (['avista', 'fixo', 'parcelado'].includes(f.id)) {
                setActiveFilters(prev => ({ ...prev, type: f.id }));
            } else if (['PIX', 'CARD', 'CASH'].includes(f.id)) {
                setActiveFilters(prev => ({ ...prev, payment: f.id }));
            } else {
                setActiveFilters(prev => ({ ...prev, category: f.id }));
            }
        };

        return (
            <div className="flex overflow-x-auto gap-3 px-6 pb-10 scrollbar-hide no-scrollbar items-center">
                {filters.map(f => (
                    <button
                        key={f.id}
                        onClick={() => handleFilter(f)}
                        className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${isActive(f) ? 'bg-[#8E44AD] text-white shadow-lg shadow-purple-100' : 'bg-transparent text-slate-300 hover:text-slate-500'}`}
                    >
                        {f.label}
                    </button>
                ))}
                <div className="w-px h-4 bg-gray-200 mx-2 shrink-0"></div>
                {Object.entries(categories).map(([id, c]) => (
                    <button
                        key={id}
                        onClick={() => handleFilter({ id })}
                        className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${activeFilters.category === id ? 'bg-[#8E44AD] text-white shadow-lg shadow-purple-100' : 'bg-transparent text-slate-300 hover:text-slate-500'}`}
                    >
                        {c.label}
                    </button>
                ))}
                <button className="px-6 py-2.5 rounded-full bg-transparent text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-[#8E44AD] transition-all shrink-0">+ ADD</button>
            </div>
        );
    };

    const TransactionRow = ({ t, categories, toggleStatus, setEditingId }) => {
        const cat = categories[t.category] || categories['outros'];
        const isPlus = (t.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'entrada';
        const st = STATUS_OPTIONS[t.status || 'pago'] || STATUS_OPTIONS['pago'];

        return (
            <tr className="hover:bg-gray-50/20 transition-colors group">
                <td className="py-8 px-4 w-[120px]">
                    <button onClick={() => toggleStatus(t)} className={`px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.1em] transition-all ${st.color}`}>
                        {st.label}
                    </button>
                </td>
                <td className="py-8 px-4 text-[10px] font-bold text-slate-300 uppercase tabular-nums w-[100px]">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                <td className="py-8 px-8 font-black text-slate-800 text-sm tracking-tight">{t.description}</td>
                <td className="py-8 px-4 w-[150px]">
                    <span className="text-[9px] font-black text-[#2ECC71] uppercase tracking-[0.15em]">{cat.label}</span>
                </td>
                <td className="py-8 px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest w-[100px]">{t.repeatType === 'avista' ? 'À VISTA' : t.repeatType}</td>
                <td className="py-8 px-4 text-[10px] font-black text-slate-300 tabular-nums text-center w-[80px]">{t.repeatType === 'parcelado' ? `${t.parcelaNum}/${t.parcelasTotal}` : '--'}</td>
                <td className="py-8 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px]">{PAYMENT_METHODS[t.paymentMethod]?.label || t.paymentMethod}</td>
                <td className={`py-8 px-4 text-sm font-black text-right tabular-nums w-[150px] tracking-tight ${isPlus ? 'text-green-500' : 'text-slate-800'}`}>
                    {isPlus ? '+ ' : '- '} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-8 px-6 w-[150px]">
                    <div className="text-[10px] font-bold text-slate-200 line-clamp-1 italic tracking-tight uppercase">{(t.observations || 'Nenhuma...').length > 20 ? t.observations.substring(0, 20) + '...' : t.observations}</div>
                </td>
                <td className="py-8 px-2 w-[40px]">
                    <button onClick={() => setEditingId(t.id)} className="p-2 text-slate-100 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100"><MoreHorizontal size={14} /></button>
                </td>
            </tr>
        );
    };

    const TransactionItem = ({ t, categories, totals }) => {
        const cat = categories[t.category] || categories['outros'];
        const isPlus = (t.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'entrada';
        const totalBase = isPlus ? totals.income : totals.expense;
        const percent = totalBase > 0 ? Math.round((t.amount / totalBase) * 100) : 0;
        return (
            <div className="bg-white p-6 rounded-[3rem] shadow-sm mb-4 border border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 text-base mb-1">{cat.label}</h3>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{percent}% DO TOTAL</p>
                </div>
                <p className="font-bold text-slate-800 text-lg">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
        <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0 lg:flex overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col bg-white w-[300px] h-screen p-6 shrink-0 overflow-hidden border-r border-gray-100">
                <div className="flex flex-col items-center mb-5">
                    <img src="./logo.png" alt="Minha Merreca" className="w-[120px] h-auto object-contain" />
                </div>

                <div className="bg-gray-100 p-1.5 rounded-[1.2rem] flex items-center mb-5 shrink-0">
                    <button onClick={() => setView('HOME')} className={`flex-1 py-2.5 rounded-[1rem] flex items-center justify-center transition-all ${view === 'HOME' ? 'bg-[#8E44AD] text-white shadow-lg shadow-purple-100' : 'text-slate-300 hover:text-slate-400'}`}><Home size={16} /></button>
                    <button onClick={() => setView('REPORTS')} className={`flex-1 py-2.5 rounded-[1rem] flex items-center justify-center transition-all ${view === 'REPORTS' ? 'bg-[#8E44AD] text-white shadow-lg shadow-purple-100' : 'text-slate-300 hover:text-slate-400'}`}><BarChart2 size={16} /></button>
                    <button onClick={() => setView('CAT_MGMT')} className={`flex-1 py-2.5 rounded-[1rem] flex items-center justify-center transition-all ${view === 'CAT_MGMT' ? 'bg-[#8E44AD] text-white shadow-lg shadow-purple-100' : 'text-slate-300 hover:text-slate-400'}`}><Settings size={16} /></button>
                    <button onClick={() => setMerrecaOpen(true)} className="flex-1 py-2.5 rounded-[1rem] flex items-center justify-center text-slate-300 hover:text-[#8E44AD] transition-all"><Sparkles size={16} /></button>
                </div>

                <div className="flex gap-2 mb-5 shrink-0">
                    <div className="flex-1 bg-white border border-gray-100 rounded-[1.2rem] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
                        <p className="text-[7px] font-black text-green-500 uppercase tracking-[0.2em] mb-0.5 text-center font-outfit">Entradas</p>
                        <p className="text-[10px] font-black text-green-700 text-center tabular-nums">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex-1 bg-white border border-gray-100 rounded-[1.2rem] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
                        <p className="text-[7px] font-black text-red-500 uppercase tracking-[0.2em] mb-0.5 text-center font-outfit">Gastos</p>
                        <p className="text-[10px] font-black text-red-600 text-center tabular-nums">R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-gray-50/70 p-5 rounded-[2.5rem] space-y-4 border border-gray-100/50 flex-1 flex flex-col justify-center min-h-0">
                    <div className="flex bg-white p-1 rounded-[1.2rem] border border-gray-100 shrink-0">
                        <button onClick={() => setEntryType('saida')} className={`flex-1 py-2.5 rounded-[1rem] font-black text-[9px] uppercase tracking-widest transition-all ${entryType === 'saida' ? 'bg-[#FF4B4B] text-white shadow-lg shadow-red-100' : 'text-slate-200'}`}>Gasto</button>
                        <button onClick={() => setEntryType('entrada')} className={`flex-1 py-2.5 rounded-[1rem] font-black text-[9px] uppercase tracking-widest transition-all ${entryType === 'entrada' ? 'bg-[#2ECC71] text-white shadow-lg shadow-green-100' : 'text-slate-200'}`}>Entrada</button>
                    </div>

                    <div className="text-center shrink-0 flex items-center justify-center">
                        <span className="text-xl font-black text-slate-300 mr-1">R$</span>
                        <input
                            inputMode="numeric"
                            value={amount}
                            onChange={handleAmountChange}
                            className="w-full text-center text-4xl font-black text-slate-800 bg-transparent outline-none tracking-widest tabular-nums max-w-[150px]"
                            placeholder="0,00"
                        />
                    </div>

                    <div className="space-y-3 shrink-0">
                        <div className="relative group">
                            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] px-4 mb-0.5 font-outfit">O que é?</p>
                            <input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Descrição"
                                className="w-full p-3.5 bg-white rounded-[1.2rem] font-bold text-slate-700 outline-none border border-transparent focus:border-[#8E44AD]/20 transition-all text-sm shadow-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] px-4 mb-0.5 font-outfit">Categoria</p>
                                <select
                                    value={selectedCat}
                                    onChange={e => setSelectedCat(e.target.value)}
                                    className="w-full p-3.5 bg-white rounded-[1.2rem] font-bold text-slate-700 outline-none border border-transparent focus:border-[#8E44AD]/20 transition-all text-xs appearance-none shadow-sm"
                                >
                                    {Object.entries(categories).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] px-4 mb-0.5 font-outfit">Pagamento</p>
                                <select
                                    value={selectedPayment}
                                    onChange={e => setSelectedPayment(e.target.value)}
                                    className="w-full p-3.5 bg-white rounded-[1.2rem] font-bold text-slate-700 outline-none border border-transparent focus:border-[#8E44AD]/20 transition-all text-xs appearance-none shadow-sm"
                                >
                                    {Object.entries(PAYMENT_METHODS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="relative group">
                            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] px-4 mb-0.5 font-outfit">Data</p>
                            <input
                                type="date"
                                value={entryDate}
                                onChange={e => setEntryDate(e.target.value)}
                                className="w-full p-3.5 bg-white rounded-[1.2rem] font-bold text-slate-700 outline-none border border-transparent focus:border-[#8E44AD]/20 transition-all text-xs shadow-sm"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            className={`w-full text-white py-5 rounded-[1.5rem] font-black text-sm shadow-lg hover:translate-y-[-2px] active:translate-y-[1px] transition-all uppercase tracking-widest mt-2 ${entryType === 'saida' ? 'bg-[#FF4B4B] shadow-red-100' : 'bg-[#2ECC71] shadow-green-100'}`}
                        >
                            Lançar Agora
                        </button>
                    </div>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <MonthSelector />

                <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide no-scrollbar">
                    {feedback && <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-8 py-4 rounded-full font-bold shadow-2xl z-[500] animate-in fade-in slide-in-from-top-4">{feedback}</div>}

                    {view === 'HOME' && (
                        <div className="max-w-[1400px] mx-auto">
                            {!isMobile && <FilterBar categories={categories} activeFilters={activeFilters} setActiveFilters={setActiveFilters} />}

                            {isMobile ? (
                                <div className="space-y-4">
                                    {filteredTransactions.map(t => <TransactionItem key={t.id} t={t} categories={categories} totals={totals} />)}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[9px] font-black text-slate-200 uppercase tracking-[0.2em]">
                                                <th className="py-8 px-4 font-black">Status</th>
                                                <th className="py-8 px-4 font-black">Data</th>
                                                <th className="py-8 px-8 font-black">Descrição</th>
                                                <th className="py-8 px-4 font-black">Categoria</th>
                                                <th className="py-8 px-4 font-black">Tipo</th>
                                                <th className="py-8 px-4 font-black text-center">Parcelas</th>
                                                <th className="py-8 px-4 font-black">Pagamento</th>
                                                <th className="py-8 px-4 font-black text-right">Valor</th>
                                                <th className="py-8 px-6 font-black">Observações</th>
                                                <th className="py-8 px-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTransactions.map(t => <TransactionRow key={t.id} t={t} categories={categories} toggleStatus={toggleStatus} setEditingId={setEditingId} />)}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {filteredTransactions.length === 0 && <div className="py-20 text-center text-slate-300 font-bold italic">Nada por aqui ainda...</div>}
                        </div>
                    )}

                    {view === 'ENTRY' && (
                        <div className="max-w-xl mx-auto pb-10">
                            <div className="bg-white p-6 sm:p-8 rounded-[3.5rem] shadow-2xl border border-gray-100">
                                <div className="flex bg-gray-100 p-1.5 rounded-[2.2rem] mb-8">
                                    <button
                                        onClick={() => { setEntryType('saida'); setSelectedCat('outros'); }}
                                        className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all ${entryType === 'saida' ? 'bg-white text-[#FF4B4B] shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        💔 Gasto
                                    </button>
                                    <button
                                        onClick={() => { setEntryType('entrada'); setSelectedCat('dani'); }}
                                        className={`flex-1 py-4 rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all ${entryType === 'entrada' ? 'bg-white text-[#2ECC71] shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        💰 Entrada
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="group">
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-2 tracking-widest text-center">Valor da Merreca</label>
                                        <div className="relative flex items-center justify-center">
                                            <span className="text-2xl font-black text-slate-300 mr-2">R$</span>
                                            <input
                                                autoFocus
                                                inputMode="numeric"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                placeholder="0,00"
                                                className="w-full max-w-[280px] text-4xl sm:text-5xl font-black text-slate-800 outline-none text-center bg-transparent py-2 border-b-2 border-slate-100 focus:border-[#8E44AD] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 px-6 block mb-4 tracking-widest text-center">Onde foi isso?</label>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
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
                                            className="w-full py-4 text-red-400/40 font-bold uppercase tracking-widest text-[10px] hover:text-red-400 transition-colors"
                                        >
                                            Cancelar e Voltar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'REPORTS' && (
                        <div className="max-w-4xl mx-auto space-y-6 pt-10">
                            <div className="grid grid-cols-2 gap-4 h-40">
                                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-green-50 flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Entrou</p>
                                    <p className="text-2xl font-black text-green-700">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-red-50 flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Saiu</p>
                                    <p className="text-2xl font-black text-red-700">R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {categoryStats.map(stat => (
                                    <div key={stat.id} className="bg-white p-8 rounded-[3.5rem] shadow-sm flex items-center justify-between border border-gray-100">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 mb-1">{stat.config.label}</h3>
                                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{stat.percent.toFixed(1)}% DO TOTAL</p>
                                        </div>
                                        <p className="text-2xl font-black text-slate-800 tabular-nums">R$ {stat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-16 bg-white rounded-[4rem] p-16 shadow-[0_30px_100px_rgba(0,0,0,0.03)] border border-gray-100">
                                <h3 className="text-3xl font-black text-slate-800 mb-16 uppercase tracking-[0.3em] text-center font-outfit">Visão Anual - {viewYear}</h3>
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead>
                                            <tr className="text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em]">
                                                <th className="py-8 px-6 font-outfit">Categoria</th>
                                                {MONTHS.map(m => <th key={m} className="py-8 px-2 text-center font-outfit">{m.substring(0, 3)}</th>)}
                                                <th className="py-8 px-6 text-right font-outfit">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50/30">
                                            {annualData.rows.map(row => (
                                                <tr key={row.id} className="hover:bg-gray-50/50 transition-all group">
                                                    <td className="py-6 px-6 text-[13px] font-bold text-slate-600 group-hover:text-slate-900 group-hover:translate-x-1 transition-all">{row.config.label}</td>
                                                    {row.values.slice(0, 12).map((val, i) => (
                                                        <td key={i} className={`py-6 px-2 text-center text-sm tabular-nums ${val > 0 ? 'font-black text-slate-800' : 'font-medium text-slate-200'}`}>
                                                            {val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="py-6 px-6 text-right text-sm font-black text-slate-800 tabular-nums">
                                                        R$ {row.values[12].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50/20 font-black text-slate-800 border-t-4 border-white">
                                                <td className="py-10 px-6 text-[12px] uppercase tracking-[0.2em] font-outfit">Saídas</td>
                                                {annualData.summary.expense.slice(0, 12).map((val, i) => (
                                                    <td key={i} className="py-10 px-2 text-center text-[13px] tabular-nums text-red-500">
                                                        {val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                                    </td>
                                                ))}
                                                <td className="py-10 px-6 text-right text-[14px] text-red-600 tabular-nums">
                                                    R$ {annualData.summary.expense[12].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'CAT_MGMT' && (
                        <div className="max-w-5xl mx-auto space-y-8 pt-10 text-center">
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight">CATEGORIAS</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(categories).map(([id, c]) => (
                                    <div key={id} className="flex items-center justify-between p-7 bg-white rounded-[3rem] shadow-[0_10px_30px_rgba(0,0,0,0.02)] border border-gray-100 group hover:scale-[1.02] transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-3 h-10 ${c.color} rounded-full`}></div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">{c.type === 'entrada' ? 'Receita' : 'Despesa'}</p>
                                                <h3 className="font-black text-slate-700 text-lg">{c.label}</h3>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingCatId(id)} className="p-3 text-slate-200 hover:text-[#8E44AD] transition-colors"><Edit2 size={18} /></button>
                                            {!INITIAL_CATEGORIES[id] && (
                                                <button onClick={async () => {
                                                    if (confirm(`Apagar categoria "${c.label}"?`)) await deleteDoc(doc(db, "categories", id));
                                                }} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setEditingCatId('NEW')}
                                    className="flex items-center justify-center p-8 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 text-slate-300 hover:border-[#8E44AD]/30 hover:text-[#8E44AD] hover:bg-white group transition-all"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Plus size={32} className="group-hover:scale-125 transition-transform" />
                                        <span className="font-black uppercase tracking-widest text-xs">Nova Categoria</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {isMobile ? (
                    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-6 flex justify-around items-center z-[150] rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <button onClick={() => setView('CAT_MGMT')} className={`p-4 ${view === 'CAT_MGMT' ? 'text-[#8E44AD]' : 'text-slate-200'}`}><Settings size={28} /></button>
                        <button onClick={() => setView('REPORTS')} className={`p-4 ${view === 'REPORTS' ? 'text-[#8E44AD]' : 'text-slate-200'}`}><BarChart2 size={28} /></button>
                        <button onClick={() => setView('HOME')} className={`p-4 ${view === 'HOME' ? 'text-[#8E44AD]' : 'text-slate-200'}`}><Home size={28} /></button>
                        <button onClick={() => setMerrecaOpen(true)} className="p-4 text-slate-200"><Sparkles size={28} /></button>
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
                                <div className="grid grid-cols-1 gap-6">
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
                                </div>
                                <button
                                    onClick={async () => {
                                        const name = document.getElementById('cat-name').value;
                                        const type = document.getElementById('cat-type').value;
                                        if (!name) return;
                                        const catData = { label: name, type, icon: 'MoreHorizontal', color: type === 'entrada' ? 'bg-[#2ECC71]' : 'bg-[#E67E22]' };
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
