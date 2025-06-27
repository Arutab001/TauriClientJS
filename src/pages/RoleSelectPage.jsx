import React, { useState } from 'react';

export default function RoleSelectPage({ onSelectRole }) {
  const [role, setRole] = useState('player');
  const [playerId, setPlayerId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!playerId.trim()) return;
    onSelectRole({ role, playerId: playerId.trim() });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#222', color: '#fff'
    }}>
      <h2>Выберите роль и введите свой ID</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div>
          <label>
            <input
              type="radio"
              name="role"
              value="player"
              checked={role === 'player'}
              onChange={() => setRole('player')}
            /> Игрок
          </label>
          <label style={{ marginLeft: 24 }}>
            <input
              type="radio"
              name="role"
              value="master"
              checked={role === 'master'}
              onChange={() => setRole('master')}
            /> Гейм-мастер
          </label>
        </div>
        <input
          type="text"
          placeholder={role === 'master' ? 'ID мастера (например, master)' : 'Ваш ID (например, player1)'}
          value={playerId}
          onChange={e => setPlayerId(e.target.value)}
          style={{ padding: 8, fontSize: 18, width: 220 }}
        />
        <button type="submit" style={{ padding: '10px 30px', fontSize: 18 }} disabled={!playerId.trim()}>
          Войти
        </button>
      </form>
    </div>
  );
} 