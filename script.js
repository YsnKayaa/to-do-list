'use strict';

const MAX_LENGTH = 120;

const DEFAULT_TODOS = [
  { id: 'd1', text: 'Ödevleri Yap', completed: true },
  { id: 'd2', text: 'Sporuna Git', completed: false },
  { id: 'd3', text: 'Raporlar Teslim Edilicek', completed: false },
  { id: 'd4', text: '15:00 Kalite Toplantısı', completed: false },
  { id: 'd5', text: '19:00 Şirket Yemeği', completed: false },
  { id: 'd6', text: 'Ek Geliştirmeleri Tamamla', completed: false },
];

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizeTodos(raw) {
  if (!Array.isArray(raw)) return null;

  return raw
    .filter((item) => item && typeof item.id === 'string' && typeof item.text === 'string')
    .map((item) => ({
      id: item.id,
      text: item.text.slice(0, MAX_LENGTH),
      completed: item.completed === true,
    }));
}

function createTodoStore(initialTodos) {
  let todos = initialTodos.map((todo) => ({ ...todo }));

  function visibleIds(filter) {
    return todos
      .filter((todo) => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
      })
      .map((todo) => todo.id);
  }

  function reorderVisible(orderedIds) {
    const wanted = new Set(orderedIds);
    const slots = [];
    todos.forEach((todo, index) => {
      if (wanted.has(todo.id)) slots.push(index);
    });

    const byId = new Map(todos.map((todo) => [todo.id, todo]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
    if (ordered.length !== slots.length) return;

    slots.forEach((slot, i) => {
      todos[slot] = ordered[i];
    });
  }

  return {
    get todos() {
      return todos.map((todo) => ({ ...todo }));
    },

    add(text) {
      const clean = text.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH);
      if (!clean) return null;

      const todo = { id: makeId(), text: clean, completed: false };
      todos.unshift(todo);
      return { ...todo };
    },

    toggle(id) {
      const todo = todos.find((item) => item.id === id);
      if (todo) todo.completed = !todo.completed;
    },

    remove(id) {
      todos = todos.filter((item) => item.id !== id);
    },

    clearCompleted() {
      todos = todos.filter((item) => !item.completed);
    },

    visible(filter) {
      const ids = new Set(visibleIds(filter));
      return todos.filter((todo) => ids.has(todo.id)).map((todo) => ({ ...todo }));
    },

    activeCount() {
      return todos.filter((todo) => !todo.completed).length;
    },

    completedCount() {
      return todos.filter((todo) => todo.completed).length;
    },

    reorderVisible,

    move(id, direction, filter) {
      const ids = visibleIds(filter);
      const from = ids.indexOf(id);
      const to = from + direction;
      if (from === -1 || to < 0 || to >= ids.length) return null;

      [ids[from], ids[to]] = [ids[to], ids[from]];
      reorderVisible(ids);
      return { position: to + 1, total: ids.length };
    },
  };
}
const STORAGE_KEY = 'todo-app-items';
const THEME_KEY = 'todo-theme';

const form = document.querySelector('#new-todo-form');
const input = document.querySelector('#new-todo');
const list = document.querySelector('#todo-list');
const itemsLeft = document.querySelector('#items-left');
const clearButton = document.querySelector('#clear-completed');
const filterButtons = document.querySelectorAll('[data-filter]');
const themeToggle = document.querySelector('.theme-toggle');
const statusRegion = document.querySelector('#status');

function loadTodos() {
  try {
    const saved = normalizeTodos(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    if (saved) return saved;
  } catch {
  }
  return DEFAULT_TODOS;
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.todos));
  } catch {

}
}

const store = createTodoStore(loadTodos());
let filter = 'all';
const EMPTY_MESSAGES = {
  all: 'Listeniz boş. Yukarıya bir yapılacak iş ekleyin',
  active: 'Hepsini etkinleştirme.',
  completed: 'Tamamlanmış yapılacak iş yok.',
};

