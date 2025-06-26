import React, { useState } from 'react';
import InventoryGrid from '../../Inventory/InventoryGrid.jsx';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import CustomDragLayer from '../../Inventory/CustomDragLayer.jsx';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;

function rotateSize(size, rotation) {
  return (rotation % 180 === 0)
    ? { ...size }
    : { width: size.height, height: size.width };
}

function canAddItem(items, item, position, itemIdToIgnore = null) {
  const rotatedSize = rotateSize(item.size, item.rotation || 0);
  if (
    position.x < 0 || position.y < 0 ||
    position.x + rotatedSize.width > GRID_WIDTH ||
    position.y + rotatedSize.height > GRID_HEIGHT
  ) return false;
  for (const existing of items) {
    if (existing.id === itemIdToIgnore) continue;
    const exSize = rotateSize(existing.size, existing.rotation || 0);
    if (
      !(position.x + rotatedSize.width <= existing.position.x ||
        existing.position.x + exSize.width <= position.x ||
        position.y + rotatedSize.height <= existing.position.y ||
        existing.position.y + exSize.height <= position.y)
    ) {
      return false;
    }
  }
  return true;
}

export default function InventoryPage({ character }) {
  // Безопасно получаем массив предметов
  let initialItems = [];
  if (character.inventory && Array.isArray(character.inventory.items)) {
    initialItems = [...character.inventory.items];
  } else if (Array.isArray(character.items)) {
    initialItems = [...character.items];
  }
  const [items, setItems] = useState(initialItems);
  const [draggedId, setDraggedId] = useState(null);

  function canRotateItem(itemId, direction) {
    const item = items.find(i => i.id === itemId);
    if (!item) return false;
    const currentRotation = typeof item.rotation === 'number' ? item.rotation : 0;
    const newRotation = (currentRotation + direction + 360) % 360;
    const rotatedSize = (newRotation % 180 === 0)
      ? item.size
      : { width: item.size.height, height: item.size.width };
    // Проверка границ
    if (
      item.position.x < 0 ||
      item.position.y < 0 ||
      item.position.x + rotatedSize.width > GRID_WIDTH ||
      item.position.y + rotatedSize.height > GRID_HEIGHT
    ) return false;
    // Проверка пересечений
    for (const other of items) {
      if (other.id === itemId) continue;
      const otherRotation = typeof other.rotation === 'number' ? other.rotation : 0;
      const otherSize = (otherRotation % 180 === 0)
        ? other.size
        : { width: other.size.height, height: other.size.width };
      if (
        !(
          item.position.x + rotatedSize.width <= other.position.x ||
          other.position.x + otherSize.width <= item.position.x ||
          item.position.y + rotatedSize.height <= other.position.y ||
          other.position.y + otherSize.height <= item.position.y
        )
      ) {
        return false;
      }
    }
    return true;
  }

  function rotateItem(itemId, direction) {
    setItems(items => items.map(item => {
      if (item.id !== itemId) return item;
      if (!canRotateItem(itemId, direction)) return item;
      const currentRotation = typeof item.rotation === 'number' ? item.rotation : 0;
      const newRotation = (currentRotation + direction + 360) % 360;
      return { ...item, rotation: newRotation };
    }));
  }

  const handleKeyDown = (e) => {
    if (!draggedId) return;
    if (
      e.key === 'q' || e.key === 'Q' ||
      e.key === 'й' || e.key === 'Й'
    ) {
      rotateItem(draggedId, -90);
    }
    if (
      e.key === 'e' || e.key === 'E' ||
      e.key === 'у' || e.key === 'У'
    ) {
      rotateItem(draggedId, 90);
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draggedId, items]); // items в зависимостях, чтобы всегда видеть актуальное

  React.useEffect(() => {
    console.log('draggedId:', draggedId);
  }, [draggedId]);

  // После перемещения предмета draggedId = itemId
  const handleMoveItem = (itemId, newPosition) => {
    const itemToMove = items.find(i => i.id === itemId);
    if (!canAddItem(items, itemToMove, newPosition, itemId)) return;
    setItems(items.map(item =>
      item.id === itemId ? { ...item, position: newPosition } : item
    ));
    setDraggedId(itemId);
  };

  const canMoveItem = (item, newPosition) => {
    return canAddItem(items, item, newPosition, item.id);
  };

  // Передаём setDraggedId и выделение по клику в InventoryGrid
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <h1>Инвентарь {typeof character.name === 'object' ? character.name.value : character.name}</h1>
      <InventoryGrid
        grid={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
        items={items}
        onMoveItem={handleMoveItem}
        canMoveItem={canMoveItem}
        setDraggedId={setDraggedId}
        selectedId={draggedId}
      />
      <CustomDragLayer />
      <div style={{marginTop: 16, color: '#888'}}>Перемещайте предмет мышью. Вращайте Q/E/Й/У во время перетаскивания или выделения.</div>
    </DndProvider>
  );
}
