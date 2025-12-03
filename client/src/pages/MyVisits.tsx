import { useEffect, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { format, differenceInHours } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Visit {
  id: number;
  date: string;
  serviceName: string;
}

const MyVisits = () => {
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = () => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visits/my-visits`)
      .then(res => setVisits(res.data))
      .catch(err => console.error(err));
  };

  const handleCancel = async (id: number) => {
    if (window.confirm('Czy na pewno chcesz anulować wizytę?')) {
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/visits/cancel/${id}`);
        fetchVisits(); // Odśwież listę
      } catch (err) {
        if (isAxiosError(err)) {
          alert(err.response?.data?.message || 'Nie udało się anulować wizyty. Spróbuj ponownie.');
        } else {
          alert('Wystąpił nieoczekiwany błąd.');
        }
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Twoje Wizyty</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border">Data</th>
            <th className="p-3 border">Godzina</th>
            <th className="p-3 border">Usługa</th>
            <th className="p-3 border">Akcja</th>
          </tr>
        </thead>
        <tbody>
          {visits.map(visit => {
            const visitDate = new Date(visit.date);
            const hoursDiff = differenceInHours(visitDate, new Date());
            const canCancel = hoursDiff >= 72;

            return (
              <tr key={visit.id} className="border-b">
                <td className="p-3">{format(visitDate, 'EEEE, dd.MM.yyyy', { locale: pl })}</td>
                <td className="p-3">{format(visitDate, 'HH:mm')}</td>
                <td className="p-3">{visit.serviceName || 'Wizyta'}</td>
                <td className="p-3">
                  {canCancel ? (
                    <button 
                      onClick={() => handleCancel(visit.id)}
                      className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                    >
                      Anuluj wizytę
                    </button>
                  ) : (
                    <span className="text-red-500 text-xs font-bold">Czas na anulowanie wizyty minął.</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {visits.length === 0 && <p className="mt-4 text-gray-500">Brak zaplanowanych wizyt.</p>}
    </div>
  );
};

export default MyVisits;