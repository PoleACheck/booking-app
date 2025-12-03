import { useState, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import CalendarView from '../components/CalendarView';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Service {
  id: number;
  name: string;
  price: number;
}

const Booking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [description, setDescription] = useState('');
  
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/services`).then(res => setServices(res.data));
  }, []);

  const handleConfirm = async () => {
    if (!user) return alert('Musisz być zalogowany!');
    if (!selectedSlotId || !selectedService) return alert('Wybierz usługę i termin.');

    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/visits/book`, {
        slotId: selectedSlotId,
        serviceId: selectedService,
        description
      });
      alert('Wizyta umówiona pomyślnie!');
      navigate('/my-visits');
    } catch (err) {
      if (isAxiosError(err)) {
        alert(err.response?.data?.message || 'Błąd rezerwacji. Sprawdź, czy termin jest nadal dostępny.');
      } else {
        alert('Wystąpił nieoczekiwany błąd.');
      }
    }
  };

  return (
    <div className="flex h-full">
      {/* Lewa kolumna: Formularz */}
      <div className="w-1/3 pr-4 border-r flex flex-col gap-4">
        <div>
            <label className="block font-bold mb-2">Wybierz usługę</label>
            <select 
              className="w-full p-2 border"
              value={selectedService}
              onChange={e => setSelectedService(e.target.value)}
            >
              <option value="">-- Wybierz --</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.price} zł)</option>
              ))}
            </select>
        </div>

        <div>
            <label className="block font-bold mb-2">Dodatkowe informacje</label>
            <textarea 
              className="w-full p-2 border h-32" 
              maxLength={1000}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
        </div>

        <div className="mt-auto bg-blue-50 p-4 rounded">
            <p className="font-bold">Wybrany slot ID: {selectedSlotId || 'Brak'}</p>
            <button 
                onClick={handleConfirm}
                className="w-full mt-2 bg-green-600 text-white py-3 font-bold rounded hover:bg-green-700"
            >
              Potwierdź wizytę
            </button>
        </div>
      </div>

      {/* Prawa kolumna: Kalendarz */}
      <div className="w-2/3 pl-4">
        <h2 className="font-bold text-xl mb-4">Wybierz termin</h2>
        {/* Używamy komponentu w trybie 'booking' */}
        <CalendarView 
            mode="booking" 
            onSlotSelect={(id) => setSelectedSlotId(id)} 
        />
      </div>
    </div>
  );
};

export default Booking;