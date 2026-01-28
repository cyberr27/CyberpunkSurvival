// recipeViewer.js — просмотр рецептов улучшения экипировки

function showRecipeDialog(itemType) {
  if (!ITEM_CONFIG[itemType] || !ITEM_CONFIG[itemType].description) {
    showNotification("Рецепт повреждён...", "#ff4444");
    return;
  }

  // Закрываем предыдущее, если открыто
  const existing = document.querySelector(".recipe-dialog");
  if (existing) existing.remove();

  const dialog = document.createElement("div");
  dialog.className = "recipe-dialog";

  dialog.innerHTML = `
      <div class="recipe-close-area">
        <button class="recipe-neon-btn">x</button>
      </div>
  `;

  document.body.appendChild(dialog);

  // Запускаем открытие с анимацией
  setTimeout(() => dialog.classList.add("open"), 10);

  // Блокируем скролл
  document.body.classList.add("recipe-dialog-active");

  // Закрытие
  const closeBtn = dialog.querySelector(".recipe-neon-btn");
  const closeDialog = () => {
    dialog.classList.remove("open");
    setTimeout(() => {
      dialog.remove();
      document.body.classList.remove("recipe-dialog-active");
    }, 300); // ждём окончания анимации
  };

  closeBtn.onclick = closeDialog;

  // Закрытие по клику вне контента
  dialog.onclick = (e) => {
    if (e.target === dialog) closeDialog();
  };

  // Закрытие по Esc (удобно)
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeDialog();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
}

// Подключаем стили автоматически (если ещё не подключены)
if (!document.querySelector('link[href="recipeViewerStyle.css"]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "recipeViewerStyle.css";
  document.head.appendChild(link);
}
