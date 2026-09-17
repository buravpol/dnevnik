// Обмен с гугл-таблицей. Идёт фоном: экраны никогда не ждут сеть.
// Внутри телеграма личность подтверждает его подпись, на домашнем экране — ключ устройства.
import { настройки, сохранитьНастройки, очередь, убратьИзОчереди, загрузитьДанные } from './хранилище.js';

// Адрес не секрет: без подписи или ключа он ничего не отдаёт.
const АДРЕС = 'https://script.google.com/macros/s/AKfycbySBhPFuC6JP8biCLPm5XlI9AHoYk_DAkxigizRVQOe78pnpCZS4g3snlHYfOybUWtt/exec';

function подпись() {
  return window.Telegram?.WebApp?.initData || '';
}

async function запрос(тело) {
  const н = await настройки();
  const ответ = await fetch(АДРЕС, {
    method: 'POST',
    // Apps Script не отвечает на preflight, поэтому запрос «простой»
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...тело, подпись: подпись(), ключ: н.ключУстройства || '' }),
    referrerPolicy: 'no-referrer',
  });
  if (!ответ.ok) throw new Error('таблица ответила ' + ответ.status);
  const итог = await ответ.json();
  if (итог.ок === false) throw new Error(итог.ошибка || 'таблица отказала');
  return итог;
}

/** Отправить накопленные изменения и забрать свежие данные. */
export async function синхронизировать({ полная = false } = {}) {
  const н = await настройки();
  if (!подпись() && !н.ключУстройства) return { статус: 'нет доступа' };

  const пачка = await очередь();
  const ответ = await запрос({
    изменения: пачка.map(({ тип, тело }) => ({ тип, тело })),
    нуженСлепок: полная || !н.загружено,
  });

  for (const з of пачка) await убратьИзОчереди(з.id);
  if (ответ.данные) await загрузитьДанные(ответ.данные);
  await сохранитьНастройки({ синхронизировано: new Date().toISOString() });
  return { статус: 'ок', отправлено: пачка.length };
}

/** Взять ключ устройства — работает только внутри телеграма. */
export async function взятьКлюч() {
  const ответ = await запрос({ выдатьКлюч: true });
  return ответ.ключ;
}

/** Проверить, что ключ подходит, и запомнить его на этом устройстве. */
export async function запомнитьКлюч(ключ) {
  await сохранитьНастройки({ ключУстройства: ключ.trim() });
  try {
    await запрос({ проверка: true });
    return true;
  } catch (ошибка) {
    await сохранитьНастройки({ ключУстройства: null });
    throw ошибка;
  }
}
