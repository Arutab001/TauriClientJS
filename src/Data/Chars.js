import { Character, Inventory, Item } from "./Constructors";

const himophysInventory = new Inventory();
himophysInventory.addItem(new Item(1, "Sword", { width: 2, height: 3 }, 5.0), { x: 0, y: 0 });

const Himophys = new Character(
    "Himophys", "human", "Monk", 9, 10, 17, 12, 10, 14, 8
);
Himophys.inventory = himophysInventory;

const leahInventory = new Inventory();
leahInventory.addItem(new Item(2, "Medkit", { width: 2, height: 2 }, 2.0), { x: 2, y: 2 });

const Leah = new Character(
    "Leah", "elf", "Rogue", 5, 12, 16, 10, 14, 13, 9
);
Leah.inventory = leahInventory;

export const characters = [Himophys, Leah];