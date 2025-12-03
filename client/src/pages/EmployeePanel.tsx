import { useState, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import CalendarView from '../components/CalendarView';

interface Service {
  id: number;
  name: string;
  price: number;
}

interface Visit {
  id: number;
  date: string;
  patientFirst: string;
  patientLast: string;
  serviceName: string;
  user?: { phone: string };
}

const EmployeePanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'visits' | 'availability' | 'prices'>('visits');
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [editedPrices, setEditedPrices] = useState<{[key: number]: number}>({});
  
  // Stan dla Modala Edycji (Przekładanie wizyty) 
  const [isRescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [visitToReschedule, setVisitToReschedule] = useState<number | null>(null);

  const [refreshKey, setRefreshKey] = useState(0); // Do wymuszania odświeżania

  useEffect(() => {
    if (activeTab === 'visits') fetchAllVisits();
    if (activeTab === 'prices') fetchServices();
  }, [activeTab, refreshKey]);

  if (!user || user.role !== 'admin') {
    return <div>Brak dostępu.</div>;
  }

  const fetchAllVisits = () => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visits/admin/all`).then(res => setAllVisits(res.data));
  };

  const fetchServices = () => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/services`).then(res => {
      setServices(res.data);
      const initialPrices: { [key: number]: number } = {};
      res.data.forEach((s: Service) => initialPrices[s.id] = s.price);
      setEditedPrices(initialPrices);
    });
  };

  // Logika 7.3: Ceny
  const handlePriceSave = async () => {
    const updates = Object.keys(editedPrices).map(id => ({
      id: Number(id),
      price: Number(editedPrices[Number(id)])
    }));
    await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/services/update`, updates);
    alert('Ceny zaktualizowane!');
  };

  // Logika 7.1: Anulowanie
  const handleCancelVisitAdmin = async (id: number) => {
    if(confirm('Potwierdź anulowanie wizyty klienta.')) {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/visits/cancel/${id}`); 
      setRefreshKey(prev => prev + 1);
    }
  };

  // Logika 7.1: Edycja (Otwarcie modala)
  const openRescheduleModal = (visitId: number) => {
    setVisitToReschedule(visitId);
    setRescheduleModalOpen(true);
  };

  // Logika 7.1: Potwierdzenie zmiany terminu
  const handleRescheduleConfirm = async (newSlotId: number) => {
    if (!confirm('Czy na pewno chcesz przenieść wizytę na ten termin?')) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/visits/admin/reschedule`, {
        visitId: visitToReschedule,
        newSlotId
      });
      alert('Wizyta przeniesiona.');
      setRescheduleModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      if (isAxiosError(err)) {
        alert(err.response?.data?.message || 'Błąd przenoszenia wizyty. Sprawdź, czy termin jest nadal dostępny.');
      } else {
        alert('Wystąpił nieoczekiwany błąd.');
      }
    }
  };

  return (
    <div>
      {/* Menu Zakładek */}
      <div className="flex border-b mb-6">
        <button onClick={() => setActiveTab('visits')} className={`p-3 ${activeTab === 'visits' ? 'border-b-2 border-blue-500 font-bold' : ''}`}>Zarządzaj Wizytami</button>
        <button onClick={() => setActiveTab('availability')} className={`p-3 ${activeTab === 'availability' ? 'border-b-2 border-blue-500 font-bold' : ''}`}>Wyłącz dni/godziny</button>
        <button onClick={() => setActiveTab('prices')} className={`p-3 ${activeTab === 'prices' ? 'border-b-2 border-blue-500 font-bold' : ''}`}>Zmień Ceny</button>
      </div>

      {/* 7.1 ZARZĄDZAJ WIZYTAMI */}
      {activeTab === 'visits' && (
        <>
            <table className="w-full text-sm bg-white shadow rounded">
            <thead className="bg-gray-100">
                <tr>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Pacjent</th>
                <th className="p-3 text-left">Usługa</th>
                <th className="p-3 text-right">Akcje</th>
                </tr>
            </thead>
            <tbody>
                {allVisits.map(v => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{format(new Date(v.date), 'dd.MM HH:mm')}</td>
                    <td className="p-3 font-bold">{v.patientFirst} {v.patientLast} <br/><span className="font-normal text-xs text-gray-500">Tel: {v.user?.phone}</span></td>
                    <td className="p-3">{v.serviceName}</td>
                    <td className="p-3 text-right">
                    <button onClick={() => openRescheduleModal(v.id)} className="mr-3 text-blue-600 hover:underline">Edytuj Termin</button>
                    <button onClick={() => handleCancelVisitAdmin(v.id)} className="text-red-600 hover:underline">Anuluj</button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>

            {/* Modal Kalendarza do zmiany terminu */}
            {isRescheduleModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-10">
                    <div className="bg-white p-6 rounded shadow-lg w-full max-w-4xl h-[90vh] overflow-y-auto">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-xl font-bold">Wybierz nową datę wizyty</h3>
                            <button onClick={() => setRescheduleModalOpen(false)} className="text-red-500 font-bold">Zamknij</button>
                        </div>
                        <CalendarView mode="booking" onSlotSelect={handleRescheduleConfirm} />
                    </div>
                </div>
            )}
        </>
      )}

      {/* 7.2 WYŁĄCZ DNI/GODZINY [cite: 94-99] */}
      {activeTab === 'availability' && (
        <div className="bg-white p-4 shadow rounded">
          <div className="mb-4 bg-yellow-50 p-3 border-l-4 border-yellow-400 text-sm">
            <p><strong>Instrukcja:</strong> Kliknij w konkretną godzinę, aby zablokować/odblokować pojedynczy termin. Kliknij w nagłówek dnia, aby zablokować cały dzień.</p>
          </div>
          {/* Używamy CalendarView w trybie 'admin-block' */}
          <CalendarView mode="admin-block" />
        </div>
      )}

      {/* 7.3 ZMIEŃ CENY */}
      {activeTab === 'prices' && (
        <div className="bg-white p-6 shadow rounded max-w-2xl">
          <table className="w-full mb-6">
            <tbody>
              {services.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-right">
                    <input 
                      type="number" 
                      className="border p-2 w-32 text-right rounded"
                      value={editedPrices[s.id] || 0}
                      onChange={(e) => setEditedPrices({...editedPrices, [s.id]: Number(e.target.value)})}
                    /> <span className="ml-2">PLN</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4">
            <button onClick={handlePriceSave} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded font-bold shadow">Zatwierdź zmiany</button>
            <button onClick={fetchServices} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded">Anuluj</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePanel;