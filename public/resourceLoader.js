// resourceLoader.js
// Модуль загрузки ресурсов для Cyberpunk Survival

// === Загрузка изображений ===
const imageSources = {
  playerSprite: "images/playerSprite.png",
  energyDrinkImage: "images/energy_drink.png",
  nutImage: "images/nut.png",
  waterBottleImage: "images/water_bottle.png",
  cannedMeatImage: "images/canned_meat.png",
  mushroomImage: "images/mushroom.png",
  sausageImage: "images/sausage.png",
  bloodPackImage: "images/blood_pack.png",
  breadImage: "images/bread.png",
  vodkaBottleImage: "images/vodka_bottle.png",
  meatChunkImage: "images/meat_chunk.png",
  bloodSyringeImage: "images/blood_syringe.png",
  milkImage: "images/milk.png",
  condensedMilkImage: "images/condensed_milk.png",
  driedFishImage: "images/dried_fish.png",
  balyaryImage: "images/balyary.png",
  appleImage: "images/apple.png",
  berriesImage: "images/berry.png",
  carrotImage: "images/carrot.png",
  johnSprite: "images/JohnSprite.png",
  npcPhotoImage: "images/fotoQuestNPC.png",
  jackSprite: "images/jackSprite.png",
  jackPhotoImage: "images/jackPhoto.png",
  cyberHelmetImage: "images/cyber_helmet.png",
  nanoArmorImage: "images/nano_armor.png",
  tacticalBeltImage: "images/tactical_belt.png",
  cyberPantsImage: "images/cyber_pants.png",
  speedBootsImage: "images/speed_boots.png",
  techGlovesImage: "images/tech_gloves.png",
  plasmaRifleImage: "images/plasma_rifle.png",
  knucklesImage: "images/knuckles.png",
  knifeImage: "images/knife.png",
  batImage: "images/bat.png",
  atomImage: "images/atom.png",
  mutantSprite: "images/mutantSprite.png",
  scorpionSprite: "images/scorpionSprite.png",
  alexNeonSprite: "images/alexNeonSprite.png",
  alexNeonFoto: "images/alexNeonFoto.png",
  vacuumRobotSprite: "images/vacuum_robot.png",
  vacuumPhotoImage: "images/vacuum_photo.png",
  cockroachSprite: "images/cockroachSprite.png",
  droneSprite: "images/dronSprite.png",
  bonfireImage: "images/bonfire.png",
  oclocSprite: "images/oclocSprite.png",
  corporateRobotSprite: "images/corporate_robot.png",
  corporateRobotFoto: "images/corporate_robot_foto.png",
  robotDoctorSprite: "images/robotDoctorSprite.png",
  robotDoctorFoto: "images/robot_doctor_foto.png",
  medicalCertificateImage: "images/medical_certificate.png",
  medicalCertificateStampedImage: "images/medical_certificate_stamped.png",
  torn_baseball_cap_of_health: "images/torn_baseball_cap_of_health.png",
  torn_health_t_shirt: "images/torn_health_t_shirt.png",
  torn_health_gloves: "images/torn_health_gloves.png",
  torn_belt_of_health: "images/torn_belt_of_health.png",
  torn_pants_of_health: "images/torn_pants_of_health.png",
  torn_health_sneakers: "images/torn_health_sneakers.png",
  torn_energy_cap: "images/torn_energy_cap.png",
  torn_energy_t_shirt: "images/torn_energy_t_shirt.png",
  torn_gloves_of_energy: "images/torn_gloves_of_energy.png",
  torn_energy_belt: "images/torn_energy_belt.png",
  torn_pants_of_energy: "images/torn_pants_of_energy.png",
  torn_sneakers_of_energy: "images/torn_sneakers_of_energy.png",
  torn_cap_of_gluttony: "images/torn_cap_of_gluttony.png",
  torn_t_shirt_of_gluttony: "images/torn_t_shirt_of_gluttony.png",
  torn_gloves_of_gluttony: "images/torn_gloves_of_gluttony.png",
  torn_belt_of_gluttony: "images/torn_belt_of_gluttony.png",
  torn_pants_of_gluttony: "images/torn_pants_of_gluttony.png",
  torn_sneakers_of_gluttony: "images/torn_sneakers_of_gluttony.png",
  torn_cap_of_thirst: "images/torn_cap_of_thirst.png",
  torn_t_shirt_of_thirst: "images/torn_t_shirt_of_thirst.png",
  torn_gloves_of_thirst: "images/torn_gloves_of_thirst.png",
  torn_belt_of_thirst: "images/torn_belt_of_thirst.png",
  torn_pants_of_thirst: "images/torn_pants_of_thirst.png",
  torn_sneakers_of_thirst: "images/torn_sneakers_of_thirst.png",
};

