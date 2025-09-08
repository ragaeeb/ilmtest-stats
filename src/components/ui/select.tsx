import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn('rounded-xl border bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none', className)}
        {...props}
    >
        {children}
    </select>
));
Select.displayName = 'Select';
