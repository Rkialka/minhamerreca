import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import { auth } from './firebaseConfig'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import './index.css'

function Root() {
    const [user, setUser] = useState(null)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u)
            setChecking(false)
        })
        return () => unsubscribe()
    }, [])

    if (checking) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <img src="./logo.png" alt="Minha Merreca" className="h-16 mx-auto mb-4 object-contain animate-pulse" />
                    <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Login />
    }

    return <App user={user} onSignOut={() => signOut(auth)} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
