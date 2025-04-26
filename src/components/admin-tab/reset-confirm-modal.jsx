import React from 'react';
/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {boolean} props.isLoading
 * @param {() => void} props.onCancel
 * @param {() => void} props.onConfirm
 */
export function ResetConfirmModal({ isOpen, isLoading, onCancel, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold mb-4">Bekreft tilbakestilling</h3>
        <p className="mb-6 text-gray-600">
          Er du sikker på at du vil tilbakestille scenekortene? Dette vil laste inn kortene på nytt fra Google Sheets.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isLoading}
          >
            Avbryt
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            disabled={isLoading}
          >
            Tilbakestill
          </button>
        </div>
      </div>
    </div>
  );
} 