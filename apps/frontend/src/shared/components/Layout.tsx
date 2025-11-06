import Header from './Header';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <Header />
      {children}
    </div>
  );
};

export default Layout;
