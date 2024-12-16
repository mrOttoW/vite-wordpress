const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');

form.addEventListener('submit', e => {
  e.preventDefault();

  const todoText = input.value.trim();
  if (todoText === '') return;

  const listItem = document.createElement('li');
  listItem.textContent = todoText;

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'X';
  deleteBtn.classList.add('delete-btn');
  listItem.appendChild(deleteBtn);

  list.appendChild(listItem);
  input.value = '';
});

list.addEventListener('click', e => {
  if (e.target.classList.contains('delete-btn')) {
    const listItem = e.target.parentElement;
    list.removeChild(listItem);
  }
});
