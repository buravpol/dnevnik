// Локальная база в телефоне. Всё лежит здесь, приложение работает без сети.
const ИМЯ = 'дневник';
const ВЕРСИЯ = 1;
const ХРАНИЛИЩА = ['дни', 'замеры', 'тренировки', 'программы', 'продукты', 'настройки', 'очередь'];

let база;

function открыть() {
  if (база) return база;
  база = new Promise((успех, ошибка) => {
    const запрос = indexedDB.open(ИМЯ, ВЕРСИЯ);
    запрос.onupgradeneeded = () => {
      const бд = запрос.result;
      for (const имя of ХРАНИЛИЩА) {
        if (!бд.objectStoreNames.contains(имя)) {
          бд.createObjectStore(имя, { keyPath: имя === 'очередь' ? 'id' : 'ключ' });
        }
      }
    };
    запрос.onsuccess = () => успех(запрос.result);
    запрос.onerror = () => ошибка(запрос.error);
  });
  return база;
}

async function сделка(имя, режим, дело) {
  const бд = await открыть();
  return new Promise((успех, ошибка) => {
    const т = бд.transaction(имя, режим);
    const результат = дело(т.objectStore(имя));
    т.oncomplete = () => успех(результат && результат.result !== undefined ? результат.result : результат);
    т.onerror = () => ошибка(т.error);
  });
}

export const хранилище = {
  async положить(имя, ключ, значение) {
    await сделка(имя, 'readwrite', (х) => х.put({ ключ, ...значение }));
    return значение;
  },
  async взять(имя, ключ) {
    const бд = await открыть();
    return new Promise((успех) => {
      const запрос = бд.transaction(имя).objectStore(имя).get(ключ);
      запрос.onsuccess = () => успех(запрос.result || null);
      запрос.onerror = () => успех(null);
    });
  },
  async всё(имя) {
    const бд = await открыть();
    return new Promise((успех) => {
      const запрос = бд.transaction(имя).objectStore(имя).getAll();
      запрос.onsuccess = () => успех(запрос.result || []);
      запрос.onerror = () => успех([]);
    });
  },
  async очистить(имя) {
    await сделка(имя, 'readwrite', (х) => х.clear());
  },
  async заменить(имя, записи, ключПоля = 'ключ') {
    await сделка(имя, 'readwrite', (х) => {
      х.clear();
      for (const з of записи) х.put({ ...з, ключ: з[ключПоля] ?? з.ключ });
    });
  },
};

// ——— настройки (цели, ссылка синхронизации) ———
export async function настройки() {
  const з = await хранилище.взять('настройки', 'основные');
  return з || { ключ: 'основные' };
}
export async function сохранитьНастройки(новые) {
  const текущие = await настройки();
  return хранилище.положить('настройки', 'основные', { ...текущие, ...новые });
}

// ——— первичная загрузка данных из таблицы ———
export async function загрузитьДанные(данные) {
  await хранилище.заменить('дни', данные.days || [], 'date');
  await хранилище.заменить('замеры', данные.measurements || [], 'date');
  await хранилище.заменить('продукты', (данные.products || []).map((п, i) => ({ ...п, ключ: String(i) })));
  await хранилище.заменить('программы', (данные.programs || []).map((п) => ({ ...п, ключ: п.name })));
  await сохранитьНастройки({
    ...(данные.settings || {}),
    рефид: данные.refeed || null,
    планПитания: данные.mealPlan || null,
    загружено: new Date().toISOString(),
  });
}

// ——— очередь на отправку в таблицу ———
export async function вОчередь(тип, тело) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  await сделка('очередь', 'readwrite', (х) => х.put({ id, тип, тело, создано: new Date().toISOString() }));
}

export async function очередь() {
  return хранилище.всё('очередь');
}

export async function убратьИзОчереди(id) {
  await сделка('очередь', 'readwrite', (х) => х.delete(id));
}

// ——— день ———
export async function день(дата) {
  return (await хранилище.взять('дни', дата)) || { ключ: дата, date: дата };
}

export async function сохранитьДень(дата, поля) {
  const текущий = await день(дата);
  const новый = { ...текущий, ...поля, date: дата, ключ: дата };
  await хранилище.положить('дни', дата, новый);
  await вОчередь('день', новый);
  return новый;
}

export async function дни() {
  const все = await хранилище.всё('дни');
  return все.sort((а, б) => (а.date < б.date ? -1 : 1));
}
