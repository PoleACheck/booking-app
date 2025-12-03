const Contact = () => {
  return (
    <div className="flex h-full">
      <div className="w-1/2 flex flex-col justify-center text-lg">
        <h3 className="font-bold text-xl mb-4">Poradnia Stomatologiczna „100matolog” Jan Nowak</h3>
        <p>Ul. Walerego Goetla 16</p>
        <p className="mb-4">44-100 Gliwice</p>
        <p className="font-bold">+48 777 000 000</p>
        <p className="text-blue-600">Kontakt@100matol.og</p>
      </div>
      <div className="w-1/2 bg-gray-200 flex items-center justify-center m-4">
        <span>Mapa / Zdjęcie budynku</span>
      </div>
    </div>
  );
};

export default Contact;