// Обмен с гугл-таблицей. Идёт фоном: экраны никогда не ждут сеть.
// Каждый запрос подписан телеграмом — таблица отдаёт данные только владелице.
import { настройки, сохранитьНастройки, очередь, убратьИзОчереди, загрузитьДанные } from './хранилище.js';

// Адрес таблицы не секрет: без подписи телеграма он ничего не отдаёт.
const АДРЕС = 'https://script.google.com/macros/s/AKfycbySBhPFuC6JP8biCLPm5XlI9AHoYk_DAkxigizRVQOe78pnpCZS4g3snlHYfOybUWtt/exec';

function подпись() {
  // initData телеграма: строка, подписанная ботом. Проверяется на стороне скрипта.
  return window.Telegram?.WebApp?.initData || '';
}

async function запрос(адрес, тело) {
  const ответ = await fetch(адрес, {
    method: 'POST',
    // Apps Script не отвечает на preflight, поэтому запрос «простой»
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...тело, подпись: подпись() }),
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
  const пачка = await очередь();
  const ответ = await запрос(АДРЕС, {
    изменения: пачка.map(({ тип, тело }) => ({ тип, тело })),
    нуженСлепок: полная || !н.загружено,
  });

  for (const з of пачка) await убратьИзОчереди(з.id);
  if (ответ.данные) await загрузитьДанные(ответ.данные);
  await сохранитьНастройки({ синхронизировано: new Date().toISOString() });
  return { статус: 'ок', отправлено: пачка.length };
}

/** Проверить связь с таблицей. */
export async function проверить() {
  return запрос(АДРЕС, { проверка: true });
}