const images = {};
let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

Object.entries(imageSources).forEach(([key, src]) => {
  images[key] = new window.Image();
  images[key].src = src;
  images[key].onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
      if (window.onResourcesLoaded) window.onResourcesLoaded();
    }
  };
});

// === ITEM_CONFIG (с использованием images) ===
const ITEM_CONFIG = {
  energy_drink: {
    effect: { energy: 20, water: 5 },
    image: images.energyDrinkImage,
    description: "Энергетик: +20 эн. +5 воды.",
    rarity: 2,
  },
  nut: {
    effect: { food: 7 },
    image: images.nutImage,
    description: "Орех: +7 еды.",
    rarity: 3,
  },
  water_bottle: {
    effect: { water: 30 },
    image: images.waterBottleImage,
    description: "Вода: +30 воды.",
    rarity: 3,
  },
  apple: {
    effect: { food: 8, water: 5 },
    image: images.appleImage,
    description: "Яблоко: +8 еды, +5 воды.",
    rarity: 3,
  },
  berries: {
    effect: { food: 6, water: 6 },
    image: images.berriesImage,
    description: "Ягоды: +6 еды, +6 воды.",
    rarity: 3,
  },
  carrot: {
    effect: { food: 5, energy: 3 },
    image: images.carrotImage,
    description: "Морковь: +5 еды, +3 энергии.",
    rarity: 3,
  },
  canned_meat: {
    effect: { food: 20 },
    image: images.cannedMeatImage,
    description: "Банка тушёнки: +20 еды.",
    rarity: 1,
  },
  mushroom: {
    effect: { food: 5, energy: 15 },
    image: images.mushroomImage,
    description: "Гриб прущий: +15 энергии, +5 еды.",
    rarity: 1,
  },
  sausage: {
    effect: { food: 16, energy: 3 },
    image: images.sausageImage,
    description: "Колбаса: +16 еды, +3 энергии.",
    rarity: 2,
  },
  blood_pack: {
    effect: { health: 40 },
    image: images.bloodPackImage,
    description: "Пакет крови: +40 здоровья.",
    rarity: 1,
  },
  bread: {
    effect: { food: 13, water: -2 },
    image: images.breadImage,
    description: "Хлеб: +13 еды, -2 воды.",
    rarity: 2,
  },
  vodka_bottle: {
    effect: { health: 5, energy: -2, water: 1, food: 2 },
    image: images.vodkaBottleImage,
    description: "Водка: +5 здоровья, -2 эн. +1 воды, +2 еды.",
    rarity: 2,
  },
  meat_chunk: {
    effect: { food: 20, energy: 5, water: -2 },
    image: images.meatChunkImage,
    description: "Кусок мяса: +20 еды, +5 эн., -2 воды.",
    rarity: 2,
  },
  blood_syringe: {
    effect: { health: 10 },
    image: images.bloodSyringeImage,
    description: "Шприц с кровью: +10 здоровья.",
    rarity: 2,
  },
  milk: {
    effect: { water: 15, food: 5 },
    image: images.milkImage,
    description: "Молоко: +15 воды, +5 еды.",
    rarity: 2,
  },
  condensed_milk: {
    effect: { water: 5, food: 11, energy: 2 },
    image: images.condensedMilkImage,
    description: "Сгущёнка: +11 еды, +5 воды, +2 эн.",
    rarity: 2,
  },
  dried_fish: {
    effect: { food: 10, water: -3 },
    image: images.driedFishImage,
    description: "Сушёная рыба: +10 еды, -3 воды.",
    rarity: 2,
  },
  balyary: {
    effect: {},
    image: images.balyaryImage,
    description: "Баляр: игровая валюта.",
    stackable: true,
    balyary: true,
    rarity: 1,
  },
  atom: {
    effect: { armor: 5 },
    image: images.atomImage,
    description: "Атом — даёт +5 брони при использовании.",
    stackable: true,
    rarity: 1,
  },
  medical_certificate: {
    effect: {},
    image: images.medicalCertificateImage,
    description: "Мед. справка МД-07: подтверждает, что ты не зомби.",
    rarity: 5,
  },
  medical_certificate_stamped: {
    effect: {},
    image: images.medicalCertificateStampedImage,
    description: "Мед. справка с печатью заставы. Допуск в Неоновый Город.",
    rarity: 5,
  },
  // ... (добавьте остальные предметы по аналогии, используя images)
};

window.resourceLoader = {
  images,
  imageSources,
  ITEM_CONFIG,
  imagesLoaded,
  totalImages,
};
