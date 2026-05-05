import { Header } from './Header';
import { CrisisFooter } from './CrisisFooter';

interface LayoutProps {
  children: React.ReactNode;
  showCrisisFooter?: boolean;
}

export function Layout({ children, showCrisisFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {children}
      </main>
      {showCrisisFooter && <CrisisFooter />}
    </div>
  );
}
