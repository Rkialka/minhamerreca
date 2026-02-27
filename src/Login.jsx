import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { auth } from './firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from 'firebase/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            const messages = {
                'auth/invalid-email': 'Email inválido.',
                'auth/user-not-found': 'Usuário não encontrado.',
                'auth/wrong-password': 'Senha incorreta.',
                'auth/email-already-in-use': 'Este email já está em uso.',
                'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
                'auth/invalid-credential': 'Email ou senha incorretos.',
                'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
            };
            setError(messages[err.code] || 'Erro ao entrar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <img src="./logo.png" alt="Minha Merreca" className="h-20 mx-auto mb-6 object-contain" />
                    <h1 className="text-xl font-black text-[#2C3E50] uppercase tracking-[0.2em]">
                        {isSignUp ? 'Criar Conta' : 'Entrar'}
                    </h1>
                    <p className="text-xs text-gray-400 mt-2 font-bold">
                        {isSignUp ? 'Crie sua conta para começar' : 'Acesse sua conta'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative">
                        <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-gray-50 border border-gray-100 p-5 pl-14 rounded-2xl font-bold text-sm outline-none focus:border-[#2ECC71] text-[#2C3E50] transition-colors"
                        />
                    </div>

                    <div className="relative">
                        <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-gray-50 border border-gray-100 p-5 pl-14 pr-14 rounded-2xl font-bold text-sm outline-none focus:border-[#2ECC71] text-[#2C3E50] transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-2xl text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#2ECC71] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-green-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Aguarde...' : (isSignUp ? 'Criar Conta' : 'Entrar Agora')}
                    </button>
                </form>

                <div className="text-center mt-8">
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                        className="text-xs font-bold text-gray-400 hover:text-[#2ECC71] transition-colors"
                    >
                        {isSignUp ? 'Já tem conta? Entre aqui' : 'Não tem conta? Crie uma'}
                    </button>
                </div>
            </div>
        </div>
    );
}
