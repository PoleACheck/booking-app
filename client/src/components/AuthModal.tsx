import { useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';

interface Props {
  mode: 'login' | 'register';
  onClose: () => void;
}

const AuthModal = ({ mode, onClose }: Props) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (mode === 'login') {
        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        login(res.data.token, res.data.user);
        onClose();
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, formData);
        // Po rejestracji automatyczne logowanie lub prośba o zalogowanie
        alert('Rejestracja udana! Zaloguj się.');
        onClose(); // Lub przełącz na tryb logowania
      }
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || 'Wystąpił błąd serwera');
      } else {
        setError('Wystąpił nieoczekiwany błąd');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500">X</button>
        <h2 className="text-xl font-bold mb-4 text-center">
          {mode === 'login' ? 'Logowanie' : 'Rejestracja'}
        </h2>
        
        {error && <div className="bg-red-100 text-red-700 p-2 mb-2 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <>
              <input placeholder="Imię" required className="border p-2" 
                onChange={e => setFormData({...formData, firstName: e.target.value})} />
              <input placeholder="Nazwisko" required className="border p-2" 
                onChange={e => setFormData({...formData, lastName: e.target.value})} />
              <input placeholder="Telefon" required className="border p-2" 
                onChange={e => setFormData({...formData, phone: e.target.value})} />
            </>
          )}
          <input type="email" placeholder="Email" required className="border p-2" 
            onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder="Hasło" required className="border p-2" 
            onChange={e => setFormData({...formData, password: e.target.value})} />
          
          <button type="submit" className="bg-blue-600 text-white py-2 mt-2 hover:bg-blue-700">
            {mode === 'login' ? 'Zaloguj' : 'Zarejestruj'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;