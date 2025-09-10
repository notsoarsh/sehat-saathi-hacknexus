import { Button } from './ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} className={className + ' flex items-center gap-1'}>
      {theme === 'light' ? <Moon className="w-4 h-4"/> : <Sun className="w-4 h-4"/>}
      <span className="text-xs hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
    </Button>
  );
}
