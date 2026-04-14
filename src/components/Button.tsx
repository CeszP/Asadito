import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: 'sm' | 'md';
    full?: boolean;
}

export function Button({
    variant = 'secondary',
    size = 'md',
    full = false,
    className = '',
    children,
    ...props
}: ButtonProps) {
    const cls = [
        'btn',
        `btn--${variant}`,
        size === 'sm' ? 'btn--sm' : '',
        full ? 'btn--full' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button className={cls} {...props}>
            {children}
        </button>
    );
}
