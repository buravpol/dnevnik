import { загрузитьДанные } from '../хранилище.js';
import { синхронизировать } from '../синхронизация.js';
import { нарисовать, приКлике, открыть, отклик } from '../приложение.js';

export async function показать() {
  нарисовать(`
    <h1>Данные</h1>
    <p class="подпись">Обычно приложение забирает всё из таблицы само.
      Эти кнопки — на случай, если что-то пошло не так.</p>

    <div class="карточка">
      <button class="кнопка" data-заново>Забрать из таблицы заново</button>
      <div class="мелко" data-ответ style="margin-top:10px"></div>
    </div>

    <h2>Из файла</h2>
    <div class="карточка">
      <div class="мелко" style="margin-bottom:10px">Выгрузка таблицы (данные.json)</div>
      <input type="file" data-файл accept="application/json,.json">
    </div>
  `);

  приКлике('[data-заново]', async () => {
    const строка = document.querySelector('[data-ответ]');
    строка.textContent = 'Забираю…';
    try {
      await синхронизировать({ полная: true });
      отклик('heavy');
      открыть('день');
    } catch (ошибка) {
      строка.textContent = 'Не вышло: ' + ошибка.message;
    }
  });

  document.querySelector('[data-файл]')?.addEventListener('change', async (е) => {
    const файл = е.target.files?.[0];
    if (!файл) return;
    try {
      await загрузитьДанные(JSON.parse(await файл.text()));
      отклик('heavy');
      открыть('день');
    } catch (ошибка) {
      alert('Файл не подошёл: ' + ошибка.message);
    }
  });
}
