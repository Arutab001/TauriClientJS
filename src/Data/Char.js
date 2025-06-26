import { Inventory } from '../Inventory/Inventory.js';

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
    this.inventory = new Inventory();
  }
}


export class Weapon {
    constructor(name, damage, type) {
        this.name = name;
        this.damage = damage;
        this.type = type;
    }
} 