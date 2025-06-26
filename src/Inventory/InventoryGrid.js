import React from 'react';
import { useDrop } from 'react-dnd';
import InventoryItem from './InventoryItem.jsx';
import './InventoryGrid.css';

const CELL_SIZE = 50;

export default function InventoryGrid({ grid, items, onMoveItem, canMoveItem }) {
  const renderGridCells = () => {
    const cells = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        cells.push(
          <GridCell key={`${x}-${y}`} x={x} y={y} onMoveItem={onMoveItem} canMoveItem={canMoveItem} />
        );
      }
    }
    return cells;
  };

  return (
    <div
      className="inventory-grid"
      style={{
        gridTemplateColumns: `repeat(${grid.width}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${grid.height}, ${CELL_SIZE}px)`
      }}
    >
      {renderGridCells()}
      {items.map((item) => (
        <InventoryItem key={item.id} item={item} cellSize={CELL_SIZE} />
      ))}
    </div>
  );
}

function GridCell({ x, y, onMoveItem, canMoveItem }) {
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

  const getBackgroundColor = () => {
    if (isOver) {
      return canDrop ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
    }
    return '#333';
  };

  return <div ref={drop} className="inventory-cell" style={{ backgroundColor: getBackgroundColor() }} />;
} 