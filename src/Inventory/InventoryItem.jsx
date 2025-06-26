// InventoryItem.js
import React, { useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';
import './InventoryItem.css';

export default function InventoryItem({ item, cellSize, setDraggedId, selectedId }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM',
    item: { ...item },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    }),
    end: () => { /* не сбрасываем draggedId автоматически */ }
  });

  // Эффект: когда начинается drag — выделяем draggedId
  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging && !wasDragging.current) {
      setDraggedId && setDraggedId(item.id);
    }
    wasDragging.current = isDragging;
  }, [isDragging, item.id, setDraggedId]);

  // Меняем размеры местами при повороте
  const rotation = typeof item.rotation === 'number' ? item.rotation : 0;
  const rotated = rotation % 180 !== 0;
  const width = (rotated ? item.size.height : item.size.width) * cellSize;
  const height = (rotated ? item.size.width : item.size.height) * cellSize;

  const style = {
    width,
    height,
    position: 'absolute',
    left: `${item.position.x * cellSize}px`,
    top: `${item.position.y * cellSize}px`,
    opacity: isDragging ? 0.5 : 1,
    pointerEvents: isDragging ? 'none' : 'auto',
    zIndex: isDragging ? 100 : 1,
    outline: selectedId === item.id ? '2px solid #4af' : 'none',
    // transform: `rotate(${item.rotation || 0}deg)` // если нужно крутить текст
  };

  console.log('setDraggedId:', setDraggedId);
  console.log('item', item.id, 'rotation', rotation, 'width', width, 'height', height);

  return (
    <div
      ref={drag}
      className="inventory-item"
      style={style}
      onClick={() => setDraggedId && setDraggedId(item.id)}
    >
      {item.name}
    </div>
  );
}
