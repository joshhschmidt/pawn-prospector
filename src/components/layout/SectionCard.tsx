import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export const SectionCard = ({ children, className }: SectionCardProps) => {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
};
