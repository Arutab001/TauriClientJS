export class Inventory {
    constructor(width = 8, height = 8, carryCapacity = 25) {
      this.width = width;
      this.height = height;
      this.carryCapacity = carryCapacity;
      this.items = [];
    }
  
    totalWeight() {
      return this.items.reduce((sum, item) => sum + item.weight, 0);
    }
  
    canAddItem(item, position, itemIdToIgnore = null) {
      // проверка веса
      // При перемещении вес предмета уже учтен в общем весе
      const weightCheck = this.totalWeight() + (itemIdToIgnore ? 0 : item.weight);
      if (weightCheck > this.carryCapacity) return false;
  
      // проверка границ
      if (
        position.x < 0 || position.y < 0 ||
        position.x + item.size.width > this.width ||
        position.y + item.size.height > this.height
      ) return false;
  
      // проверка пересечений
      for (const existing of this.items) {
        // Игнорируем сам перемещаемый предмет
        if (existing.id === itemIdToIgnore) continue;

        if (
          !(position.x + item.size.width <= existing.position.x ||
            existing.position.x + existing.size.width <= position.x ||
            position.y + item.size.height <= existing.position.y ||
            existing.position.y + existing.size.height <= position.y)
        ) {
          return false;
        }
      }
  
      return true;
    }
  
    addItem(item, position) {
      if (this.canAddItem(item, position)) {
        item.position = position;
        this.items.push(item);
        return true;
      }
      return false;
    }
  
    moveItem(itemId, newPosition) {
      const itemToMove = this.items.find(i => i.id === itemId);
      if (!itemToMove) return false;
  
      // Проверяем, можно ли поместить предмет в новую позицию, игнорируя его старое положение
      if (this.canAddItem(itemToMove, newPosition, itemId)) {
        // Создаем новый массив с обновленной позицией предмета
        this.items = this.items.map(item =>
          item.id === itemId ? { ...item, position: newPosition } : item
        );
        return true;
      }
      
      return false;
    }
  }
  