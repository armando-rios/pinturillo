import { useState } from 'react';

const Home = () => {
  const [userName, setUserName] = useState('');
  const [buttonActive, setButtonActive] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
    if (e.target.value.trim().length > 3) {
      setButtonActive(true);
      return;
    }
    setButtonActive(false);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full">
      <div className="flex flex-col items-center gap-12 w-full">
        <h1 className="text-theme-primary text-4xl font-extrabold">Pinturillo</h1>
        <form className="flex flex-col items-center gap-8 w-fit m-auto">
          <input
            className="w-80 sm:w-full font-semibold h-14 text-xl border-theme-primary border-2 rounded-lg px-4"
            type="text"
            value={userName}
            placeholder="Nombre de Usuario"
            onChange={handleInputChange}
          />
          <div className="flex flex-wrap justify-center gap-4">
            <button
              className="w-80 bg-theme-primary h-14 text-xl font-semibold text-theme-text rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={!buttonActive}
            >
              Crear Sala
            </button>
            <button
              className="w-80 bg-theme-primary h-14 text-xl font-semibold text-theme-text rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={!buttonActive}
            >
              Unirse a Sala
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Home;
