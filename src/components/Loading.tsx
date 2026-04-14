interface LoadingProps {
    text?: string;
}

export function Loading({ text = 'Cargando...' }: LoadingProps) {
    return (
        <div className="loading">
            <span className="loading__spinner" aria-hidden="true" />
            <span>{text}</span>
        </div>
    );
}
