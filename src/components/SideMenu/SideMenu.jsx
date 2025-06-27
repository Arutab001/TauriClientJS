import React from 'react';
import './SideMenu.css';

export default function SideMenu({ onSelectPage, onBack }) {
  return (
    <div className="side-menu">
      <button onClick={() => onSelectPage('character')}>Character</button>
      <button onClick={() => onSelectPage('inventory')}>Inventory</button>
      <button onClick={() => onSelectPage('spellbook')}>Spells</button>
      <button onClick={() => onSelectPage('features')}>Features</button>
      <button onClick={() => onSelectPage('traits')}>Traits</button>
      <button onClick={() => onSelectPage('goals')}>Goals</button>
      <button onClick={() => onSelectPage('notes')}>Notes</button>
      <button onClick={() => onSelectPage('itemsdb')}>Items DB</button>
      <button onClick={onBack} className="back-button">Back to selection</button>
    </div>
  );
} 