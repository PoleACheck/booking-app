import { useState, useEffect, useCallback } from 'react';
import axios, { isAxiosError } from 'axios';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Props {
  mode: 'booking' | 'admin-block' | 'admin-reschedule';
  onSlotSelect?: (slotId: number, date: Date) => void; 
  refreshTrigger?: number;
  selectedId?: number | null; // <--- NOWOŚĆ: ID aktualnie wybranego slotu (do stylowania)
}

interface Slot {
  id: number;
  date: string;
  isTaken: boolean;
}

const CalendarView = ({ mode, onSlotSelect, refreshTrigger, selectedId }: Props) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<Slot[]>([]);
  
  // Blokada cofania się do przeszłych tygodni
  const minDate = startOfWeek(new Date(), { weekStartsOn: 1 });

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

  const handleSlotClick = async (slot: Slot) => {
    // 1. Logika Admina (Blokowanie)
    if (mode === 'admin-block') {
      try {
        await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/visits/admin/toggle/${slot.id}`);
        fetchSlots();
      } catch (err) {
        if (isAxiosError(err)) {
          alert(err.response?.data?.message || 'Wystąpił błąd serwera');
        } else {
          alert('Wystąpił nieoczekiwany błąd');
        }
      }
      return;
    }

    // 2. Logika Pacjenta (Rezerwacja)
    if (onSlotSelect) {
      // Blokada: Nie można wybrać zajętego LUB przeszłego terminu
      const isPast = new Date(slot.date) < new Date();
      if (slot.isTaken || isPast) return; 

      onSlotSelect(slot.id, new Date(slot.date));
    }
  };

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

  const getSlotsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return slots.filter(s => s.date.startsWith(dayStr));
  };

  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(currentWeekStart, i));

  // Sprawdzamy czy zablokować przycisk "Poprzedni tydzień"
  const isBackDisabled = isSameDay(currentWeekStart, minDate) || currentWeekStart < minDate;

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 bg-gray-100 p-2 rounded">
        <button 
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} 
            className={`font-bold px-4 ${isBackDisabled ? 'text-gray-400 cursor-not-allowed' : 'hover:text-blue-600'}`}
            disabled={isBackDisabled}
        >
            &lt; Poprzedni tydzień
        </button>
        <span className="font-bold">
            {format(weekDays[0], 'dd.MM')} - {format(weekDays[4], 'dd.MM.yyyy')}
        </span>
        <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="font-bold px-4 hover:text-blue-600">Następny tydzień &gt;</button>
      </div>

      <div className="flex overflow-x-auto gap-2">
        {weekDays.map((day, i) => (
          <div key={i} className="flex-1 min-w-[140px]">
            <div 
              className={`text-center font-bold p-2 rounded-t cursor-pointer border-b-2 ${mode === 'admin-block' ? 'bg-blue-100 hover:bg-blue-200' : 'bg-gray-200'}`}
              onClick={() => handleDayClick(day)}
              title={mode === 'admin-block' ? "Kliknij, aby zablokować/odblokować cały dzień" : ""}
            >
              {format(day, 'EEEE dd.MM', { locale: pl })}
              {mode === 'admin-block' && <div className="text-xs text-blue-800 font-normal">(Zmień cały dzień)</div>}
            </div>

            <div className="flex flex-col gap-2 p-2 bg-gray-50 border h-96 overflow-y-auto">
              {getSlotsForDay(day).map(slot => {
                const time = format(new Date(slot.date), 'HH:mm');
                const isPast = new Date(slot.date) < new Date();
                const isSelected = selectedId === slot.id; // Sprawdzamy czy to ten wybrany

                let btnClass = "p-2 rounded border text-center transition-colors ";
                
                if (slot.isTaken) {
                    // 1. ZAJĘTY / ZABLOKOWANY
                    btnClass += mode === 'admin-block' 
                        ? "bg-red-100 border-red-300 text-red-800 cursor-pointer hover:bg-red-200" 
                        : "bg-gray-300 text-gray-500 cursor-not-allowed";
                } else if (isPast && mode === 'booking') {
                    // 2. PRZESZŁY
                    btnClass += "bg-gray-200 text-gray-400 cursor-not-allowed"; 
                } else if (isSelected) {
                    // 3. WYBRANY (Przywrócona funkcjonalność: Zielone tło, Biały tekst)
                    btnClass += "bg-green-600 text-white border-green-700 font-bold hover:bg-green-700";
                } else {
                    // 4. WOLNY (Domyślny)
                    btnClass += "bg-white hover:bg-green-50 cursor-pointer border-green-200";
                }

                return (
                  <button 
                    key={slot.id}
                    className={btnClass}
                    onClick={() => handleSlotClick(slot)}
                    disabled={mode === 'booking' && (slot.isTaken || isPast)}
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