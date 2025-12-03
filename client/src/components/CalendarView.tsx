import { useState, useEffect, useCallback } from 'react';
import axios, { isAxiosError } from 'axios';
import { format, addDays, startOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Props {
  mode: 'booking' | 'admin-block' | 'admin-reschedule'; // Tryby działania
  onSlotSelect?: (slotId: number) => void; // Callback po kliknięciu
  refreshTrigger?: number; // Do odświeżania z zewnątrz
}

interface Slot {
  id: number;
  date: string;
  isTaken: boolean;
}

const CalendarView = ({ mode, onSlotSelect, refreshTrigger }: Props) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<Slot[]>([]);
  
  // Pobieranie slotów
  const fetchSlots = useCallback(async () => {
    const startStr = format(currentWeekStart, 'yyyy-MM-dd');
    const endStr = format(addDays(currentWeekStart, 4), 'yyyy-MM-dd'); // 5 dni (Pn-Pt)
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/visits/slots?start=${startStr}&end=${endStr}`);
      setSlots(res.data);
    } catch (e) { console.error(e); }
  }, [currentWeekStart]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots, refreshTrigger]);

  // Funkcja obsługująca kliknięcie w slot
  const handleSlotClick = async (slot: Slot) => {
    // Tryb blokowania (Admin) [cite: 96]
    if (mode === 'admin-block') {
      try {
        await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/visits/admin/toggle/${slot.id}`);
        fetchSlots(); // Odśwież natychmiast po zmianie
      } catch (err) {
        if (isAxiosError(err)) {
          alert(err.response?.data?.message || 'Wystąpił błąd serwera');
        } else {
          alert('Wystąpił nieoczekiwany błąd');
        }
      }
      return;
    }

    // Tryb rezerwacji lub przekładania
    if (onSlotSelect) {
      // Nie pozwól wybrać zajętego slotu (chyba że to admin blokuje, ale to wyżej)
      if (slot.isTaken) return; 
      onSlotSelect(slot.id);
    }
  };

  // Funkcja blokowania całego dnia [cite: 98]
  const handleDayClick = async (dayDate: Date) => {
    if (mode !== 'admin-block') return;
    if (!confirm(`Czy na pewno chcesz zmienić dostępność dla dnia ${format(dayDate, 'yyyy-MM-dd')}?`)) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/visits/admin/toggle-day`, {
        date: format(dayDate, 'yyyy-MM-dd')
      });
      fetchSlots();
    } catch (err) {
      if (isAxiosError(err)) {
        alert(err.response?.data?.message || 'Wystąpił błąd serwera');
      } else {
        alert('Wystąpił nieoczekiwany błąd');
      }
    }
  };

  // Helper do filtrowania slotów per dzień
  const getSlotsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return slots.filter(s => s.date.startsWith(dayStr)); // DB zwraca ISO string
  };

  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(currentWeekStart, i));

  return (
    <div className="flex flex-col">
      {/* Nawigacja Tygodnia [cite: 52] */}
      <div className="flex justify-between items-center mb-4 bg-gray-100 p-2 rounded">
        <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="font-bold px-4">&lt; Poprzedni tydzień</button>
        <span className="font-bold">
            {format(weekDays[0], 'dd.MM')} - {format(weekDays[4], 'dd.MM.yyyy')}
        </span>
        <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="font-bold px-4">Następny tydzień &gt;</button>
      </div>

      {/* Siatka Kalendarza [cite: 45] */}
      <div className="flex overflow-x-auto gap-2">
        {weekDays.map((day, i) => (
          <div key={i} className="flex-1 min-w-[140px]">
            {/* Nagłówek dnia z opcją blokady [cite: 98] */}
            <div 
              className={`text-center font-bold p-2 rounded-t cursor-pointer border-b-2 ${mode === 'admin-block' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-200'}`}
              onClick={() => handleDayClick(day)}
              title={mode === 'admin-block' ? "Kliknij, aby zablokować/odblokować cały dzień" : ""}
            >
              {format(day, 'EEEE dd.MM', { locale: pl })}
              {mode === 'admin-block' && <div className="text-xs text-blue-800 font-normal">(Zmień cały dzień)</div>}
            </div>

            {/* Lista slotów [cite: 47] */}
            <div className="flex flex-col gap-2 p-2 bg-gray-50 border h-96 overflow-y-auto">
              {getSlotsForDay(day).map(slot => {
                const time = format(new Date(slot.date), 'HH:mm');
                
                // Style przycisków [cite: 48-50]
                let btnClass = "p-2 rounded border text-center transition-colors ";
                
                if (slot.isTaken) {
                    // Jeśli zajęty (szary)
                    btnClass += mode === 'admin-block' 
                        ? "bg-red-100 border-red-300 text-red-800 cursor-pointer hover:bg-red-200" // Admin widzi blokady jako aktywne do zdjęcia
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"; // User widzi jako niedostępne
                } else {
                    // Jeśli wolny (jasny)
                    btnClass += "bg-white hover:bg-green-50 cursor-pointer border-green-200";
                }

                return (
                  <button 
                    key={slot.id}
                    className={btnClass}
                    onClick={() => handleSlotClick(slot)}
                    disabled={mode === 'booking' && slot.isTaken}
                  >
                    {time} {mode === 'admin-block' && slot.isTaken ? '(Zajęty)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;