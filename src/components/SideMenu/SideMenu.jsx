import React from 'react';
import './SideMenu.css';

export default function SideMenu({ onSelectPage, onBack }) {
  return (
    <div className="side-menu">
      <button onClick={() => onSelectPage('character')}>Character</button>
      <button onClick={() => onSelectPage('inventory')}>Inventory</button>
      <button onClick={() => onSelectPage('spellbook')}>Spells</button>
      <button onClick={onBack} className="back-button">Back to selection</button>
    </div>
  );
} 