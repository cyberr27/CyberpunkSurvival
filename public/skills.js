window.skillsSystem = {
  isSkillsOpen: false,
  selectedSkillIndex: null,
  playerSkills: [],

  initialize() {
    this.createGrid();
    document.getElementById("skillsBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggleSkills();
    });
  },

  toggleSkills() {
    this.isSkillsOpen = !this.isSkillsOpen;

    const container = document.getElementById("skillsContainer");
    if (!container) return;

    container.style.display = this.isSkillsOpen ? "grid" : "none";

    // Закрываем другие окна на мобильных
    if (window.innerWidth <= 600) {
      if (this.isSkillsOpen) {
        if (window.isInventoryOpen) window.inventorySystem.toggleInventory();
        if (window.equipmentSystem?.isEquipmentOpen)
          window.equipmentSystem.toggleEquipment();
      }
    }

    if (this.isSkillsOpen) {
      this.updateSkillsDisplay();
    } else {
      this.selectedSkillIndex = null;
      document.getElementById("skillsDescription").innerHTML = "";
    }
  },

  createGrid() {
    const grid = document.getElementById("skillsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    for (let i = 0; i < 10; i++) {
      const slot = document.createElement("div");
      slot.className = "skill-slot";
      slot.dataset.index = i;

      const skill = this.playerSkills.find((s) => s.slot === i) || null;

      if (skill) {
        const img = document.createElement("img");
        img.src = `images/skills/${skill.type}.png`; // предполагаем, что будут такие файлы
        img.alt = skill.name;
        slot.appendChild(img);

        const badge = document.createElement("div");
        badge.className = "level-badge";
        badge.textContent = skill.level;
        slot.appendChild(badge);
      } else {
        slot.classList.add("skill-empty");
      }

      slot.addEventListener("click", () => this.selectSkill(i, slot));
      grid.appendChild(slot);
    }
  },

  selectSkill(index, slotElement) {
    const skill = this.playerSkills.find((s) => s.slot === index);

    // Снимаем выделение со всех
    document
      .querySelectorAll(".skill-slot")
      .forEach((s) => s.classList.remove("active"));

    if (this.selectedSkillIndex === index || !skill) {
      this.selectedSkillIndex = null;
      document.getElementById("skillsDescription").innerHTML = "";
      return;
    }

    this.selectedSkillIndex = index;
    slotElement.classList.add("active");

    const desc = document.getElementById("skillsDescription");
    desc.innerHTML = `
      <h3>${skill.name} (ур. ${skill.level})</h3>
      <p>${skill.description}</p>
    `;
  },

  updateSkillsDisplay() {
    this.createGrid(); // перерисовываем сетку

    if (this.selectedSkillIndex !== null) {
      const slot = document.querySelector(
        `.skill-slot[data-index="${this.selectedSkillIndex}"]`,
      );
      if (slot) slot.classList.add("active");
    }
  },
};

// Инициализация при загрузке
document.addEventListener("DOMContentLoaded", () => {
  window.skillsSystem.initialize();
});
