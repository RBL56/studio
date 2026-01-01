'use client';

import { useState, useRef, useEffect } from 'react';

const DraggableDisclaimer = () => {
  const [isDragging, setIsDragging] = useState(false);
  // Initialize position without window object
  const [position, setPosition] = useState({ x: 20, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isInitialPositionSet, setIsInitialPositionSet] = useState(false);

  // Set initial position only on the client
  useEffect(() => {
    if (!isInitialPositionSet) {
      setPosition({ x: 20, y: window.innerHeight - 200 });
      setIsInitialPositionSet(true);
    }
  }, [isInitialPositionSet]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (nodeRef.current) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - nodeRef.current.offsetLeft,
        y: e.clientY - nodeRef.current.offsetTop,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Don't render until the initial position is set on the client
  if (!isInitialPositionSet) {
    return null;
  }

  return (
    <div
      ref={nodeRef}
      className="draggable-disclaimer"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      <p>
        <strong>Disclaimer:</strong> Trading synthetic indices involves substantial risk and is not suitable for all investors. The tools and information provided on this site are for educational and informational purposes only. Past performance is not indicative of future results. You are solely responsible for any trading decisions you make. Never trade with money you cannot afford to lose.
      </p>
    </div>
  );
};

export default DraggableDisclaimer;
