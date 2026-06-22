import type { MouseEvent, ReactNode } from "react";

type SimpleModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function SimpleModal({
  open,
  title,
  onClose,
  children,
}: SimpleModalProps) {
  if (!open) {
    return null;
  }

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-panel" onClick={stopPropagation} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="ghost-button" onClick={onClose}>
            Fermer
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
