import React from 'react';

const CELL_SIZE = 50;

export default function DragPreview({ item }) {
  const rotated = (item.rotation || 0) % 180 !== 0;
  const width = (rotated ? item.size.height : item.size.width) * CELL_SIZE;
  const height = (rotated ? item.size.width : item.size.height) * CELL_SIZE;

  // Получаем позицию курсора
  const [mouse, setMouse] = React.useState({ x: 0, y: 0 });
  React.useEffect(() => {
    const move = e => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: mouse.x - width / 2,
        top: mouse.y - height / 2,
        width,
        height,
        background: '#f0f0f0',
        opacity: 0.5,
        border: '2px solid #888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: '#222',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      {item.name}
    </div>
  );
}
