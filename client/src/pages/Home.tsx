import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="flex h-full">
      {/* Lewa strona (Tekst - 60% szerokości sekcji wg specyfikacji) */}
      <div className="w-3/5 pr-8 flex flex-col justify-center">
        <p className="mb-6 text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin nibh augue, suscipit a, scelerisque sed, lacinia in, mi. Cras vel lorem.
        </p>
        <p className="mb-8 text-lg font-medium text-gray-800">
          Zadbaj o swój uśmiech w nowoczesnym gabinecie stomatologicznym. Oferujemy kompleksowe leczenie w komfortowych warunkach. Twój uśmiech jest naszą pasją!
        </p>
        
        <Link to={user ? '#' : '/booking'}> {/* Jeśli zalogowany, przycisk nieaktywny wg specyfikacji */}
            <button 
              disabled={!!user}
              className={`w-full py-3 font-bold text-white tracking-widest ${user ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              ZAREJESTRUJ SIĘ
            </button>
        </Link>
      </div>

      {/* Prawa strona (Zdjęcie placeholder) */}
      <div className="w-2/5 flex items-center justify-center bg-gray-200 m-4 rounded">
        <span className="text-gray-500">Miejsce na zdjęcie (400x600)</span>
      </div>
    </div>
  );
};

export default Home;