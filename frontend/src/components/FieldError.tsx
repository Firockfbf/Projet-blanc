type FieldErrorProps = {
  message?: string | null;
};

export default function FieldError({ message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return <span className="field-error-text">{message}</span>;
}
