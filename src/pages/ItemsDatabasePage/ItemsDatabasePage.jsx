import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../WebSocketContext.jsx';

const initialForm = {
  id: '',
  name: '',
  isMagic: false,
  magicType: '',
  rarity: '',
  attunement: '',
  type: '',
  weight: 1,
  size: { width: 1, height: 1 },
  description: ''
};

const MAGIC_TYPES = [
  'Волшебная палочка', 'Доспех', 'Жезл', 'Зелье', 'Кольцо', 'Оружие', 'Посох', 'Свиток', 'Чудесный предмет'
];
const RARITIES = [
  'обычный', 'необычный', 'редкий', 'очень редкий', 'легендарный', 'артефакт', 'не имеет редкости', 'редко варьируется'
];
const ATTUNEMENTS = ['требуется', 'не требуется'];
const NONMAGIC_TYPES = ['оружие', 'броня', 'предмет'];

export default function ItemsDatabasePage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const { send, messages, clearMessages, connected } = useWebSocket();

  useEffect(() => {
    if (connected) {
      send({ type: 'get_items' });
    }
  }, [connected, send]);

  useEffect(() => {
    let updated = false;
    for (const msg of messages) {
      if (msg.type === 'items_list') {
        setItems(msg.items);
        updated = true;
      }
      if (msg.type === 'add_item_error') {
        setError(msg.error);
        updated = true;
      }
    }
    if (updated) clearMessages();
  }, [messages, clearMessages]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'isMagic') {
      setForm(f => ({ ...f, isMagic: checked }));
    } else if (name === 'width' || name === 'height') {
      setForm(f => ({ ...f, size: { ...f.size, [name]: Number(value) } }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.id || !form.name || !form.weight || !form.size.width || !form.size.height) {
      setError('Заполните все обязательные поля!');
      return;
    }
    if (form.isMagic && (!form.magicType || !form.rarity || !form.attunement)) {
      setError('Для магических предметов заполните все поля!');
      return;
    }
    if (!form.isMagic && !form.type) {
      setError('Для немагических предметов укажите тип!');
      return;
    }
    if (editId) {
      send({ type: 'update_item', item: form });
    } else {
      send({ type: 'add_item', item: form });
    }
    setShowForm(false);
    setForm(initialForm);
    setEditId(null);
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = (id) => {
    if (window.confirm('Удалить предмет?')) {
      send({ type: 'remove_item', id });
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>База предметов</h1>
      <button onClick={() => { setShowForm(true); setForm(initialForm); setEditId(null); setError(''); }}>Добавить предмет</button>
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#222', color: '#fff', padding: 16, borderRadius: 8, margin: '16px 0', maxWidth: 400 }}>
          <div>
            <label>ID: <input name="id" value={form.id} onChange={handleChange} required disabled={!!editId} /></label>
          </div>
          <div>
            <label>Название: <input name="name" value={form.name} onChange={handleChange} required /></label>
          </div>
          <div>
            <label><input type="checkbox" name="isMagic" checked={form.isMagic} onChange={handleChange} /> Магический предмет</label>
          </div>
          {form.isMagic ? (
            <>
              <div>
                <label>Тип: <select name="magicType" value={form.magicType} onChange={handleChange} required>
                  <option value="">—</option>
                  {MAGIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></label>
              </div>
              <div>
                <label>Редкость: <select name="rarity" value={form.rarity} onChange={handleChange} required>
                  <option value="">—</option>
                  {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select></label>
              </div>
              <div>
                <label>Настройка: <select name="attunement" value={form.attunement} onChange={handleChange} required>
                  <option value="">—</option>
                  {ATTUNEMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select></label>
              </div>
            </>
          ) : (
            <div>
              <label>Тип: <select name="type" value={form.type} onChange={handleChange} required>
                <option value="">—</option>
                {NONMAGIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></label>
            </div>
          )}
          <div>
            <label>Вес: <input name="weight" type="number" min={0} step={0.1} value={form.weight} onChange={handleChange} required /></label>
          </div>
          <div>
            <label>Размер: <input name="width" type="number" min={1} max={8} value={form.size.width} onChange={handleChange} style={{ width: 40 }} /> x <input name="height" type="number" min={1} max={8} value={form.size.height} onChange={handleChange} style={{ width: 40 }} /></label>
          </div>
          <div>
            <label>Описание:<br/>
              <textarea name="description" value={form.description} onChange={handleChange} style={{ width: '100%' }} />
            </label>
          </div>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
          <button type="submit">Сохранить</button>
          <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}>Отмена</button>
        </form>
      )}
      <div style={{ marginTop: 24 }}>
        {items.length === 0 && <div>Нет предметов в базе.</div>}
        {items.map(item => (
          <div key={item.id} style={{ border: '1px solid #888', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <b>{item.name}</b> [{item.isMagic ? 'Магический' : 'Обычный'}] <br/>
            <span>id: {item.id}</span><br/>
            <span>Размер: {item.size ? `${item.size.width}x${item.size.height}` : '—'}</span><br/>
            <span>Вес: {item.weight}</span><br/>
            <span>Описание: {item.description}</span><br/>
            <button onClick={() => handleEdit(item)}>Редактировать</button>
            <button onClick={() => handleDelete(item.id)} style={{ marginLeft: 8 }}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  );
} 