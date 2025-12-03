import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="flex min-h-screen">
      {/* LEWY PANEL (ok. 25%) */}
      <aside className="w-1/4 bg-gray-100 flex flex-col border-r border-gray-300">
        {/* Placeholder Logo [cite: 30] */}
        <div className="h-40 bg-gray-300 flex items-center justify-center">
          <span className="text-gray-500 font-bold text-xl">LOGO</span>
        </div>
        
        {/* Linia oddzielająca [cite: 31] */}
        <hr className="border-gray-400" />
        
        {/* Menu [cite: 31-32] */}
        <div className="flex-grow">
          <div className="p-2 font-bold text-center">Menu</div>
          <nav className="flex flex-col">
             <Link to="/" className="p-4 bg-white border-b hover:bg-blue-50 text-center">O nas</Link>
             <Link to="/booking" className="p-4 bg-white border-b hover:bg-blue-50 text-center">Umów wizytę</Link>
             <Link to="/my-visits" className="p-4 bg-white border-b hover:bg-blue-50 text-center">Twoje Wizyty</Link>
             <Link to="/pricing" className="p-4 bg-white border-b hover:bg-blue-50 text-center">Cennik</Link>
             <Link to="/contact" className="p-4 bg-white border-b hover:bg-blue-50 text-center">Kontakt</Link>
             <Link to="/employee" className="p-4 bg-white border-b hover:bg-blue-50 text-center text-red-800">Dla Pracowników</Link>
          </nav>
        </div>

        {/* Sekcja użytkownika [cite: 33] */}
        <div className="p-4 bg-gray-200 text-center">
          <div className="mb-2">👤 {user ? `${user.firstName} ${user.lastName}` : 'Niezalogowany'}</div>
          {user ? (
            <button onClick={logout} className="w-full bg-red-500 text-white py-1 mb-1">Wyloguj</button>
          ) : (
            <>
              <button onClick={() => openAuth('login')} className="w-full bg-blue-500 text-white py-1 mb-1">Zaloguj się</button>
              <button onClick={() => openAuth('register')} className="w-full bg-green-500 text-white py-1">Zarejestruj się</button>
            </>
          )}
        </div>
      </aside>

      {/* PRAWA SEKCJA (75%) [cite: 36-37] */}
      <main className="w-3/4 flex flex-col">
        {/* Nagłówek */}
        <header className="py-6 text-center border-b-2 border-gray-200">
          <h1 className="text-3xl font-bold uppercase">System Rezerwacji Wizyt</h1>
        </header>
        
        {/* Treść */}
        <div className="flex-grow p-8 overflow-auto">
          {children}
        </div>
      </main>

      {/* Popup logowania [cite: 34-35] */}
      {isAuthModalOpen && (
        <AuthModal mode={authMode} onClose={() => setAuthModalOpen(false)} />
      )}
    </div>
  );
};

export default Layout;