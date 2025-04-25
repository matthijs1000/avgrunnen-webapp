import React, { useEffect, useState } from 'react';

export function Notification({ message, onClose, duration = 5000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-black text-white px-6 py-3 rounded-lg shadow-lg">
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
} 