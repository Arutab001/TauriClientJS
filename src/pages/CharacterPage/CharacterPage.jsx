import React, { useState, useEffect } from 'react';
import './CharacterPage.css';
import { getLevelAndProf, XP_TABLE } from '../../Data/LevelUtils';
import { useWebSocket } from '../../WebSocketContext.jsx';

function getModifier(score) {
  return Math.floor((score - 10) / 2);
}


const PROFICIENCY_BONUS = 2;

const SKILL_TO_ABILITY = {
  'Acrobatics (Dex)': 'dexterity',
  'Animal Handling (Wis)': 'wisdom',
  'Arcana (Int)': 'intelligence',
  'Athletics (Str)': 'strength',
  'Deception (Cha)': 'charisma',
  'History (Int)': 'intelligence',
  'Insight (Wis)': 'wisdom',
  'Intimidation (Cha)': 'charisma',
  'Investigation (Int)': 'intelligence',
  'Medicine (Wis)': 'wisdom',
  'Nature (Int)': 'intelligence',
  'Perception (Wis)': 'wisdom',
  'Performance (Cha)': 'charisma',
  'Persuasion (Cha)': 'charisma',
  'Religion (Int)': 'intelligence',
  'Sleight of Hand (Dex)': 'dexterity',
  'Stealth (Dex)': 'dexterity',
  'Survival (Wis)': 'wisdom',
};

const DND_SKILLS = Object.keys(SKILL_TO_ABILITY);

function extractAbilities(character) {
  // Старый формат
  if (character.abilities) return character.abilities;
  // Новый формат (stats)
  if (character.stats) {
    // Преобразуем к привычному виду
    return {
      strength: character.stats.str?.score ?? 10,
      dexterity: character.stats.dex?.score ?? 10,
      constitution: character.stats.con?.score ?? 10,
      intelligence: character.stats.int?.score ?? 10,
      wisdom: character.stats.wis?.score ?? 10,
      charisma: character.stats.cha?.score ?? 10,
    };
  }
  // Если ничего нет — дефолт
  return {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };
}

function getXp(character) {
  // Новый формат
  if (character.info?.experience?.value !== undefined) return character.info.experience.value;
  if (character.experience !== undefined) return character.experience;
  return 0;
}

function setXp(character, xp) {
  // Возвращает новый объект персонажа с обновленным опытом, уровнем и бонусом мастерства
  const { level, prof } = getLevelAndProf(xp);
  let newChar = { ...character };
  // Новый формат
  if (newChar.info?.experience) {
    newChar = {
      ...newChar,
      info: {
        ...newChar.info,
        experience: { ...newChar.info.experience, value: xp },
        level: { ...newChar.info.level, value: level },
      },
      proficiency: prof,
    };
  } else {
    newChar = {
      ...newChar,
      experience: xp,
      level,
      proficiency: prof,
    };
  }
  return newChar;
}

function getLevelXpRange(level) {
  const idx = XP_TABLE.findIndex(row => row.level === level);
  if (idx === -1) return { min: 0, max: 0 };
  const min = XP_TABLE[idx].xp;
  const max = XP_TABLE[idx + 1] ? XP_TABLE[idx + 1].xp : min + 1000;
  return { min, max };
}

