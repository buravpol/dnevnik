import { настройки } from './хранилище.js';
import { синхронизировать } from './синхронизация.js';

const тг = window.Telegram?.WebApp;
const экран = document.getElementById('экран');
const меню = document.getElementById('меню');

// Приложение личное: открывается только с этого телеграм-аккаунта.
const ХОЗЯЙКА = 521560502;
const ОТЛАДКА = ['localhost', '127.0.0.1'].includes(location.hostname);

function свой() {
  if (ОТЛАДКА) return true;
  const кто = тг?.initDataUnsafe?.user?.id;
  return кто === ХОЗЯЙКА;
}

const ВКЛАДКИ = {
  день: () => import('./экраны/день.js'),
  тренировка: () => import('./экраны/зал.js'),
  еда: () => import('./экраны/еда.js'),
  тело: () => import('./экраны/тело.js'),
  аналитика: () => import('./экраны/аналитика.js'),
};

export function нарисовать(html) {
  экран.innerHTML = html;
  экран.scrollTop = 0;
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

// приложение всегда тёмное: палитра макета одна
function тема() {
  document.documentElement.dataset.тема = 'тёмная';
  тг?.setBackgroundColor?.('#0d0d0e');
  тг?.setHeaderColor?.('#0d0d0e');
}

async function старт() {
  тг?.ready?.();
  тг?.expand?.();
  тема();

  if (!свой()) {
    нарисовать('<div class="пусто">Это личное приложение.<br>Оно открывается только у владельца.</div>');
    return;
  }
  меню.hidden = false;

  let н = await настройки();
  // первый запуск: сразу тянем данные из таблицы, никаких экранов настройки
  if (!н.загружено) {
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
  if (!н.загружено && !location.hash.includes('настройка')) {
    const модуль = await import('./экраны/настройка.js');
    return модуль.показать();
  }
  await открыть(localStorage.getItem('вкладка') || 'день');
  синхронизировать().catch(() => {});
}

старт();
