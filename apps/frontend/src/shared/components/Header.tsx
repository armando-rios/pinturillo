import { Settings } from 'lucide-react';

const Header = () => {
  return (
    <header className="flex justify-between w-full p-4 border-theme-primary border-b-2">
      <h1 className="text-theme-primary font-extrabold text-xl">Pinturillo</h1>
      <button className="text-theme-primary" onClick={() => alert('Settings clicked!')}>
        <Settings className="text-4xl hover:scale-110 duration-75" size={28} />
      </button>
    </header>
  );
};

export default Header;
