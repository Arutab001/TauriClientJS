// InventoryGrid.js
import React from 'react';
import { useDrop } from 'react-dnd';
import InventoryItem from './InventoryItem.jsx';
import './InventoryGrid.css';

const CELL_SIZE = 50;

export default function InventoryGrid({ grid, items, onMoveItem, canMoveItem, setDraggedId }) {
  // Абсолютно позиционированные ячейки
  const renderGridCells = () => {
    const cells = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        cells.push(
          <GridCell
            key={`${x}-${y}`}
            x={x}
            y={y}
            cellSize={CELL_SIZE}
            onMoveItem={onMoveItem}
            canMoveItem={canMoveItem}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div
      className="inventory-grid"
      style={{
        position: 'relative',
        width: `${CELL_SIZE * grid.width}px`,
        height: `${CELL_SIZE * grid.height}px`,
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid #555',
        overflow: 'hidden'
      }}
    >
      {renderGridCells()}
      {items.map((item) => (
        <InventoryItem
          key={item.id}
          item={item}
          cellSize={CELL_SIZE}
          setDraggedId={setDraggedId}
        />
      ))}
    </div>
  );
}

function GridCell({ x, y, cellSize, onMoveItem, canMoveItem }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'ITEM',
    drop: (draggedItem) => {
      onMoveItem(draggedItem.id, { x, y });
    },
    canDrop: (draggedItem) => {
      return canMoveItem(draggedItem, { x, y });
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  });

  return (
    <div
      ref={drop}
      className="inventory-cell"
      style={{
        position: 'absolute',
        left: `${x * cellSize}px`,
        top: `${y * cellSize}px`,
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        boxSizing: 'border-box',
        border: '1px solid #333',
        background: isOver ? (canDrop ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)') : 'transparent'
      }}
    />
  );
}
