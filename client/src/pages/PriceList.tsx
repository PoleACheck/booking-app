import { useEffect, useState } from 'react';
import axios from 'axios';

interface Service {
  id: number;
  name: string;
  price: number;
}

const PriceList = () => {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/services`)
      .then(res => setServices(res.data)); // Backend domyślnie sortuje po cenie
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">Nasze usługi</h2>
      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left border">Nazwa Usługi</th>
            <th className="p-3 text-right border">Cena</th>
          </tr>
        </thead>
        <tbody>
          {services.map(s => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{s.name}</td>
              <td className="p-3 text-right font-bold text-blue-600">
                 {s.price >= 1000 ? `od ${s.price} zł` : `${s.price} zł`} 
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PriceList;