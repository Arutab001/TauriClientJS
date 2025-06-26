import { useDragLayer } from 'react-dnd';

const CELL_SIZE = 50;

function getItemStyles(currentOffset, item, rotation) {
  if (!currentOffset) {
    return { display: 'none' };
  }
  const rotated = (rotation || 0) % 180 !== 0;
  const width = (rotated ? item.size.height : item.size.width) * CELL_SIZE;
  const height = (rotated ? item.size.width : item.size.height) * CELL_SIZE;
  const { x, y } = currentOffset;
  return {
    position: 'fixed',
    pointerEvents: 'none',
    left: x - width / 2,
    top: y - height / 2,
    width,
    height,
    background: '#f0f0f0',
    border: '2px solid #888',
    opacity: 0.8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#222',
    boxSizing: 'border-box',
    zIndex: 9999
  };
}

export default function CustomDragLayer() {
  const {
    item,
    itemType,
    isDragging,
    currentOffset
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getClientOffset()
  }));

  if (!isDragging || !item) {
    return null;
  }

  return (
    <div style={getItemStyles(currentOffset, item, item.rotation)}>
      {item.name}
    </div>
  );
}
