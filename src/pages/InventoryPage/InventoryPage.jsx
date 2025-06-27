import React, { useState, useEffect } from 'react';
import InventoryGrid from '../../Inventory/InventoryGrid.jsx';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import CustomDragLayer from '../../Inventory/CustomDragLayer.jsx';
import { useWebSocket } from '../../WebSocketContext.jsx';
import { useDrag, useDrop } from 'react-dnd';
import InventoryItem from '../../Inventory/InventoryItem.jsx';

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

function ItemsDBPanel({ onDragStart }) {
  const { send, messages, clearMessages, connected } = useWebSocket();
  const [itemsDB, setItemsDB] = useState([]);

  useEffect(() => {
    if (connected) send({ type: 'get_items' });
  }, [connected, send]);

  useEffect(() => {
    let updated = false;
    for (const msg of messages) {
      if (msg.type === 'items_list') {
        setItemsDB(msg.items);
        updated = true;
      }
    }
    if (updated) clearMessages();
  }, [messages, clearMessages]);

  return (
    <div style={{ width: 260, background: '#222', color: '#fff', padding: 12, borderLeft: '1px solid #444', height: '100vh', overflowY: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>База предметов</h3>
      {itemsDB.length === 0 && <div style={{ color: '#888' }}>Нет предметов</div>}
      {itemsDB.map(item => (
        <DraggableDBItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function DraggableDBItem({ item }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'ITEM_FROM_DB',
    item: { ...item },
    collect: monitor => ({ isDragging: !!monitor.isDragging() })
  });
  return (
    <div ref={drag} style={{ border: '1px solid #555', borderRadius: 6, padding: 8, marginBottom: 8, background: '#292929', cursor: 'grab', opacity: isDragging ? 0.5 : 1 }}>
      <b>{item.name}</b> [{item.isMagic ? 'Маг.' : 'Обыч.'}]<br/>
      <span style={{ fontSize: 12 }}>Размер: {item.size ? `${item.size.width}x${item.size.height}` : '—'}</span><br/>
      <span style={{ fontSize: 12 }}>Вес: {item.weight}</span>
    </div>
  );
}

function InventoryGridWithDrop({ grid, items, onMoveItem, canMoveItem, setDraggedId, onAddItemFromDB }) {
  // Абсолютно позиционированные ячейки
  const renderGridCells = () => {
    const cells = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        cells.push(
          <GridCellWithDrop
            key={`${x}-${y}`}
            x={x}
            y={y}
            cellSize={50}
            onMoveItem={onMoveItem}
            canMoveItem={canMoveItem}
            onAddItemFromDB={onAddItemFromDB}
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
        width: `${50 * grid.width}px`,
        height: `${50 * grid.height}px`,
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
          cellSize={50}
          setDraggedId={setDraggedId}
        />
      ))}
    </div>
  );
}

function GridCellWithDrop({ x, y, cellSize, onMoveItem, canMoveItem, onAddItemFromDB }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['ITEM', 'ITEM_FROM_DB'],
    drop: (draggedItem, monitor) => {
      if (monitor.getItemType() === 'ITEM') {
        onMoveItem(draggedItem.id, { x, y });
      } else if (monitor.getItemType() === 'ITEM_FROM_DB') {
        onAddItemFromDB(draggedItem, { x, y });
      }
    },
    canDrop: (draggedItem, monitor) => {
      if (monitor.getItemType() === 'ITEM') {
        return canMoveItem(draggedItem, { x, y });
      } else if (monitor.getItemType() === 'ITEM_FROM_DB') {
        // Проверяем, можно ли добавить предмет из базы в эту ячейку
        return canMoveItem({ ...draggedItem, position: { x, y } }, { x, y });
      }
      return false;
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

function getStrength(character) {
  // Старый формат
  if (character.abilities && character.abilities.strength) return character.abilities.strength;
  // Новый формат (stats)
  if (character.stats && character.stats.str && character.stats.str.score) return character.stats.str.score;
  // Ещё один вариант
  if (character.strength) return character.strength;
  // Дефолт
  return 10;
}

function getMaxWeight(character) {
  const strength = getStrength(character);
  return 15 * strength;
}

function getCurrentWeight(items) {
  return items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
}

export default function InventoryPage({ character, onUpdateCharacter, playerId }) {
  // Безопасно получаем массив предметов
  let initialItems = [];
  if (character.inventory && Array.isArray(character.inventory.items)) {
    initialItems = [...character.inventory.items];
  } else if (Array.isArray(character.items)) {
    initialItems = [...character.items];
  }
  const [items, setItems] = useState(initialItems);
  const [draggedId, setDraggedId] = useState(null);
  const { send } = useWebSocket();

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
    setItems(items => {
      const newItems = items.map(item => {
        if (item.id !== itemId) return item;
        if (!canRotateItem(itemId, direction)) return item;
        const currentRotation = typeof item.rotation === 'number' ? item.rotation : 0;
        const newRotation = (currentRotation + direction + 360) % 360;
        return { ...item, rotation: newRotation };
      });
      const updatedChar = { ...character, items: newItems };
      onUpdateCharacter(updatedChar);
      if (playerId) send({ type: 'update_character', ownerId: playerId, character: updatedChar });
      return newItems;
    });
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
    const newItems = items.map(item =>
      item.id === itemId ? { ...item, position: newPosition } : item
    );
    setItems(newItems);
    setDraggedId(itemId);
    const updatedChar = { ...character, items: newItems };
    onUpdateCharacter(updatedChar);
    if (playerId) send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  };

  const canMoveItem = (item, newPosition) => {
    return canAddItem(items, item, newPosition, item.id);
  };

  // Добавляем обработчик для drop предмета из базы
  function handleAddItemFromDB(dbItem, position) {
    const maxWeight = getMaxWeight(character);
    const currentWeight = getCurrentWeight(items);
    const itemWeight = Number(dbItem.weight) || 0;
    if (currentWeight + itemWeight > maxWeight) {
      alert(`Нельзя добавить: превышен лимит веса (${currentWeight + itemWeight} > ${maxWeight})`);
      return;
    }
    // Генерируем уникальный id для предмета в инвентаре
    const newId = `${dbItem.id}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const newItem = {
      ...dbItem,
      id: newId,
      position,
      // Можно добавить другие поля по необходимости
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    const updatedChar = { ...character, items: newItems };
    onUpdateCharacter(updatedChar);
    if (playerId) send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  }

  const maxWeight = getMaxWeight(character);
  const currentWeight = getCurrentWeight(items);
  const freeWeight = maxWeight - currentWeight;

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <div style={{ flex: 1 }}>
          <h1>Инвентарь {typeof character.name === 'object' ? character.name.value : character.name}</h1>
          <div style={{
            marginBottom: 12,
            padding: '8px 16px',
            background: freeWeight < 0 ? '#a33' : '#222',
            color: freeWeight < 0 ? '#fff' : '#4af',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            display: 'inline-block',
            border: freeWeight < 0 ? '2px solid #a33' : '2px solid #4af'
          }}>
            Максимальный вес: {maxWeight} | Сейчас: {currentWeight} | Осталось: {freeWeight >= 0 ? freeWeight : 0}
          </div>
          <InventoryGridWithDrop
            grid={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
            items={items}
            onMoveItem={handleMoveItem}
            canMoveItem={canMoveItem}
            setDraggedId={setDraggedId}
            onAddItemFromDB={handleAddItemFromDB}
          />
          <CustomDragLayer />
          <div style={{marginTop: 16, color: '#888'}}>Перемещайте предмет мышью. Вращайте Q/E/Й/У во время перетаскивания или выделения.</div>
        </div>
        <ItemsDBPanel />
      </div>
    </DndProvider>
  );
}
