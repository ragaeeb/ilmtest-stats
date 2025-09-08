import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-xl font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-brand text-white shadow-soft hover:opacity-90',
                ghost: 'hover:bg-[rgba(32,169,227,0.08)]',
                outline: 'border bg-[rgb(var(--card))] hover:bg-[rgba(32,169,227,0.06)]',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-lg px-3',
                lg: 'h-11 rounded-2xl px-6',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => (
        <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    ),
);
Button.displayName = 'Button';