function createTodoElement(todo) {
  const item = document.createElement('li');
  item.className = 'todo' + (todo.completed ? ' todo--completed' : '');
  item.dataset.id = todo.id;
  item.draggable = true;

  const label = document.createElement('label');
  label.className = 'todo__main';

  const checkbox = document.createElement('input');
  checkbox.className = 'todo__check visually-hidden';
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;

  const circle = document.createElement('span');
  circle.className = 'todo__circle';
  circle.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'todo__text';
  text.textContent = todo.text; 
  label.append(checkbox, circle, text);

  const deleteButton = document.createElement('button');
  deleteButton.className = 'todo__delete';
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', `Delete ${todo.text}`);
  deleteButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">' +
    '<path d="M1 1l16 16M17 1L1 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  item.append(label, deleteButton);
  return item;
}

function createEmptyElement() {
  const item = document.createElement('li');
  item.className = 'todo-list__empty';
  item.textContent = EMPTY_MESSAGES[filter];
  return item;
}

function render(focusId) {
  const visible = store.visible(filter);
  const items = visible.length ? visible.map(createTodoElement) : [createEmptyElement()];
  list.replaceChildren(...items);

  const left = store.activeCount();
  const message = `${left} ${left === 1 ? 'item' : 'items'} left`;
  if (itemsLeft.textContent !== message) itemsLeft.textContent = message;

  clearButton.disabled = store.completedCount() === 0;

  filterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  });

  if (focusId) {
    const target = list.querySelector(`.todo[data-id="${focusId}"] .todo__check`);
    if (target) target.focus();
  }

  saveTodos();
}

function announce(message) {
  statusRegion.textContent = '';
  setTimeout(() => { statusRegion.textContent = message; }, 50);
}
form.addEventListener('submit', (event) => {
  event.preventDefault();

  const todo = store.add(input.value);
  if (!todo) {
    input.value = '';
    return;
  }

  input.value = '';
  if (filter === 'completed') filter = 'all';
  render();
  announce(`Added ${todo.text}`);
});

list.addEventListener('change', (event) => {
  if (!event.target.matches('.todo__check')) return;

  const id = event.target.closest('.todo').dataset.id;
  store.toggle(id);
  render(id);
});


list.addEventListener('click', (event) => {
  const button = event.target.closest('.todo__delete');
  if (!button) return;

  const item = button.closest('.todo');
  const neighbor = item.nextElementSibling || item.previousElementSibling;
  store.remove(item.dataset.id);

  const keyboard = event.detail === 0;
  render(keyboard && neighbor && neighbor.dataset ? neighbor.dataset.id : undefined);
  if (keyboard && !list.querySelector('.todo')) input.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    render();
  });
});

clearButton.addEventListener('click', () => {
  store.clearCompleted();
  render();
});
let dragged = null;

function getItemAfter(y) {
  const others = [...list.querySelectorAll('.todo')].filter((item) => item !== dragged);

  return others.find((item) => {
    const box = item.getBoundingClientRect();
    return y < box.top + box.height / 2;
  });
}

list.addEventListener('dragstart', (event) => {
  const item = event.target.closest('.todo');
  if (!item) return;

  dragged = item;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', item.dataset.id);
  requestAnimationFrame(() => item.classList.add('todo--dragging'));
});

list.addEventListener('dragover', (event) => {
  if (!dragged) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  const after = getItemAfter(event.clientY);
  if (after) list.insertBefore(dragged, after);
  else list.append(dragged);
});

list.addEventListener('drop', (event) => {
  if (dragged) event.preventDefault();
});

list.addEventListener('dragend', (event) => {
  if (!dragged) return;

  const cancelled = event.dataTransfer.dropEffect === 'none';
  dragged.classList.remove('todo--dragging');
  dragged = null;

  if (!cancelled) {
    store.reorderVisible([...list.querySelectorAll('.todo')].map((item) => item.dataset.id));
  }
  render(); 
});

list.addEventListener('keydown', (event) => {
  if (!event.altKey || !event.target.matches('.todo__check')) return;
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

  event.preventDefault();
  const item = event.target.closest('.todo');
  const direction = event.key === 'ArrowUp' ? -1 : 1;
  const result = store.move(item.dataset.id, direction, filter);

  if (result) {
    render(item.dataset.id);
    announce(`Moved to position ${result.position} of ${result.total}`);
  }
});
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
  }
  updateThemeButton();
});

updateThemeButton();
render();
