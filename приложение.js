import { настройки } from './хранилище.js';
import { синхронизировать } from './синхронизация.js';

const тг = window.Telegram?.WebApp;
const вТелеграме = Boolean(тг?.initData);
const экран = document.getElementById('экран');
const меню = document.getElementById('меню');

// Приложение личное: внутри телеграма пускаем только этот аккаунт.
const ХОЗЯЙКА = 521560502;

const ВКЛАДКИ = {
  день: () => import('./экраны/день.js'),
  тренировка: () => import('./экраны/зал.js'),
  еда: () => import('./экраны/еда.js'),
  расчёты: () => import('./экраны/расчёты.js'),
};

export function нарисовать(html) {
  экран.innerHTML = html;
  экран.scrollTop = 0;
  window.scrollTo(0, 0);
}

// Обработчики экрана. Слушатели навешаны один раз, набор обнуляется при смене вкладки.
const обработчики = { click: [], input: [] };

экран.addEventListener('click', (е) => {
  for (const { селектор, дело } of [...обработчики.click]) {
    const цель = е.target.closest(селектор);
    if (цель && экран.contains(цель)) дело(цель, е);
  }
});

экран.addEventListener('input', (е) => {
  for (const запись of обработчики.input) {
    const цель = е.target.closest(запись.селектор);
    if (!цель) continue;
    // таймер свой на каждое поле: иначе ввод во второе поле отменяет запись первого
    clearTimeout(запись.таймеры.get(цель));
    запись.таймеры.set(цель, setTimeout(() => {
      запись.таймеры.delete(цель);
      запись.дело(цель);
    }, запись.задержка));
  }
});

export function приКлике(селектор, дело) {
  обработчики.click.push({ селектор, дело });
}

export function приВводе(селектор, дело, задержка = 500) {
  обработчики.input.push({ селектор, дело, задержка, таймеры: new Map() });
}

export function число(значение, знаков = 0) {
  if (!Number.isFinite(значение)) return '—';
  return значение.toLocaleString('ru-RU', { minimumFractionDigits: знаков, maximumFractionDigits: знаков });
}

export function отклик(тип = 'light') {
  тг?.HapticFeedback?.impactOccurred?.(тип);
  navigator.vibrate?.(тип === 'heavy' ? 18 : 8);
}

let текущая = null;

export async function открыть(имя) {
  if (!ВКЛАДКИ[имя]) имя = 'день';
  текущая = имя;
  // незавершённый ввод дописываем перед уходом с экрана, чтобы ничего не потерялось
  for (const запись of обработчики.input) {
    for (const [цель, таймер] of запись.таймеры) {
      clearTimeout(таймер);
      запись.дело(цель);
    }
    запись.таймеры.clear();
  }
  обработчики.click.length = 0;
  обработчики.input.length = 0;
  localStorage.setItem('вкладка', имя);
  меню.hidden = false;
  for (const кнопка of меню.children) {
    кнопка.toggleAttribute('data-активно', кнопка.dataset.вкладка === имя);
  }
  нарисовать('<div class="пусто">…</div>');
  const модуль = await ВКЛАДКИ[имя]();
  await модуль.показать();
}

export function обновить() {
  if (текущая) открыть(текущая);
}

меню.addEventListener('click', (е) => {
  const кнопка = е.target.closest('button');
  if (!кнопка) return;
  отклик();
  открыть(кнопка.dataset.вкладка);
});

function тема() {
  document.documentElement.dataset.тема = 'тёмная';
  тг?.setBackgroundColor?.('#0d0d0e');
  тг?.setHeaderColor?.('#0d0d0e');
}

/** Подсказка, как поставить приложение на домашний экран (только в сафари на айфоне). */
function приглашениеУстановить() {
  const айфон = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const ужеПриложение = window.navigator.standalone
    || window.matchMedia('(display-mode: standalone)').matches;
  if (!айфон || ужеПриложение || вТелеграме || localStorage.getItem('подсказкаПоказана')) return '';
  localStorage.setItem('подсказкаПоказана', 'да');
  return `<div class="карточка" style="margin-bottom:14px">
    <b>Поставь на домашний экран</b>
    <div class="мелко" style="margin-top:6px">Кнопка «Поделиться» внизу сафари →
      «На экран «Домой»». Дальше дневник открывается как обычное приложение и работает без сети.</div>
  </div>`;
}

async function старт() {
  тг?.ready?.();
  тг?.expand?.();
  тема();

  if (вТелеграме && тг?.initDataUnsafe?.user?.id !== ХОЗЯЙКА) {
    нарисовать('<div class="пусто">Это личное приложение.<br>Оно открывается только у владельца.</div>');
    return;
  }

  let н = await настройки();

  // на домашнем экране нужен ключ — без него данные не забрать
  if (!вТелеграме && !н.ключУстройства && !н.загружено) {
    меню.hidden = true;
    const модуль = await import('./экраны/ключ.js');
    return модуль.показать();
  }

  if (!н.загружено) {
    меню.hidden = true;
    for (let попытка = 1; ; попытка++) {
      нарисовать(`<div class="пусто">Забираю данные из таблицы…${
        попытка > 1 ? `<br><br>попытка ${попытка}` : ''}</div>`);
      try {
        await синхронизировать({ полная: true });
        н = await настройки();
        break;
      } catch (ошибка) {
        if (попытка < 3) {
          await new Promise((и) => setTimeout(и, 400 * попытка));
          continue;
        }
        нарисовать(`<div class="пусто">Не получилось забрать данные:<br>${ошибка.message}
          <br><br><button class="кнопка" data-повтор
            style="max-width:260px;margin:18px auto 0">Попробовать снова</button></div>`);
        // inline-обработчики запрещены политикой безопасности страницы
        экран.querySelector('[data-повтор]')?.addEventListener('click', () => location.reload());
        return;
      }
    }
  }

  await открыть(localStorage.getItem('вкладка') || 'день');

  const подсказка = приглашениеУстановить();
  if (подсказка) экран.insertAdjacentHTML('afterbegin', подсказка);

  синхронизировать().catch(() => {});
}

// офлайн: приложение открывается и работает без сети
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

старт();

// вернулись в приложение — досылаем накопленное
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) синхронизировать().catch(() => {});
});