export default function CharacterPage({ character, onUpdateCharacter, playerId }) {
  if (!character) return <div>Нет данных о персонаже</div>;
  const abilities = extractAbilities(character);
  const [proficientSkills, setProficientSkills] = useState(character.proficientSkills || []);
  const [manualSkillFlags, setManualSkillFlags] = useState(character.manualSkillFlags || {});
  const [manualSkillValues, setManualSkillValues] = useState(character.manualSkillValues || {});
  const [abilitiesState, setAbilitiesState] = useState(abilities);
  const xp = getXp(character);
  const { level, prof } = getLevelAndProf(xp);
  const { min: levelMinXp, max: levelMaxXp } = getLevelXpRange(level);
  const xpToNext = levelMaxXp - xp;
  const xpProgress = Math.max(0, Math.min(1, (xp - levelMinXp) / (levelMaxXp - levelMinXp)));
  const [customXp, setCustomXp] = useState('');
  const { send } = useWebSocket();

  const handleCheckboxChange = (skill) => {
    setProficientSkills(prev => {
      const updated = prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill];
      // Сохраняем в персонаже
      const updatedChar = { ...character, proficientSkills: updated };
      onUpdateCharacter(updatedChar);
      if (playerId && typeof send === 'function') send({ type: 'update_character', ownerId: playerId, character: updatedChar });
      return updated;
    });
  };

  const handleXpChange = (delta) => {
    if (!onUpdateCharacter) return;
    const newXp = Math.max(0, xp + delta);
    const updatedChar = setXp(character, newXp);
    onUpdateCharacter(updatedChar);
    if (playerId) send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  };

  const handleExport = async () => {
    // Если есть __original, экспортируем LSS-совместимый формат
    if (character.__original && character.__original.data) {
      // Клонируем оригинал
      const exportObj = { ...character.__original };
      // Парсим вложенный data
      let dataObj;
      try {
        dataObj = JSON.parse(exportObj.data);
      } catch {
        dataObj = {};
      }
      // Обновляем опыт, уровень, бонус мастерства, класс во всех возможных местах
      if (dataObj.info?.experience) dataObj.info.experience.value = xp;
      if (dataObj.experience !== undefined) dataObj.experience = xp;
      if (dataObj.info?.level) dataObj.info.level.value = level;
      if (dataObj.level !== undefined) dataObj.level = level;
      if (dataObj.proficiency !== undefined) dataObj.proficiency = prof;
      if (dataObj.info?.charClass && character.info?.charClass?.value) dataObj.info.charClass.value = character.info.charClass.value;
      // Обновляем заклинания (text.spells-level-X)
      if (dataObj.text) {
        // Собираем все ключи spells-level-X из оригинала и из персонажа
        const allSpellKeys = new Set([
          ...Object.keys(dataObj.text).filter(k => k.startsWith('spells-level-')),
          ...Object.keys(character.text || {}).filter(k => k.startsWith('spells-level-'))
        ]);
        for (const k of allSpellKeys) {
          if (character.text && character.text[k]) {
            dataObj.text[k] = character.text[k];
          } else if (!dataObj.text[k]) {
            // Если нет — добавляем пустую структуру LSS
            dataObj.text[k] = {
              value: {
                data: {
                  type: 'doc',
                  content: []
                }
              }
            };
          }
        }
      }
      // Обновляем инвентарь (если нужно)
      // Можно добавить аналогично для других полей
      // Сериализуем обратно
      exportObj.data = JSON.stringify(dataObj);
      // Экспортируем
      const dataStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${character.name?.value || character.name || 'character'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    // Обычный экспорт (если не LSS)
    const dataStr = JSON.stringify(character, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name?.value || character.name || 'character'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Автосохранение через Tauri (новый плагин)
  useEffect(() => {
    async function autosave() {
      if (
        character &&
        character.__filePath &&
        typeof window !== 'undefined' &&
        window.__TAURI__
      ) {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile({
          path: character.__filePath,
          contents: JSON.stringify(exportObj, null, 2)
        });
      }
    }
    autosave();
  }, [character]);

  // Имя, класс, раса — поддержка обоих форматов
  const name = character.name?.value || character.name || 'Без имени';
  const charClass = character.info?.charClass?.value || character.characterClass || '—';
  const race = character.info?.race?.value || character.race || '—';

  useEffect(() => {
    const saved = localStorage.getItem('characters');
    if (saved) {
      setCharacters(JSON.parse(saved));
    }
  }, []);

  // При открытии персонажа обновляем состояния из character
  useEffect(() => {
    setProficientSkills(character.proficientSkills || []);
    setManualSkillFlags(character.manualSkillFlags || {});
    setManualSkillValues(character.manualSkillValues || {});
    setAbilitiesState(extractAbilities(character));
  }, [character]);

  // Сохраняем изменения характеристик
  const handleAbilityChange = (key, value) => {
    const newAbilities = { ...abilitiesState, [key]: Number(value) };
    setAbilitiesState(newAbilities);
    // Сохраняем в character
    let updatedChar = { ...character };
    if (updatedChar.abilities) {
      updatedChar.abilities = { ...updatedChar.abilities, [key]: Number(value) };
    } else if (updatedChar.stats && updatedChar.stats[abilityKeyMap[key]]) {
      updatedChar.stats[abilityKeyMap[key]].score = Number(value);
    } else {
      updatedChar.abilities = { ...newAbilities };
    }
    onUpdateCharacter(updatedChar);
    if (playerId && typeof send === 'function') send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  };

  // Сохраняем ручной режим для навыка
  const handleManualFlagChange = (skill, checked) => {
    const newFlags = { ...manualSkillFlags, [skill]: checked };
    setManualSkillFlags(newFlags);
    const updatedChar = { ...character, manualSkillFlags: newFlags };
    onUpdateCharacter(updatedChar);
    if (playerId && typeof send === 'function') send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  };
  // Сохраняем ручное значение навыка
  const handleManualValueChange = (skill, value) => {
    const newValues = { ...manualSkillValues, [skill]: value };
    setManualSkillValues(newValues);
    const updatedChar = { ...character, manualSkillValues: newValues };
    onUpdateCharacter(updatedChar);
    if (playerId && typeof send === 'function') send({ type: 'update_character', ownerId: playerId, character: updatedChar });
  };

  // Для сопоставления ключей abilities <-> stats
  const abilityKeyMap = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha',
  };

  return (
    <div className="character-page-container">
      <h1>Character Info</h1>
      <h2>{name}</h2>
      <p>Race: {race}</p>
      <p>Class: {charClass}</p>
      <div style={{ margin: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span>Уровень: <b>{level}</b></span>
          <span>Опыт: <b>{xp}</b></span>
          <span>Бонус мастерства: <b>+{prof}</b></span>
          <button onClick={() => handleXpChange(-100)}>-100</button>
          <button onClick={() => handleXpChange(-10)}>-10</button>
          <button onClick={() => handleXpChange(10)}>+10</button>
          <button onClick={() => handleXpChange(100)}>+100</button>
          <button onClick={() => handleXpChange(1000)}>+1000</button>
          <input
            type="number"
            value={customXp}
            onChange={e => setCustomXp(e.target.value)}
            placeholder="Введите XP"
            style={{ width: 90, marginLeft: 8 }}
          />
          <button onClick={() => handleXpChange(Number(customXp) || 0)}>Добавить</button>
          <button onClick={() => handleXpChange(-(Number(customXp) || 0))}>Убавить</button>
          <button onClick={handleExport} style={{ marginLeft: 16 }}>Экспортировать в JSON</button>
        </div>
        <div style={{ marginTop: 8, background: '#333', borderRadius: 8, height: 18, width: 320, position: 'relative' }}>
          <div style={{ background: '#4caf50', height: '100%', borderRadius: 8, width: `${xpProgress * 100}%`, transition: 'width 0.3s' }} />
          <span style={{ position: 'absolute', left: 8, top: 0, fontSize: 12, color: '#fff' }}>
            {xp} / {levelMaxXp} XP (до след. уровня: {xpToNext > 0 ? xpToNext : 0})
          </span>
        </div>
      </div>
      <h3>Abilities</h3>
      {abilitiesState && Object.keys(abilitiesState).length > 0 ? (
        <table className="abilities-table" style={{ borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Ability</th>
              <th>Score</th>
              <th>Modifier</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(abilitiesState).map(([key, value]) => (
              <tr key={key}>
                <td style={{ textTransform: 'capitalize', textAlign: 'center', padding: 6 }}>{key}</td>
                <td style={{ padding: 0, textAlign: 'center' }}>
                  <input
                    type="number"
                    value={value}
                    min={1}
                    max={30}
                    style={{ width: 44, height: 44, textAlign: 'center', fontWeight: 'bold', fontSize: 20, borderRadius: 8, border: '2px solid #4af', background: '#181c24', color: '#fff', boxSizing: 'border-box' }}
                    onChange={e => handleAbilityChange(key, e.target.value)}
                  />
                </td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 20, width: 44, height: 44, borderRadius: 8, background: '#222', color: '#4af', verticalAlign: 'middle' }}>
                  {getModifier(value) >= 0 ? '+' : ''}{getModifier(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>Нет данных о характеристиках</div>
      )}
      <h3>Skills</h3>
      {DND_SKILLS && DND_SKILLS.length > 0 ? (
        <table className="skills-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Proficient</th>
              <th>Value</th>
              <th>Ручной ввод</th>
            </tr>
          </thead>
          <tbody>
            {DND_SKILLS.map(skill => {
              const abilityKey = SKILL_TO_ABILITY[skill];
              const mod = getModifier(abilitiesState[abilityKey]);
              const proficient = proficientSkills.includes(skill);
              const autoValue = mod + (proficient ? prof : 0);
              const manual = manualSkillFlags[skill];
              const manualValue = manualSkillValues[skill] ?? '';
              return (
                <tr key={skill}>
                  <td>{skill}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={proficient}
                      onChange={() => handleCheckboxChange(skill)}
                    />
                  </td>
                  <td>
                    {manual ? (
                      <input
                        type="number"
                        value={manualValue}
                        style={{ width: 50 }}
                        onChange={e => handleManualValueChange(skill, e.target.value)}
                      />
                    ) : (
                      <span>{autoValue >= 0 ? '+' : ''}{autoValue}</span>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!manual}
                      onChange={e => handleManualFlagChange(skill, e.target.checked)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div>Нет данных о навыках</div>
      )}
    </div>
  );
} 