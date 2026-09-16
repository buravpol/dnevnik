import { загрузитьДанные, сохранитьНастройки, настройки } from '../хранилище.js';
import { проверить, синхронизировать } from '../синхронизация.js';
import { нарисовать, приКлике, открыть, отклик } from '../приложение.js';

export async function показать() {
  const н = await настройки();

  нарисовать(`
    <h1>Первый запуск</h1>
    <p class="подпись">Нужно один раз подключить таблицу — дальше приложение работает само.</p>

    <div class="карточка">
      <div class="мелко" style="margin-bottom:8px">Адрес таблицы</div>
      <input type="text" data-адрес placeholder="https://script.google.com/…"
        value="${н.адресСинхронизации || ''}">
      <div class="мелко" style="margin:12px 0 8px">Ключ</div>
      <input type="text" data-ключ placeholder="ключ из настройки" value="${н.ключСинхронизации || ''}">
      <button class="кнопка" data-подключить>Подключить</button>
      <div class="мелко" data-ответ style="margin-top:10px"></div>
    </div>

    <h2>Или из файла</h2>
    <div class="карточка">
      <div class="мелко" style="margin-bottom:10px">Загрузить выгрузку таблицы (данные.json)</div>
      <input type="file" data-файл accept="application/json,.json">
    </div>
  `);

  приКлике('[data-подключить]', async () => {
    const адрес = document.querySelector('[data-адрес]').value.trim();
    const ключ = document.querySelector('[data-ключ]').value.trim();
    const ответ = document.querySelector('[data-ответ]');
    if (!адрес || !ключ) {
      ответ.textContent = 'Заполни адрес и ключ';
      return;
    }
    ответ.textContent = 'Проверяю…';
    try {
      await проверить(адрес, ключ);
      await сохранитьНастройки({ адресСинхронизации: адрес, ключСинхронизации: ключ });
      ответ.textContent = 'Связь есть, забираю данные…';
      await синхронизировать({ полная: true });
      отклик('heavy');
      открыть('день');
    } catch (е) {
      ответ.textContent = 'Не вышло: ' + е.message;
    }
  });

  document.querySelector('[data-файл]')?.addEventListener('change', async (е) => {
    const файл = е.target.files?.[0];
    if (!файл) return;
    const текст = await файл.text();
    try {
      await загрузитьДанные(JSON.parse(текст));
      отклик('heavy');
      открыть('день');
    } catch (ошибка) {
      alert('Файл не подошёл: ' + ошибка.message);
    }
  });
}
