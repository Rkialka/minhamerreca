import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Lock, ArrowUp, ArrowDown, Check, X, Home,
    DollarSign, Receipt, ShoppingCart, Car, Heart, PartyPopper, ShoppingBag,
    BarChart2, Calendar, CreditCard, Wallet, MoreHorizontal, Edit2, Trash2, Copy,
    ArrowRightLeft, Filter, Settings, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Coffee, Sparkles, EyeOff, Menu, SendHorizontal, Paperclip, FileText, Image, Mic, Target, Download, Moon, Sun
} from 'lucide-react';
import * as Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
        ArrowRightLeft, Filter, Settings, ChevronLeft, ChevronRight, AlertCircle, BookOpen, Coffee, Sparkles, EyeOff, SendHorizontal,
        Mic, Target, Download, Moon, Sun
    };
    const Icon = icons[name] || MoreHorizontal;
    return <Icon size={size} className={className} />;
};

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

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
    const [view, setView] = useState('HOME'); // HOME, ENTRY, REPORTS, CAT_MGMT, GOALS
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
    const [deleteModal, setDeleteModal] = useState(null);
    const [showCategoryFilters, setShowCategoryFilters] = useState(false);
    const [backupStatus, setBackupStatus] = useState(null);

    const runBackup = async () => {
        setBackupStatus('Salvando...');
        try {
            await addDoc(collection(db, "backups_history"), {
                timestamp: serverTimestamp(),
                transactions,
                goals: goals || [],
                categories
            });
            setBackupStatus('Backup salvo!');
            setTimeout(() => setBackupStatus(null), 3000);
        } catch (e) {
            console.error(e);
            setBackupStatus('Erro ao salvar');
        }
    };
    // --- LEVEL 2 FEATURES STATE ---

    // --- LEVEL 2 FEATURES STATE ---
    const [goals, setGoals] = useState([]);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [newGoal, setNewGoal] = useState({ title: '', target: '', current: '0' });

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

    // --- FIREBASE SYNC GOALS ---
    useEffect(() => {
        const q = query(collection(db, "goals"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setGoals(data);
        });
        return () => unsubscribe();
    }, []);



    // --- VOICE RECOGNITION ---
    const startVoiceCommand = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast("Seu navegador não suporta comandos de voz 😢");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            showToast(`Ouvindo: "${transcript}"`);
            askMerreca(transcript);
        };

        recognition.start();
    };

    // --- GOAL ACTIONS ---
    const handleSaveGoal = async () => {
        if (!newGoal.title || !newGoal.target) return;
        try {
            await addDoc(collection(db, "goals"), {
                ...newGoal,
                target: parseFloat(newGoal.target) || 0,
                current: parseFloat(newGoal.current) || 0,
                createdAt: serverTimestamp()
            });
            setNewGoal({ title: '', target: '', current: '0' });
            setShowGoalModal(false);
            showToast("Meta criada com sucesso! 🎯");
        } catch (e) { console.error(e); }
    };

    const handleDeleteGoal = async (id) => {
        if (confirm("Quer mesmo excluir esta meta?")) {
            await deleteDoc(doc(db, "goals", id));
            showToast("Meta excluída!");
        }
    };

    const handleUpdateGoalProgress = async (goal, amount) => {
        await updateDoc(doc(db, "goals", goal.id), {
            current: Math.max(0, (goal.current || 0) + amount)
        });
    };

    // --- PDF REPORT GENERATION ---
    const generatePDFReport = async () => {
        const element = document.getElementById('report-container');
        if (!element) return;

        setIsTyping(true);
        showToast("Gerando seu relatório premium... 📄");

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Relatorio-Merreca-${MONTHS[viewMonth]}-${viewYear}.pdf`);
            showToast("Relatório baixado com sucesso! ✨");
        } catch (e) {
            console.error(e);
            showToast("Erro ao gerar PDF 😢");
        } finally {
            setIsTyping(false);
        }
    };

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

        const qGoals = query(collection(db, "goals"));
        const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
            setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubscribe();
            unsubscribeGoals();
        };
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
        if (!val || val === '') {
            setAmount('0,00');
            return;
        }

        const numeric = parseInt(val, 10);
        const floatValue = numeric / 100;

        const formatted = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(floatValue);

        setAmount(formatted);
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

    const renderGoals = () => {
        if (view !== 'GOALS') return null;
        return (
            <div className="max-w-5xl mx-auto space-y-8 pt-10 px-6">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight ">METAS🎯</h2>
                    <button
                        onClick={() => setShowGoalModal(true)}
                        className="bg-[#8E44AD] text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Nova Meta
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {goals.map(goal => {
                        const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
                        return (
                            <div key={goal.id} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-100 p-3 rounded-2xl text-[#8E44AD]">
                                            <Target size={24} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{goal.title}</h3>
                                    </div>
                                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <p className="text-4xl font-black text-slate-800 tabular-nums">
                                            R$ {goal.current.toLocaleString('pt-BR')}
                                            <span className="text-sm font-bold text-slate-300 ml-2">de R$ {goal.target.toLocaleString('pt-BR')}</span>
                                        </p>
                                        <p className="text-xl font-black text-[#8E44AD]">{progress}%</p>
                                    </div>

                                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden border-4 border-white shadow-inner">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#8E44AD] to-[#9B59B6] rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(142,68,173,0.5)]"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        {[10, 50, 100].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => handleUpdateGoalProgress(goal, val)}
                                                className="flex-1 py-3 bg-gray-50 hover:bg-[#8E44AD]/10 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-[#8E44AD] transition-all"
                                            >
                                                + R$ {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {goals.length === 0 && (
                    <div className="py-20 text-center space-y-6">
                        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <Target size={48} />
                        </div>
                        <p className="text-slate-300 font-bold italic">Nenhuma meta ainda... Que tal planejar algo incrível? ✨</p>
                    </div>
                )}

                {showGoalModal && (
                    <div className="fixed inset-0 bg-[#2C3E50]/80 backdrop-blur-xl z-[600] flex items-center justify-center p-6" onClick={() => setShowGoalModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 text-center animate-in zoom-in duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h2 className="text-4xl font-black mb-10 text-slate-800 tracking-tight">Nova Meta 🎯</h2>
                            <div className="space-y-6 text-left">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-6 block mb-2 tracking-widest">Qual o objetivo?</label>
                                    <input
                                        value={newGoal.title}
                                        onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                                        placeholder="Ex: Viagem de Férias"
                                        className="w-full p-5 bg-gray-50 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-[#8E44AD] transition-all "
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-6 block mb-2 tracking-widest">Valor Objetivo (R$)</label>
                                    <input
                                        type="number"
                                        value={newGoal.target}
                                        onChange={e => setNewGoal({ ...newGoal, target: e.target.value })}
                                        placeholder="0,00"
                                        className="w-full p-5 bg-gray-50 rounded-[2rem] font-bold outline-none border-2 border-transparent focus:border-[#8E44AD] transition-all text-3xl tabular-nums"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveGoal}
                                    className="w-full bg-[#8E44AD] text-white py-6 rounded-[2.5rem] font-black text-lg shadow-lg hover:scale-[1.02] transition-all uppercase tracking-widest mt-4"
                                >
                                    Focar nessa Meta! 🚀
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
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
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col bg-[#FDFDFD] ">
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-5 rounded-[2rem] font-bold text-sm border whitespace-pre-wrap ${msg.role === 'assistant' ? 'bg-white text-slate-800 border-gray-100 ' : 'bg-[#8E44AD] text-white border-transparent'}`}>
                                    {msg.content.split('**').map((part, i) => i % 2 === 1 ? <b key={i} className="font-black">{part}</b> : part)}
                                </div>
                            </div>
                        ))}
                        <div id="chat-bottom"></div>
                    </div>
                    <div className="p-8 bg-white border-t border-gray-100 ">
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
                                className="flex-1 bg-transparent px-2 py-4 font-bold text-sm outline-none text-slate-700 "
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
            <div className="flex items-center justify-center gap-12 py-3 px-6">
                <button onClick={() => changeMonth(-1)} className="p-2 text-slate-200 hover:text-slate-400 transition-all"><ChevronLeft size={16} /></button>
                <div className="bg-white px-12 py-2 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 text-center">
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
            { id: 'saida', label: 'GASTOS' },
            { id: 'avista', label: 'AVISTA' },
            { id: 'fixo', label: 'FIXO' },
            { id: 'parcelado', label: 'PARCELADO' },
            { id: 'PIX', label: 'PIX' },
            { id: 'CARD', label: 'CARTÃO' },
            { id: 'CASH', label: 'DINHEIRO' }
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
            <div className="space-y-4 pb-10">
                <div className="flex overflow-x-auto gap-3 px-6 scrollbar-hide no-scrollbar items-center">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => handleFilter(f)}
                            className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${isActive(f) ? 'bg-[#8E44AD] text-white shadow-xl shadow-purple-100' : 'bg-transparent text-slate-300 hover:text-slate-500 hover:bg-gray-50'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowCategoryFilters(!showCategoryFilters)}
                        className={`p-4 rounded-full transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showCategoryFilters ? 'bg-[#8E44AD] text-white shadow-lg' : 'bg-gray-50 text-slate-400 hover:bg-gray-100'}`}
                    >
                        <Filter size={14} />
                        {showCategoryFilters ? 'Ocultar' : 'Filtrar'}
                    </button>
                    {backupStatus && (
                        <span className="text-[10px] font-bold text-green-500 animate-pulse uppercase tracking-widest ml-4">{backupStatus}</span>
                    )}
                    <button onClick={runBackup} className="p-4 text-slate-300 hover:text-[#8E44AD] transition-all" title="Salvar Backup">
                        <Download size={14} />
                    </button>
                </div>

                {showCategoryFilters && (
                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex overflow-x-auto gap-3 px-6 scrollbar-hide no-scrollbar items-center border-t border-gray-50 pt-4">
                            {Object.entries(categories).filter(([_, c]) => c.type === 'entrada').map(([id, c]) => {
                                const active = activeFilters.category === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => handleFilter({ id })}
                                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 border
                                            ${active ? 'bg-green-100 text-green-600 border-green-200 shadow-sm' : 'bg-green-50/20 text-green-300 border-transparent hover:border-green-100 hover:text-green-500'}`}
                                    >
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex overflow-x-auto gap-3 px-6 scrollbar-hide no-scrollbar items-center">
                            {Object.entries(categories).filter(([_, c]) => c.type === 'saida').map(([id, c]) => {
                                const active = activeFilters.category === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => handleFilter({ id })}
                                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 border
                                            ${active ? 'bg-red-100 text-red-600 border-red-200 shadow-sm' : 'bg-red-50/20 text-red-300 border-transparent hover:border-red-100 hover:text-red-500'}`}
                                    >
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const EditableCell = ({ value, onSave, type = "text", options = null }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [tempValue, setTempValue] = useState(value);

        if (isEditing) {
            return (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    {options ? (
                        <select
                            value={tempValue}
                            onChange={(e) => { onSave(e.target.value); setIsEditing(false); }}
                            className="p-2 border border-purple-200 rounded-lg outline-none bg-white font-black text-[10px] uppercase"
                            autoFocus
                            onBlur={() => setIsEditing(false)}
                        >
                            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                    ) : (
                        <input
                            type={type}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { onSave(tempValue); setIsEditing(false); }
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            className="w-full p-2 border border-purple-200 rounded-lg outline-none bg-white font-black text-xs uppercase"
                            autoFocus
                            onBlur={() => setIsEditing(false)}
                        />
                    )}
                </div>
            );
        }

        return (
            <div
                onClick={() => setIsEditing(true)}
                className="cursor-pointer hover:bg-purple-50/50 p-2 rounded-lg transition-all border border-transparent hover:border-purple-100 group/cell flex items-center justify-between"
            >
                <span>{value}</span>
                <Edit2 size={10} className="text-purple-300 opacity-0 group-hover/cell:opacity-100" />
            </div>
        );
    };

    const TransactionRow = ({ t, categories, toggleStatus, setEditingId }) => {
        const cat = categories[t.category] || categories['outros'];
        const isPlus = (t.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'entrada';
        const st = STATUS_OPTIONS[t.status || 'pago'] || STATUS_OPTIONS['pago'];

        const handleUpdate = (field, value) => {
            updateDoc(doc(db, "transactions", t.id), { [field]: value });
        };

        return (
            <tr className="hover:bg-gray-50/80 transition-all group cursor-default border-b border-gray-50/50">
                <td className="py-6 px-4">
                    <button onClick={() => toggleStatus(t)} className={`px-5 py-2.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] transition-all shadow-sm ${st.color}`}>
                        {st.label}
                    </button>
                </td>
                <td className="py-6 px-4 text-[10px] font-black text-slate-300 uppercase tabular-nums">
                    <EditableCell
                        value={new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        onSave={(val) => {
                            const parts = val.split('/');
                            if (parts.length === 3) {
                                const [d, m, y] = parts;
                                handleUpdate('date', `20${y}-${m}-${d}`);
                            }
                        }}
                    />
                </td>
                <td className="py-6 px-8 font-black text-slate-800 text-sm tracking-tight w-[300px]">
                    <EditableCell
                        value={t.description}
                        onSave={(val) => handleUpdate('description', val)}
                    />
                </td>
                <td className="py-6 px-4">
                    <div className="flex items-center">
                        <select
                            value={t.category}
                            onChange={(e) => handleUpdate('category', e.target.value)}
                            className="bg-purple-50 text-[10px] font-black text-[#8E44AD]/60 uppercase tracking-[0.15em] border border-purple-100/50 px-4 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-purple-100 transition-all"
                        >
                            {Object.entries(categories).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
                        </select>
                    </div>
                </td>
                <td className="py-6 px-4">
                    <select
                        value={t.repeatType || 'avista'}
                        onChange={(e) => handleUpdate('repeatType', e.target.value)}
                        className="bg-transparent text-[9px] font-black text-slate-300 uppercase tracking-widest outline-none cursor-pointer"
                    >
                        <option value="avista">À VISTA</option>
                        <option value="fixo">FIXO</option>
                        <option value="parcelado">PARCELADO</option>
                    </select>
                </td>
                <td className="py-6 px-4 text-[10px] font-black text-slate-300 tabular-nums text-center">
                    {t.repeatType === 'parcelado' ? (
                        <div className="flex items-center justify-center gap-1">
                            <input
                                type="number"
                                defaultValue={t.parcelaNum}
                                onBlur={(e) => handleUpdate('parcelaNum', parseInt(e.target.value))}
                                className="w-8 bg-transparent text-center outline-none hover:bg-gray-100 rounded"
                            />
                            <span>/</span>
                            <input
                                type="number"
                                defaultValue={t.parcelasTotal}
                                onBlur={(e) => handleUpdate('parcelasTotal', parseInt(e.target.value))}
                                className="w-8 bg-transparent text-center outline-none hover:bg-gray-100 rounded"
                            />
                        </div>
                    ) : '--'}
                </td>
                <td className="py-6 px-4">
                    <select
                        value={t.paymentMethod}
                        onChange={(e) => handleUpdate('paymentMethod', e.target.value)}
                        className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer hover:text-[#8E44AD] transition-all"
                    >
                        {Object.entries(PAYMENT_METHODS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
                    </select>
                </td>
                <td className={`py-6 px-4 text-sm font-black text-right tabular-nums tracking-tight ${isPlus ? 'text-green-500' : 'text-slate-800'}`}>
                    <div className="flex items-center justify-end gap-1">
                        <span>{isPlus ? '+ ' : '- '} R$</span>
                        <input
                            type="text"
                            defaultValue={t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            onBlur={(e) => {
                                const val = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.'));
                                if (!isNaN(val)) handleUpdate('amount', val);
                            }}
                            className="bg-transparent text-right outline-none w-[80px] hover:bg-purple-50 rounded p-1 transition-all"
                        />
                    </div>
                </td>
                <td className="py-6 px-6">
                    <EditableCell
                        value={t.observations || 'Nenhuma...'}
                        onSave={(val) => handleUpdate('observations', val)}
                    />
                </td>
                <td className="py-6 px-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setEditingId(t.id)} className="p-2.5 text-slate-300 hover:text-[#8E44AD] hover:bg-purple-50 rounded-xl transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                    </div>
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
            <div className="bg-white p-4 rounded-[2rem] shadow-sm mb-3 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center">
                    <span className="px-4 py-1.5 rounded-lg bg-purple-50 text-[10px] font-black text-[#8E44AD]/60 uppercase tracking-[0.15em] border border-purple-100/50">
                        {cat.label}
                    </span>
                </div>
                <p className="font-bold text-slate-800 text-base">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
        <div className="min-h-screen bg-white pb-24 lg:pb-0 lg:flex overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[380px]'} h-screen p-8 shrink-0 overflow-hidden relative z-[300]`}>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-20 bg-white border border-gray-100 p-1.5 rounded-full shadow-md z-10 hover:text-[#8E44AD] transition-all"
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className={`flex flex-col items-center mb-10 relative transition-all ${isSidebarCollapsed ? 'scale-75' : ''}`}>
                    <img src="./logo.png" alt="Minha Merreca" className="w-[120px] h-auto object-contain" />
                </div>

                <div className="flex flex-col gap-2 flex-1">
                    <button onClick={() => setView('HOME')} className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 transition-all ${view === 'HOME' ? 'bg-[#8E44AD] text-white shadow-lg' : 'text-slate-400 hover:bg-gray-50'}`}>
                        <Home size={20} />
                        {!isSidebarCollapsed && <span className="font-bold">Dashboard</span>}
                    </button>
                    <button onClick={() => setView('REPORTS')} className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 transition-all ${view === 'REPORTS' ? 'bg-[#8E44AD] text-white shadow-lg' : 'text-slate-400 hover:bg-gray-50'}`}>
                        <BarChart2 size={20} />
                        {!isSidebarCollapsed && <span className="font-bold">Relatórios</span>}
                    </button>
                    <button onClick={() => setView('GOALS')} className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 transition-all ${view === 'GOALS' ? 'bg-[#8E44AD] text-white shadow-lg' : 'text-slate-400 hover:bg-gray-50'}`}>
                        <Target size={20} />
                        {!isSidebarCollapsed && <span className="font-bold">Metas</span>}
                    </button>
                    <button onClick={() => setView('CAT_MGMT')} className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 transition-all ${view === 'CAT_MGMT' ? 'bg-[#8E44AD] text-white shadow-lg' : 'text-slate-400 hover:bg-gray-50'}`}>
                        <Settings size={20} />
                        {!isSidebarCollapsed && <span className="font-bold">Categorias</span>}
                    </button>
                    <button onClick={() => setMerrecaOpen(true)} className={`w-full py-4 px-6 rounded-2xl flex items-center gap-4 transition-all text-slate-400 hover:bg-purple-50 hover:text-[#8E44AD]`}>
                        <Sparkles size={20} />
                        {!isSidebarCollapsed && <span className="font-bold">Merreca IA</span>}
                    </button>
                </div>

                <div className="flex gap-2 mb-5 shrink-0">
                    <div className="flex-1 bg-white border border-gray-100 rounded-[1.2rem] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
                        <p className="text-[7px] font-black text-green-500 uppercase tracking-[0.2em] mb-0.5 text-center font-outfit">Ganhos</p>
                        <p className="text-[10px] font-black text-green-700 text-center tabular-nums">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex-1 bg-white border border-gray-100 rounded-[1.2rem] p-3 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
                        <p className="text-[7px] font-black text-red-500 uppercase tracking-[0.2em] mb-0.5 text-center font-outfit">Gastos</p>
                        <p className="text-[10px] font-black text-red-600 text-center tabular-nums">R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-[2.5rem] space-y-4 border border-gray-100 flex-1 flex flex-col justify-center min-h-0">
                    <div className="flex bg-white p-1 rounded-[1.2rem] border border-gray-100 shrink-0">
                        <button onClick={() => setEntryType('saida')} className={`flex-1 py-2.5 rounded-[1rem] font-black text-[9px] uppercase tracking-widest transition-all ${entryType === 'saida' ? 'bg-[#FF4B4B] text-white shadow-lg shadow-red-100' : 'text-slate-200 '}`}>Gasto</button>
                        <button onClick={() => setEntryType('entrada')} className={`flex-1 py-2.5 rounded-[1rem] font-black text-[9px] uppercase tracking-widest transition-all ${entryType === 'entrada' ? 'bg-[#2ECC71] text-white shadow-lg shadow-green-100' : 'text-slate-200 '}`}>Ganhos</button>
                    </div>

                    <div className="text-center shrink-0 flex items-center justify-center relative group">
                        <span className="text-xl font-black text-slate-300 mr-1">R$</span>
                        <input
                            inputMode="numeric"
                            value={amount}
                            onChange={handleAmountChange}
                            className="w-full text-center text-4xl font-black text-slate-800 bg-transparent outline-none tracking-widest tabular-nums max-w-[150px]"
                            placeholder="0,00"
                        />
                        <button
                            onClick={startVoiceCommand}
                            className={`absolute -right-2 p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-300 hover:text-[#8E44AD]'}`}
                        >
                            <Mic size={18} />
                        </button>
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

                        <div className="flex items-center justify-between px-4 py-2 bg-white rounded-[1.2rem] shadow-sm border border-transparent">
                            <label className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] cursor-pointer flex items-center gap-2" onClick={() => setIgnoreInReports(!ignoreInReports)}>
                                <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${ignoreInReports ? 'bg-red-500 border-red-500' : 'bg-white border-gray-200 '}`}>
                                    {ignoreInReports && <Check size={10} className="text-white" />}
                                </div>
                                Ignorar em relatórios
                            </label>
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
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
                {view !== 'CAT_MGMT' && view !== 'ENTRY' && <MonthSelector viewMonth={viewMonth} changeMonth={changeMonth} />}

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
                            {filteredTransactions.length === 0 && (
                                <div className="py-24 text-center flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-700">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-slate-200 ">
                                        <Inbox size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[10px]">Silêncio por aqui...</p>
                                        <p className="text-slate-200 font-bold text-xs italic">Sua lista de merrecas está vazia.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'ENTRY' && (isMobile ? (
                        <div className="fixed inset-0 z-[50] bg-white w-full h-full overflow-hidden flex flex-col">
                            {/* Header Mobile Compacto */}
                            <div className="shrink-0 p-4 pb-0">
                                <div className="flex bg-gray-50 p-1 rounded-xl">
                                    <button onClick={() => { setEntryType('saida'); setSelectedCat('outros'); }} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${entryType === 'saida' ? 'bg-[#FF4B4B] text-white shadow-sm' : 'text-slate-400'}`}>Gasto</button>
                                    <button onClick={() => { setEntryType('entrada'); setSelectedCat('dani'); }} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${entryType === 'entrada' ? 'bg-white text-green-500 shadow-sm' : 'text-slate-400'}`}>Ganhos</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 pt-0 space-y-3 pb-36">
                                {/* Valor Compacto */}
                                <div className="text-center">
                                    <div className="relative flex items-center justify-center gap-1">
                                        <span className="text-[16px] font-black text-slate-300 opacity-60">R$</span>
                                        <input autoFocus inputMode="decimal" value={amount} onChange={handleAmountChange} placeholder="0,00" className="w-full max-w-[200px] text-[52px] leading-[1.1] font-black text-slate-800 outline-none text-center bg-transparent border-b-2 border-slate-50 focus:border-[#8E44AD] transition-all" />
                                    </div>
                                </div>

                                {/* Categoria */}
                                <div>
                                    <label className="text-[8px] font-black uppercase text-slate-300 block mb-1 tracking-widest text-center">Categoria</label>
                                    <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl font-bold text-slate-700 outline-none text-center text-sm shadow-sm appearance-none border border-transparent focus:border-[#8E44AD]/20">
                                        {Object.entries(categories).filter(([_, c]) => c.type === entryType || c.type === 'both').map(([id, c]) => (<option key={id} value={id}>{c.label.toUpperCase()}</option>))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[8px] font-black uppercase text-slate-300 block mb-1 tracking-widest">Data</label>
                                        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl font-bold text-slate-700 outline-none text-xs border border-transparent focus:border-[#8E44AD]/20" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black uppercase text-slate-300 block mb-1 tracking-widest">Pagamento</label>
                                        <select value={selectedPayment} onChange={e => setSelectedPayment(e.target.value)} className="w-full p-2 bg-gray-50 rounded-xl font-bold text-slate-700 outline-none text-xs border border-transparent focus:border-[#8E44AD]/20">
                                            {Object.entries(PAYMENT_METHODS).map(([id, p]) => (<option key={id} value={id}>{p.label}</option>))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[8px] font-black uppercase text-slate-300 block mb-1 tracking-widest">Descrição</label>
                                    <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-slate-700 outline-none text-sm border border-transparent focus:border-[#8E44AD]/20" />
                                </div>

                                <div className="bg-gray-50 p-3 rounded-2xl space-y-2 border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Repetição/Parcelas</label>
                                        <div className="flex gap-1">
                                            {['avista', 'fixo', 'parcelado'].map(type => (
                                                <button key={type} onClick={() => setRepeatType(type)} className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${repeatType === type ? 'bg-[#8E44AD] text-white shadow-sm' : 'bg-white text-slate-300'}`}>
                                                    {type === 'avista' ? 'À vista' : type === 'fixo' ? 'Fixo' : 'Parc.'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {repeatType === 'parcelado' && (
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                            <label className="text-[8px] font-black uppercase text-slate-400">Qtd</label>
                                            <input type="number" min="1" max="72" value={installments} onChange={e => setInstallments(parseInt(e.target.value))} className="w-12 p-1 bg-white rounded-lg text-center font-black text-xs text-[#8E44AD] outline-none border border-gray-200" />
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleSave} className={`w-full text-white py-4 rounded-2xl font-black text-lg shadow-lg uppercase tracking-widest ${entryType === 'saida' ? 'bg-[#FF4B4B] shadow-red-100/50' : 'bg-[#2ECC71] shadow-green-100/50'}`}>
                                    Anotar
                                </button>
                                <button onClick={() => { resetForm(); setView('HOME'); }} className="w-full py-2 text-slate-300 font-bold uppercase tracking-widest text-[8px]">Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden"></div>
                    ))}
                    {view === 'REPORTS' && (
                        <div className="max-w-5xl mx-auto space-y-10 pt-10 px-6 pb-20" id="report-container">
                            <div className="text-center group">
                                <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase mb-2">Minha Merreca ✨</h2>
                            </div>

                            <div className="flex items-center justify-end mb-4">
                                <button
                                    onClick={generatePDFReport}
                                    className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-slate-400 hover:text-[#8E44AD] transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                                >
                                    <Download size={18} /> Exportar PDF
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Entradas</p>
                                    <p className="text-4xl font-black text-green-700 tabular-nums">R$ {(totals?.income || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col justify-center">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Gastos</p>
                                    <p className="text-4xl font-black text-red-700 tabular-nums">R$ {(totals?.expense || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-[#8E44AD] p-8 rounded-[3.5rem] shadow-lg shadow-purple-200 flex flex-col justify-center text-white">
                                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">Saldo Livre</p>
                                    <p className="text-4xl font-black tabular-nums">R$ {(totals?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-gray-100">
                                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-8 text-center">Distribuição de Gastos</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryStats && categoryStats.length > 0 ? categoryStats.filter(s => s.total > 0) : []}
                                                    cx="50%" cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={120}
                                                    paddingAngle={5}
                                                    dataKey="total"
                                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                >
                                                    {categoryStats && categoryStats.filter(s => s.total > 0).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color ? entry.color.replace('bg-', '#').replace('[', '').replace(']', '') : '#8E44AD'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                                    formatter={(value) => `R$ ${value ? value.toLocaleString('pt-BR') : '0,00'}`}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-gray-100">
                                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-8 text-center">Evolução Semanal</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={(() => {
                                                const currentMonth = new Date().getMonth();
                                                const currentYear = new Date().getFullYear();
                                                const weeks = [];
                                                for (let i = 1; i <= 31; i += 7) {
                                                    const start = i;
                                                    const end = Math.min(i + 6, 31);
                                                    const income = transactions ? transactions.filter(t => {
                                                        const d = new Date(t.date + 'T12:00:00');
                                                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d.getDate() >= start && d.getDate() <= end && t.type === 'entrada';
                                                    }).reduce((acc, t) => acc + t.amount, 0) : 0;
                                                    const expense = transactions ? transactions.filter(t => {
                                                        const d = new Date(t.date + 'T12:00:00');
                                                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d.getDate() >= start && d.getDate() <= end && t.type === 'saida';
                                                    }).reduce((acc, t) => acc + t.amount, 0) : 0;
                                                    weeks.push({ name: `${start}-${end}`, entradas: income, gastos: expense });
                                                }
                                                return weeks;
                                            })()}>
                                                <defs>
                                                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#2ECC71" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#FF4B4B" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#FF4B4B" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                                                />
                                                <Area type="monotone" dataKey="entradas" stroke="#2ECC71" strokeWidth={4} fillOpacity={1} fill="url(#colorEntradas)" />
                                                <Area type="monotone" dataKey="gastos" stroke="#FF4B4B" strokeWidth={4} fillOpacity={1} fill="url(#colorGastos)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-gray-100 overflow-hidden">
                                <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] mb-12 text-center">Maiores Gastos por Categoria</h3>
                                <div className="space-y-4">
                                    {categoryStats && categoryStats.slice(0, 5).map(stat => (
                                        <div key={stat.id} className="group">
                                            <div className="flex justify-between mb-2">
                                                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{stat.config.label}</p>
                                                <p className="text-sm font-black text-slate-800 tabular-nums">R$ {stat.total.toLocaleString('pt-BR')}</p>
                                            </div>
                                            <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#8E44AD] rounded-full transition-all duration-700"
                                                    style={{ width: `${stat.percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-16 bg-white rounded-[4rem] p-16 shadow-[0_30px_100px_rgba(0,0,0,0.03)] border border-gray-100">
                                <h3 className="text-3xl font-black text-slate-800 mb-16 uppercase tracking-[0.3em] text-center font-outfit">Visão Anual</h3>
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[300px] lg:min-w-[900px]">
                                        <thead>
                                            <tr className="text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em]">
                                                <th className="py-8 px-6 font-outfit">Categoria</th>
                                                {isMobile ? (
                                                    <th className="py-8 px-2 text-center font-outfit bg-[#8E44AD]/5 rounded-t-2xl">{MONTHS[viewMonth].substring(0, 3)}</th>
                                                ) : (
                                                    MONTHS.map(m => <th key={m} className="py-8 px-2 text-center font-outfit">{m.substring(0, 3)}</th>)
                                                )}
                                                <th className="py-8 px-6 text-right font-outfit">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50/30">
                                            {annualData?.rows?.map(row => (
                                                <tr key={row.id} className="hover:bg-gray-50/50 transition-all group">
                                                    <td className="py-6 px-6">
                                                        <span className="px-4 py-1.5 rounded-lg bg-white shadow-sm text-[10px] font-black text-slate-400 border border-slate-100 uppercase tracking-[0.15em] flex items-center justify-between gap-4">
                                                            {row.config.label}
                                                            <div className="w-16 h-6">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={row.values.slice(0, 12).map((v, i) => ({ v, i }))}>
                                                                        <Line type="monotone" dataKey="v" stroke="#8E44AD" strokeWidth={2} dot={false} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </span>
                                                    </td>
                                                    {isMobile ? (
                                                        <td className={`py-6 px-2 text-center text-sm tabular-nums bg-[#8E44AD]/5 ${row.values[viewMonth] > 0 ? 'font-black text-slate-800' : 'font-medium text-slate-200'}`}>
                                                            {row.values[viewMonth] > 0 ? row.values[viewMonth].toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                                                        </td>
                                                    ) : (
                                                        row.values.slice(0, 12).map((val, i) => (
                                                            <td key={i} className={`py-6 px-2 text-center text-sm tabular-nums ${val > 0 ? 'font-black text-slate-800' : 'font-medium text-slate-200'}`}>
                                                                {val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                                                            </td>
                                                        ))
                                                    )}
                                                    <td className="py-6 px-6 text-right text-sm font-black text-slate-800 tabular-nums">
                                                        R$ {row.values[12].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50/20 font-black text-slate-800 border-t-4 border-white">
                                                <td className="py-10 px-6 text-[12px] uppercase tracking-[0.2em] font-outfit">Gastos</td>
                                                {isMobile ? (
                                                    <td className="py-10 px-2 text-center text-[13px] tabular-nums text-red-500 bg-[#8E44AD]/5">
                                                        {(annualData?.summary?.expense?.[viewMonth] || 0) > 0 ? annualData.summary.expense[viewMonth].toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                                    </td>
                                                ) : (
                                                    annualData?.summary?.expense?.slice(0, 12).map((val, i) => (
                                                        <td key={i} className="py-10 px-2 text-center text-[13px] tabular-nums text-red-500">
                                                            {val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                                        </td>
                                                    ))
                                                )}
                                                <td className="py-10 px-6 text-right text-[14px] text-red-600 tabular-nums">
                                                    R$ {(annualData?.summary?.expense?.[12] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'CAT_MGMT' && (
                        <div className="max-w-5xl mx-auto space-y-12 pt-16 text-center pb-20">
                            <h2 className="text-5xl font-black text-slate-800 tracking-tight uppercase px-6">Categorias 🎯</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
                                {Object.entries(categories).map(([id, c]) => (
                                    <div key={id} className="flex items-center justify-between p-7 bg-white rounded-[3rem] shadow-sm border border-gray-100 group hover:scale-[1.02] transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-3 h-10 ${c.color} rounded-full shadow-lg`}></div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">{c.type === 'entrada' ? 'Ganhos' : 'Gasto'}</p>
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

                    {view === 'GOALS' && (
                        <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(categories)
                                    .filter(([_, c]) => c.type === 'saida')
                                    .map(([id, category]) => {
                                        const existingGoal = goals.find(g => g.category === id);

                                        // Calculate 3-month average if no goal exists
                                        const average = existingGoal ? existingGoal.target : (() => {
                                            const today = new Date();
                                            const threeMonthsAgo = new Date();
                                            threeMonthsAgo.setMonth(today.getMonth() - 3);

                                            const relevantTransactions = transactions.filter(t =>
                                                t.category === id &&
                                                t.type === 'saida' &&
                                                new Date(t.date + 'T12:00:00') >= threeMonthsAgo &&
                                                new Date(t.date + 'T12:00:00') <= today
                                            );

                                            // Simply sum / 3 for monthly average estimate
                                            const total = relevantTransactions.reduce((acc, t) => acc + t.amount, 0);
                                            return total > 0 ? Math.ceil(total / 3) : 1000; // Default to 1000 if no data
                                        })();

                                        const targetValue = existingGoal ? existingGoal.target : average;

                                        const monthSpend = transactions
                                            .filter(t => t.category === id && new Date(t.date + 'T12:00:00').getMonth() === viewMonth)
                                            .reduce((acc, t) => acc + t.amount, 0);

                                        const progress = Math.min(100, Math.max(0, (monthSpend / targetValue) * 100));
                                        const isExceeded = monthSpend > targetValue;

                                        return (
                                            <div key={id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 group relative overflow-hidden">
                                                <div className={`absolute top-0 left-0 w-2 h-full ${category.color || 'bg-[#8E44AD]'}`}></div>
                                                <div className="flex justify-between items-center mb-6">
                                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{category.label}</h3>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Gasto</p>
                                                            <p className={`text-3xl font-black tabular-nums ${isExceeded ? 'text-red-500' : 'text-slate-700'}`}>
                                                                R$ {monthSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Meta</p>
                                                            <div className="flex items-center justify-end">
                                                                <span className="text-sm font-bold text-slate-400 mr-1">R$</span>
                                                                <input
                                                                    type="number"
                                                                    defaultValue={targetValue}
                                                                    onBlur={async (e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        if (!val) return;

                                                                        // Save or Update Goal
                                                                        if (existingGoal) {
                                                                            if (existingGoal.target !== val) {
                                                                                await updateDoc(doc(db, "goals", existingGoal.id), { target: val });
                                                                            }
                                                                        } else {
                                                                            await addDoc(collection(db, "goals"), {
                                                                                category: id,
                                                                                title: category.label,
                                                                                target: val,
                                                                                createdAt: new Date().toISOString()
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="w-24 text-right font-black text-slate-500 text-lg bg-gray-50 rounded-lg px-2 py-1 outline-none focus:bg-white focus:ring-2 focus:ring-[#8E44AD]/20 transition-all border border-transparent focus:border-[#8E44AD]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative h-4 bg-gray-50 rounded-full border border-gray-100 overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ease-out ${isExceeded ? 'bg-red-500' : (category.color || 'bg-[#8E44AD]')}`}
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </main >

            {/* Bottom Nav Mobile */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 pt-4 pb-[env(safe-area-inset-bottom,20px)] flex items-center justify-between z-[200] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <button onClick={() => setView('HOME')} className={`p-3 rounded-2xl transition-all ${view === 'HOME' ? 'bg-[#8E44AD] text-white shadow-lg' : 'text-slate-500'}`}><Home size={20} /></button>
                <button onClick={() => setView('REPORTS')} className={`p-3 rounded-2xl transition-all ${view === 'REPORTS' ? 'bg-[#8E44AD] text-white shadow-lg' : 'text-slate-500'}`}><BarChart2 size={20} /></button>
                <button onClick={() => setView('ENTRY')} className={`p-4 rounded-full shadow-2xl scale-110 -translate-y-6 border-4 border-white font-black relative transition-all ${view === 'ENTRY' ? 'bg-[#8E44AD] text-white' : 'bg-[#8E44AD] text-white'}`}>
                    <Plus size={24} />
                </button>
                <button onClick={() => setView('GOALS')} className={`p-3 rounded-2xl transition-all ${view === 'GOALS' ? 'bg-[#8E44AD] text-white shadow-lg' : 'text-slate-500'}`}><Target size={20} /></button>
                <button onClick={() => setMerrecaOpen(true)} className="p-3 text-slate-500 hover:text-[#8E44AD] transition-all"><Sparkles size={20} /></button>
            </div>

            {
                deleteModal && (
                    <div className="fixed inset-0 bg-black/60 z-[600] flex items-center justify-center p-6 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center animate-in zoom-in duration-300">
                            <h2 className="text-3xl font-black mb-4 ">Atenção!</h2>
                            <p className="font-bold text-slate-400 mb-8">Esta é uma merreca recorrente. O que deseja fazer?</p>
                            <div className="space-y-3">
                                <button onClick={() => handleDeleteConfirm('single')} className="w-full bg-slate-100 py-4 rounded-2xl font-bold ">Apenas agora</button>
                                <button onClick={() => handleDeleteConfirm('future')} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase">Apagar tudo</button>
                                <button onClick={() => setDeleteModal(null)} className="w-full py-4 text-slate-300 font-bold uppercase text-xs">Desistir</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {renderMerrecaChat()}

            {
                editingCatId && (
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
                                            <option value="saida">Gasto</option>
                                            <option value="entrada">Ganhos</option>
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
                )
            }
        </div >
    );
}

export default function MinhaMerreca() {
    return (
        <ErrorBoundary>
            <MinhaMerrecaContent />
        </ErrorBoundary>
    );
}
