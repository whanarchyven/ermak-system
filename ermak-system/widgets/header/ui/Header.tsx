import { Navbar } from "../../../features/navigation";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ title, subtitle, children, className = "" }: HeaderProps) {
  return (
    <header className={`${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {children && <div className="flex items-center space-x-4">{children}</div>}
        </div>
      </div>
    </header>
  );
} 