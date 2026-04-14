import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
    const inputId =
        id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const inputCls = ['field__input', error ? 'field__input--error' : '', className]
        .filter(Boolean)
        .join(' ');

    if (!label && !error) {
        return <input id={inputId} className={inputCls} {...props} />;
    }

    return (
        <div className="field">
            {label && (
                <label htmlFor={inputId} className="field__label">
                    {label}
                </label>
            )}
            <input id={inputId} className={inputCls} {...props} />
            {error && <span className="field__error">{error}</span>}
        </div>
    );
}
