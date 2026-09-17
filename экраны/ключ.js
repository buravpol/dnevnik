import { настройки } from '../хранилище.js';
import { взятьКлюч, запомнитьКлюч, синхронизировать } from '../синхронизация.js';
import { нарисовать, приКлике, открыть, отклик } from '../приложение.js';

const вТелеграме = Boolean(window.Telegram?.WebApp?.initData);

export async function показать() {
  const н = await настройки();

  if (вТелеграме) {
    нарисовать(`
      <h1>Ключ</h1>
      <p class="подпись">Чтобы приложение на домашнем экране увидело твои данные,
        вставь в него этот ключ. Больше он нигде не нужен.</p>
      <div class="карточка">
        <div class="мелко" data-ключ style="word-break:break-all;line-height:1.5">Получаю…</div>
        <button class="кнопка" data-копировать>Скопировать</button>
      </div>
    `);

    let ключ = '';
    try {
      ключ = await взятьКлюч();
      document.querySelector('[data-ключ]').textContent = ключ;
    } catch (ошибка) {
      document.querySelector('[data-ключ]').textContent = 'Не вышло: ' + ошибка.message;
    }

    приКлике('[data-копировать]', async () => {
      if (!ключ) return;
      try {
        await navigator.clipboard.writeText(ключ);
        document.querySelector('[data-копировать]').textContent = 'Скопировано';
        отклик('medium');
      } catch (ошибка) {
        document.querySelector('[data-копировать]').textContent = 'Выдели и скопируй вручную';
      }
    });
    return;
  }

  нарисовать(`
    <h1>Подключение</h1>
    <p class="подпись">Вставь ключ из телеграм-версии: бот «Тренировки» →
      Расчёты → «Ключ для другого устройства».</p>
    <div class="карточка">
      <input type="text" data-поле placeholder="ключ" value="${н.ключУстройства || ''}"
        autocapitalize="off" autocorrect="off" spellcheck="false">
      <button class="кнопка" data-подключить>Подключить</button>
      <div class="мелко" data-ответ style="margin-top:10px"></div>
    </div>
  `);

  приКлике('[data-подключить]', async () => {
    const поле = document.querySelector('[data-поле]');
    const строка = document.querySelector('[data-ответ]');
    if (!поле.value.trim()) return;
    строка.textContent = 'Проверяю…';
    try {
      await запомнитьКлюч(поле.value);
      строка.textContent = 'Связь есть, забираю данные…';
      await синхронизировать({ полная: true });
      отклик('heavy');
      открыть('день');
    } catch (ошибка) {
      строка.textContent = 'Не вышло: ' + ошибка.message;
    }
  });
}
