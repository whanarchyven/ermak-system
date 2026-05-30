import { Header } from "../../header";

interface LayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Layout({ 
  title, 
  subtitle, 
  headerActions, 
  children, 
  className = "" 
}: LayoutProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <Header title={title} subtitle={subtitle}>
        {headerActions}
      </Header>
      <main className="max-w-8xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 