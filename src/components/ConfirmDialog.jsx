import Modal from './Modal'

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
