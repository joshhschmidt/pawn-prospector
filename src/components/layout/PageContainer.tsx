import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export const PageContainer = ({ children, className }: PageContainerProps) => {
  return (
    <div className={cn('p-6 lg:p-8 max-w-7xl mx-auto', className)}>
      {children}
    </div>
  );
};
