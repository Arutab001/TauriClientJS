export class Character {
    constructor(name, race, characterClass, level, strength, dexterity, constitution, intelligence, wisdom, charisma) {
        this.name = name;
        this.race = race;
        this.characterClass = characterClass;
        this.level = level;
        this.abilities = {
            strength,
            dexterity,
            constitution,
            intelligence,
            wisdom,
            charisma
        };
        this.Inventory = Inventory;
    }
}

export class Inventory {
    constructor() {
        this.items = [];
    }

    addItem(item, position) {
        item.position = position;
        this.items.push(item);
    }
}

export class Item {
    constructor(id, name, size, weight) {
      this.id = id;
      this.name = name;
      this.size = size; 
      this.weight = weight;
      this.position = null; 
    }
  }
  