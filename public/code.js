let X = 4; //   Глобальная переменная Х - траэктории.
let Y = 0; //   Глобальная переменная У - траэктории.
let MAP = false;
let STEP = 0; //   Щетчик шагов.
let BALUAL = false;
let BALUALHEALT = false;
let ENEMYCOUNT = 0;
let SEAL_1 = false;
let SEAL_2 = false;
let SEAL_3 = false;
let SEAL_1numberRandom = null;
let SEAL_2numberRandom = null;
let SEAL_3numberRandom = null;
let enemyRandom = 0;
let DEALERDEMON = true;
let SCELETBOSS = true;
let BLUEDEMONBOSS = true;
let REDDEMONBOSS = true;
let TOMB = false;
let TOMBTRUE = false;

const openTomb = () => {
  TOMBTRUE = true;
  if (TOMB === true) {
    infoTextBlock.innerText = "Вы заглянули в пустой склеп...";
    heroTextBlock.innerText = "Пусто...";
  } else {
    TOMB = true;
    let randomTomb = Math.round(Math.random() * (10 - 0) + 0);
    if (randomTomb <= 5) {
      let randomTombGold = Math.round(Math.random() * (10 - 0) + 0);
      infoTextBlock.innerText = `Вы нашли в склепе ${randomTombGold} золота!`;
      heroTextBlock.innerText = "Неплохо...";
      hero.gold += randomTombGold;
      gold.innerText = hero.gold;
      return;
    } else if (randomTomb > 5 && randomTomb <= 8) {
      buttonStash.setAttribute("onclick", "");
      heroTextBlock.innerText = "Черт!";
      if (X == 3 && Y == 2 && TOMBTRUE === true) roomArray[X][Y].enemy = 1;
      enemyImg.setAttribute("class", "scelet");
      fight();
      return;
    } else if (randomTomb == 9) {
      let randomTombPoison = Math.round(Math.random() * (10 - 1) + 1);
      infoTextBlock.innerText = `Вы открываете склеп и вдыхаете зараженную могильную пыль. Healt - ${randomTombPoison}`;
      heroTextBlock.innerText = "Проклятье...";
      hero.healt -= randomTombPoison;
      healt.innerText = hero.healt;
      if (hero.healt <= 0) {
        audio.setAttribute("src", "mp3/dead.mp3");
        printHealt.hidden = true;
        printPower.hidden = true;
        printGold.hidden = true;
        healt.hidden = true;
        power.hidden = true;
        gold.hidden = true;
        enemyHead.hidden = true;
        enemyBody.hidden = true;
        enemyLegs.hidden = true;
        enemyHeadText.hidden = true;
        enemyBodyText.hidden = true;
        enemyLegsText.hidden = true;
        enemyHealtText.hidden = true;
        map.hidden = true;
        heroImg.hidden = true;
        heroHead.hidden = true;
        heroBody.hidden = true;
        heroLegs.hidden = true;
        heroHeadText.hidden = true;
        heroBodyText.hidden = true;
        heroLegsText.hidden = true;
        buttonFight.hidden = true;
        buttonFightText.hidden = true;
        goldDustButton.hidden = true;
        healtButtleButton.hidden = true;
        setTimeout(youDied, 6660);
        return;
      }
    } else if (randomTomb == 10) {
      infoTextBlock.innerText =
        "Вы нашли и прочитали свиток знаний о силе! Power + 1";
      heroTextBlock.innerText = "Отлично!";
      hero.power++;
      power.innerText = hero.power;
      return;
    }
  }
  TOMBTRUE = false;
};

const balualHealt = () => {
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  balual.hidden = false;
  balual.setAttribute("class", "balual");
  divBalualText.hidden = false;
  divBalualText.setAttribute("class", "divBalualText");
  balualText.hidden = false;
  balualText.setAttribute("class", "balualText");
  divBalualText.append(balualText);
  balualText.innerText =
    "Ты превзошел все мои ожидания смертный! Я могу смело назвать тебя воином! Твои действия вселяют веру - в то что зло будет повержено! Ты ранен? Сейчас я прочту свиток исцеления - тебе станет лучше! Продолжай искать тайники, атакуй безсмысленных тварей - тебе надо стать сильнее... Найди торговца, но будь с ним осторожен, он один из моих братьев который пал перед пороком алчности... Во дворце есть три комнаты с печатями которые тебе необходимо отыскать и прожать их - они покажут символы для открытия усыпальни. Мои братья скорее всего будут охранять печати - так что будь осторожен!";
  balualTextButtonNext.hidden = false;
  balualTextButtonNext.setAttribute("class", "buttonNext");
  balualTextButtonNext.setAttribute("onclick", "exitBalualText()");
  balualTextButtonNext.innerText = "Далее";
  balualText.append(br);
  balualText.append(balualTextButtonNext);
  if (hero.healt < 100) {
    hero.healt = 100;
    healt.innerText = hero.healt;
    body.append(healt);
  }
  BALUALHEALT = true;
};

const buyArmor = () => {
  if (hero.gold < 100) {
    dealerDemonText.innerText = "Нет денег - нет разговора!";
    heroTextBlock.innerText = "Я бы взял к себе в комманду такого скрягу...";
    infoTextBlock.innerText = "У вас не хватает золота!";
    setTimeout(exitStore, 4000);
  } else {
    infoTextBlock.innerText = "Вы выменяли 100 золота на Кольчугу! Armor + 10";
    heroTextBlock.innerText = "Я чуствую королем... Я лучший!";
    dealerDemonText.innerText = "Продолжаем? Есть монеты?";
    hero.armor += 10;
    hero.gold -= 100;
    armor.innerText = hero.armor;
    gold.innerText = hero.gold;
    printArmor.hidden = false;
    armor.hidden = false;
  }
};

const buyTunic = () => {
  if (hero.gold < 75) {
    dealerDemonText.innerText = "Не пойдет кусок мяса!";
    heroTextBlock.innerText = "В той жизни от тебя и следа не осталось бы...";
    infoTextBlock.innerText = "У вас не хватает золота!";
    setTimeout(exitStore, 4000);
  } else {
    infoTextBlock.innerText = "Вы выменяли 75 золота на Тунику! Armor + 6";
    heroTextBlock.innerText = "Я чуствую себя более уверенее...";
    dealerDemonText.innerText = "Еще? Что-то?";
    hero.armor += 6;
    hero.gold -= 75;
    armor.innerText = hero.armor;
    gold.innerText = hero.gold;
    printArmor.hidden = false;
    armor.hidden = false;
  }
};

const buyChainMail = () => {
  if (hero.gold < 45) {
    dealerDemonText.innerText = "Даже не думай!";
    heroTextBlock.innerText =
      "Жизнь человека, для этого существа - ничего не стоит!";
    infoTextBlock.innerText = "У вас не хватает золота!";
    setTimeout(exitStore, 4000);
  } else {
    infoTextBlock.innerText = "Вы выменяли 45 золота на Кольчугу! Armor + 3";
    heroTextBlock.innerText = "Я чуствую себя уверенее...";
    dealerDemonText.innerText = "Что по золоту в карманах?";
    hero.armor += 3;
    hero.gold -= 45;
    armor.innerText = hero.armor;
    gold.innerText = hero.gold;
    printArmor.hidden = false;
    armor.hidden = false;
  }
};

const buyKnife2 = () => {
  if (hero.gold < 70) {
    dealerDemonText.innerText = "Нет! Нет! Без золота - нет!";
    heroTextBlock.innerText = "Этого уродца интересует только золото...";
    infoTextBlock.innerText = "У вас не хватает золота!";
    setTimeout(exitStore, 4000);
  } else {
    infoTextBlock.innerText =
      "Вы выменяли 70 золота на Серебряный мечь! Power + 25";
    heroTextBlock.innerText = "Я чуствую что стал намного опаснее!";
    dealerDemonText.innerText = "Есть еще золотишко?";
    hero.power += 25;
    hero.gold -= 70;
    power.innerText = hero.power;
    gold.innerText = hero.gold;
  }
};

const buyKnife = () => {
  if (hero.gold < 40) {
    dealerDemonText.innerText = "Пытаешся обмануть? Неполучится!";
    heroTextBlock.innerText =
      "Да... Деньги из прежней жизни здесь роли не играют.";
    infoTextBlock.innerText = "У вас не хватает золота!";
    setTimeout(exitStore, 4000);
  } else {
    infoTextBlock.innerText = "Вы выменяли 40 золота на Ржавый нож! Power + 10";
    heroTextBlock.innerText = "Я чуствую что стал опаснее!";
    dealerDemonText.innerText = "Надеюсь у тебя много золота...";
    hero.power += 10;
    hero.gold -= 40;
    power.innerText = hero.power;
    gold.innerText = hero.gold;
  }
};

const buyHealtButtle = () => {
  if (hero.gold < 5) {
    dealerDemonText.innerText = "Я не вижу золото!";
    heroTextBlock.innerText = "Мои акции здесь - бумага!";
    infoTextBlock.innerText = "У вас не хватает золота!";
    setTimeout(exitStore, 4000);
  } else {
    infoTextBlock.innerText = "Вы выпили большое зелье здоровья. Healt + 15";
    heroTextBlock.innerText = "Я чуствую себя лучше! Это стоило 5 золота... ";
    dealerDemonText.innerText = "Золото! Хорошо!";
    hero.healt += 15;
    hero.gold -= 5;
    healt.innerText = hero.healt;
    gold.innerText = hero.gold;
  }
};

const selectionInStore = () => {
  dealerDemonText.innerText = "Выбирай что тебе нужно и по рукам!";

  yesStore.hidden = true;
  storeImg.hidden = false;
  healtButtleStore.hidden = false;
  knifeStore.hidden = false;
  knifeStore2.hidden = false;
  chainMail.hidden = false;
  tunic.hidden = false;
  armorStore.hidden = false;

  storeImg.setAttribute("class", "storeImg");
  body.append(storeImg);

  healtButtleStore.setAttribute("class", "healtButtleStore");
  healtButtleStore.setAttribute("onclick", "buyHealtButtle()");
  body.append(healtButtleStore);

  knifeStore.setAttribute("class", "knifeStore");
  knifeStore.setAttribute("onclick", "buyKnife()");
  body.append(knifeStore);

  knifeStore2.setAttribute("class", "knifeStore2");
  knifeStore2.setAttribute("onclick", "buyKnife2()");
  body.append(knifeStore2);

  chainMail.setAttribute("class", "chainMail");
  chainMail.setAttribute("onclick", "buyChainMail()");
  body.append(chainMail);

  tunic.setAttribute("class", "tunic");
  tunic.setAttribute("onclick", "buyTunic()");
  body.append(tunic);

  armorStore.setAttribute("class", "armorStore");
  armorStore.setAttribute("onclick", "buyArmor()");
  body.append(armorStore);
};

const exitStore = () => {
  storeImg.hidden = true;
  buttonE.hidden = false;
  buttonN.hidden = false;
  buttonS.hidden = false;
  buttonW.hidden = false;
  divDealerDemonText.hidden = true;
  healtButtleStore.hidden = true;
  knifeStore.hidden = true;
  knifeStore2.hidden = true;
  chainMail.hidden = true;
  tunic.hidden = true;
  armorStore.hidden = true;
  buttonDealerDemon.setAttribute("onclick", "dealerDemon()");
  buttonStash.setAttribute("onclick", "openStash()");
};

const store = () => {
  yesStore.innerText = "Обмен";
  noStore.innerText = "Выход";
  yesStore.setAttribute("class", "yesStore");
  yesStore.setAttribute("onclick", "selectionInStore()");
  noStore.setAttribute("class", "noStore");
  noStore.setAttribute("onclick", "exitStore()");
  divDealerDemonText.append(yesStore);
  divDealerDemonText.append(noStore);
};

const dealerDemon = () => {
  buttonStash.setAttribute("onclick", "");
  buttonDealerDemon.setAttribute("onclick", "");
  if (hero.power < 23) {
    divDealerDemonText.hidden = false;
    divDealerDemonText.setAttribute("class", "divDealerDemonText");
    body.append(divDealerDemonText);
    dealerDemonText.innerText =
      "Что за дохлый червь? Сейчас ты узнаешь что такое первородное зло!";
    dealerDemonText.setAttribute("class", "dealerDemonText");
    divDealerDemonText.append(dealerDemonText);
    DEALERDEMON = false;
    buttonE.hidden = true;
    buttonN.hidden = true;
    buttonS.hidden = true;
    buttonW.hidden = true;
    setTimeout(fight, 6000);
  } else {
    divDealerDemonText.hidden = false;
    divDealerDemonText.setAttribute("class", "divDealerDemonText");
    body.append(divDealerDemonText);
    dealerDemonText.innerText =
      "Незнакомец! Хм... У тебя есть золото? Посмотри что есть у меня! Обмен?";
    dealerDemonText.setAttribute("class", "dealerDemonText");
    divDealerDemonText.append(dealerDemonText);
    yesStore.hidden = false;
    buttonE.hidden = true;
    buttonN.hidden = true;
    buttonS.hidden = true;
    buttonW.hidden = true;
    setTimeout(store, 5000);
  }
};

const dealerDemonOnclick = () => {
  buttonDealerDemon.setAttribute("onclick", "dealerDemon()");
};

const falsePushSeal = () => {
  infoTextBlock.innerText = "";
  heroTextBlock.innerText = "Ничего не происходит...";
  body.append(heroTextBlock);
  return;
};

const pushSeal = () => {
  if (X == 2 && Y == 7) {
    SEAL_1 = true;
    if (SEAL_1 == true) {
      SEAL_1numberRandom = Math.round(Math.random() * (9 - 0) + 0);
      if (SEAL_1numberRandom == 0) {
        sealNumberImg_0.hidden = false;
        sealNumberImg_0.setAttribute("class", "sealNumberImg_0");
      }
      if (SEAL_1numberRandom == 1) {
        sealNumberImg_1.hidden = false;
        sealNumberImg_1.setAttribute("class", "sealNumberImg_1");
      }
      if (SEAL_1numberRandom == 2) {
        sealNumberImg_2.hidden = false;
        sealNumberImg_2.setAttribute("class", "sealNumberImg_2");
      }
      if (SEAL_1numberRandom == 3) {
        sealNumberImg_3.hidden = false;
        sealNumberImg_3.setAttribute("class", "sealNumberImg_3");
      }
      if (SEAL_1numberRandom == 4) {
        sealNumberImg_4.hidden = false;
        sealNumberImg_4.setAttribute("class", "sealNumberImg_4");
      }
      if (SEAL_1numberRandom == 5) {
        sealNumberImg_5.hidden = false;
        sealNumberImg_5.setAttribute("class", "sealNumberImg_5");
      }
      if (SEAL_1numberRandom == 6) {
        sealNumberImg_6.hidden = false;
        sealNumberImg_6.setAttribute("class", "sealNumberImg_6");
      }
      if (SEAL_1numberRandom == 7) {
        sealNumberImg_7.hidden = false;
        sealNumberImg_7.setAttribute("class", "sealNumberImg_7");
      }
      if (SEAL_1numberRandom == 8) {
        sealNumberImg_8.hidden = false;
        sealNumberImg_8.setAttribute("class", "sealNumberImg_8");
      }
      if (SEAL_1numberRandom == 9) {
        sealNumberImg_9.hidden = false;
        sealNumberImg_9.setAttribute("class", "sealNumberImg_9");
      }
    }
  } else if (X == 3 && Y == 12) {
    SEAL_2 = true;
    if (SEAL_2 == true) {
      SEAL_2numberRandom = Math.round(Math.random() * (9 - 0) + 0);
      if (SEAL_2numberRandom == 0) {
        sealNumberImg_0.hidden = false;
        sealNumberImg_0.setAttribute("class", "seal_2NumberImg_0");
      }
      if (SEAL_2numberRandom == 1) {
        sealNumberImg_1.hidden = false;
        sealNumberImg_1.setAttribute("class", "seal_2NumberImg_1");
      }
      if (SEAL_2numberRandom == 2) {
        sealNumberImg_2.hidden = false;
        sealNumberImg_2.setAttribute("class", "seal_2NumberImg_2");
      }
      if (SEAL_2numberRandom == 3) {
        sealNumberImg_3.hidden = false;
        sealNumberImg_3.setAttribute("class", "seal_2NumberImg_3");
      }
      if (SEAL_2numberRandom == 4) {
        sealNumberImg_4.hidden = false;
        sealNumberImg_4.setAttribute("class", "seal_2NumberImg_4");
      }
      if (SEAL_2numberRandom == 5) {
        sealNumberImg_5.hidden = false;
        sealNumberImg_5.setAttribute("class", "seal_2NumberImg_5");
      }
      if (SEAL_2numberRandom == 6) {
        sealNumberImg_6.hidden = false;
        sealNumberImg_6.setAttribute("class", "seal_2NumberImg_6");
      }
      if (SEAL_2numberRandom == 7) {
        sealNumberImg_7.hidden = false;
        sealNumberImg_7.setAttribute("class", "seal_2NumberImg_7");
      }
      if (SEAL_2numberRandom == 8) {
        sealNumberImg_8.hidden = false;
        sealNumberImg_8.setAttribute("class", "seal_2NumberImg_8");
      }
      if (SEAL_2numberRandom == 9) {
        sealNumberImg_9.hidden = false;
        sealNumberImg_9.setAttribute("class", "seal_2NumberImg_9");
      }
    }
  } else if (X == 7 && Y == 12) {
    SEAL_3 = true;
    if (SEAL_3 == true) {
      SEAL_3numberRandom = Math.round(Math.random() * (9 - 0) + 0);
      if (SEAL_3numberRandom == 0) {
        sealNumberImg_0.hidden = false;
        sealNumberImg_0.setAttribute("class", "seal_3NumberImg_0");
      }
      if (SEAL_3numberRandom == 1) {
        sealNumberImg_1.hidden = false;
        sealNumberImg_1.setAttribute("class", "seal_3NumberImg_1");
      }
      if (SEAL_3numberRandom == 2) {
        sealNumberImg_2.hidden = false;
        sealNumberImg_2.setAttribute("class", "seal_3NumberImg_2");
      }
      if (SEAL_3numberRandom == 3) {
        sealNumberImg_3.hidden = false;
        sealNumberImg_3.setAttribute("class", "seal_3NumberImg_3");
      }
      if (SEAL_3numberRandom == 4) {
        sealNumberImg_4.hidden = false;
        sealNumberImg_4.setAttribute("class", "seal_3NumberImg_4");
      }
      if (SEAL_3numberRandom == 5) {
        sealNumberImg_5.hidden = false;
        sealNumberImg_5.setAttribute("class", "seal_3NumberImg_5");
      }
      if (SEAL_3numberRandom == 6) {
        sealNumberImg_6.hidden = false;
        sealNumberImg_6.setAttribute("class", "seal_3NumberImg_6");
      }
      if (SEAL_3numberRandom == 7) {
        sealNumberImg_7.hidden = false;
        sealNumberImg_7.setAttribute("class", "seal_3NumberImg_7");
      }
      if (SEAL_3numberRandom == 8) {
        sealNumberImg_8.hidden = false;
        sealNumberImg_8.setAttribute("class", "seal_3NumberImg_8");
      }
      if (SEAL_3numberRandom == 9) {
        sealNumberImg_9.hidden = false;
        sealNumberImg_9.setAttribute("class", "seal_3NumberImg_9");
      }
    }
  }
  seal_1.setAttribute("onclick", "");
  seal_2.setAttribute("onclick", "");
  seal_3.setAttribute("onclick", "");
  seal_1.setAttribute("class", "pushSeal_1");
  seal_2.setAttribute("class", "pushSeal_2");
  seal_3.setAttribute("class", "pushSeal_3");
  infoTextBlock.innerText = "Скрежет сработавшего миханизма режит вам уши...";
  heroTextBlock.innerText =
    "Вероятно это какой-то символ! Нужно его запомнить...";
  return;
};

const showMap = () => {
  MAP = true;
  mapImage.hidden = false;
  mapButton.hidden = true;
};

const exitBalualText = () => {
  balual.hidden = true;
  divBalualText.hidden = true;
  balualText.hidden = true;
  balualTextButtonNext.hidden = true;
  buttonN.hidden = false;
  buttonS.hidden = false;
  buttonW.hidden = false;
  buttonE.hidden = false;
  infoTextBlock.hidden = false;
  heroTextBlock.hidden = false;
  BALUAL = true;
  buttonStash.hidden = false;
  jugButton.setAttribute("onclick", "startJugButton()");
  buttonStash.setAttribute("onclick", "openStash()");
};

const nextBalualText = () => {
  balualText.innerText =
    "В знак моей благодарности знай, что в каждой комнате у меня был тайник, в нем ты можешь найти золото и воду. Надеюсь они еще целы и помогут тебе! Так же ты можешь найти план моего дворца в комнате отведенную под библиотеку. Тебе следует пройти две комнаты в сторону севера и затем сразу повернуть на восток. Удачи тебе смертный!";
  balualText.append(br);
  balualText.append(balualTextButtonNext);
  balualTextButtonNext.setAttribute("onclick", "exitBalualText()");
};

const startJugButton = () => {
  if (BALUAL === true) {
    infoTextBlock.innerText = "Ничего нет!";
    heroTextBlock.innerText = "Здесь пусто...";
    body.append(heroTextBlock);
    return;
  }

  infoTextBlock.hidden = true;
  heroTextBlock.hidden = true;
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  buttonStash.hidden = true;
  balual.hidden = false;
  divBalualText.hidden = false;
  balualText.hidden = false;
  balualTextButtonNext.hidden = false;

  jugButton.setAttribute("onclick", "");

  balual.setAttribute("class", "balual");

  divBalualText.setAttribute("class", "divBalualText");

  balualText.innerText =
    "Приветствую тебя в моем некогда роскошном дворце! Я Архангел Балуал! Не знаю как ты попал сюда, но я благодарен тебе за свое освобождение! Мои братья хотят вылить на Мир - первородное зло. Они заточили меня в эту амфору, тем временем готовя армию зла в стенах моего великого дворца... Не знаю на сколько далеко они зашли , и каким способом им получается порождать зло. Я не могу противостоять им так как полностью лишен энергии... Это прийдется з делать тебе! Нужно успеть до того как армия достигнет нужного числа демонов, для нападения на ваш Мир, и еще - другого способа для тебя выбраться живим я не вижу...";
  balualText.setAttribute("class", "balualText");
  divBalualText.append(balualText);

  divBalualText.append(br);

  balualTextButtonNext.setAttribute("class", "buttonNext");
  balualTextButtonNext.setAttribute("onclick", "nextBalualText()");
  balualTextButtonNext.innerText = "Далее";
  balualText.append(br);
  balualText.append(balualTextButtonNext);
};

const takeGoldDust = () => {
  infoTextBlock.hidden = false;
  heroTextBlock.hidden = false;
  roomArray[X][Y].goldDust = 0;
  infoTextBlock.innerText = "Gold + 1";
  body.append(infoTextBlock);
  heroTextBlock.innerText = "Возможно мне это пригодится!";
  body.append(heroTextBlock);
  hero.gold++;
  gold.innerText = hero.gold;
  goldDustButton.hidden = true;
};

const drinkHealtButtle = () => {
  let healtOfButtle = Math.round(Math.random() * (10 - 1) + 1);
  infoTextBlock.hidden = false;
  heroTextBlock.hidden = false;
  infoTextBlock.innerText = "Вы нашли зелье здоровья!";
  body.append(infoTextBlock);
  let heroString =
    "Отлично, я чуствую себя на " + healtOfButtle + " процентов лучше!";
  heroTextBlock.innerText = heroString;
  body.append(heroTextBlock);
  hero.healt += healtOfButtle;
  healt.innerText = hero.healt;
  roomArray[X][Y].healtButtle = 0;
  healtButtleButton.hidden = true;
};

const nextRoom = () => {
  buttonE.hidden = false;
  buttonN.hidden = false;
  buttonS.hidden = false;
  buttonW.hidden = false;
  buttonStash.hidden = false;
  map.hidden = false;
  jugButton.setAttribute("onclick", "startJugButton()");
};

const searchDeadEnemy = () => {
  infoTextBlock.innerText = "Вы обыскали останки...";
  heroTextBlock.innerText = "Я нашел " + enemy.gold + " золота!";
  hero.gold += enemy.gold;
  gold.innerText = hero.gold;
  enemy.gold = 0;
  body.append(gold);

  buttonDeadEnemy.hidden = true;
  buttonStash.hidden = false;
  goldDustButton.setAttribute("onclick", "takeGoldDust()");
  healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
  if (SEAL_1 == false) seal_1.setAttribute("onclick", "pushSeal()");
  if (SEAL_2 == false) seal_2.setAttribute("onclick", "pushSeal()");
  if (SEAL_3 == false) seal_3.setAttribute("onclick", "pushSeal()");
  falseSeal.setAttribute("onclick", "falsePushSeal()");
  buttonDealerDemon.setAttribute("onclick", "dealerDemon()");
  buttonTomb.setAttribute("onclick", "openTomb()");
};

const enemyDied = () => {
  let x = X;
  let y = Y;

  buttonN.hidden = false;
  buttonE.hidden = false;
  buttonS.hidden = false;
  buttonW.hidden = false;
  buttonStash.hidden = false;

  hero.power++;
  power.innerText = hero.power;
  body.append(power);

  if (
    (X == 6 && Y == 9 && DEALERDEMON === false) ||
    (X == 2 && Y == 9 && DEALERDEMON === false)
  ) {
    buttonDealerDemon.hidden = true;
    DEALERDEMON = null;
  }
  if (X == 2 && Y == 7 && SCELETBOSS === false) {
    sceletBoss.hidden = true;
  }
  if (X == 7 && Y == 12 && BLUEDEMONBOSS === false) {
    blueDemonBoss.hidden = true;
  }
  if (X == 3 && Y == 12 && REDDEMONBOSS === false) {
    redDemonBoss.hidden = true;
  }

  infoTextBlock.innerText = "Нечто мертво... Power : + 1!";
  enemyRandom = Math.round(Math.random() * (3 - 1) + 1);
  buttonStash.setAttribute("onclick", "openStash()");
  goldDustButton.setAttribute("onclick", "takeGoldDust()");
  healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
  jugButton.setAttribute("onclick", "startJugButton()");
  if (SEAL_1 == false) seal_1.setAttribute("onclick", "pushSeal()");
  if (SEAL_2 == false) seal_2.setAttribute("onclick", "pushSeal()");
  if (SEAL_3 == false) seal_3.setAttribute("onclick", "pushSeal()");
  falseSeal.setAttribute("onclick", "falsePushSeal()");
  buttonDealerDemon.setAttribute("onclick", "dealerDemon()");
  buttonTomb.setAttribute("onclick", "openTomb()");
};

const youDied = () => {
  buttonN.hidden = true;
  buttonW.hidden = true;
  buttonE.hidden = true;
  buttonS.hidden = true;
  youDiedText.hidden = false;
  infoTextBlock.hidden = true;
  heroTextBlock.hidden = true;
  mapImage.hidden = true;
  printArmor.hidden = true;
  armor.hidden = true;
  seal_1.hidden = true;
  seal_2.hidden = true;
  seal_3.hidden = true;
  buttonTomb.hidden = true;
  goldDustButton.setAttribute("onclick", "");
  healtButtleButton.setAttribute("onclick", "");
  jugButton.setAttribute("onclick", "");

  STEP = 0;
  BALUAL = false;
  BALUALHEALT = false;
  MAP = false;
  SEAL_1 = false;
  SEAL_2 = false;
  SEAL_3 = false;
  DEALERDEMON = true;
  SCELETBOSS = true;
  BLUEDEMONBOSS = true;
  REDDEMONBOSS = true;

  hero.healt = 91;
  hero.power = 19;
  hero.gold = 0;

  enemy.healt = 0;
  enemy.power = 0;
  enemy.gold = 0;

  createRoomArray();

  body.style.background = "black";
  youDiedText.innerText = "YOU DIED";
  youDiedText.setAttribute("class", "youDiedText");
  body.append(youDiedText);
  startButton.hidden = false;
  startButton.style.background = "none";

  X = 4;
  Y = 0;
};

const battleLogic = () => {
  let x = X;
  let y = Y;

  let heroHit = 0;
  let heroBlock = 0;
  let heroHitPower = Math.round(Math.random() * (hero.power - 1) + 1);

  let enemyHit = Math.round(Math.random() * (3 - 1) + 1);
  let enemyBlock = Math.round(Math.random() * (3 - 1) + 1);
  let enemyHitPower = Math.round(Math.random() * (enemy.power - 1) + 1);
  if ((X == 6 && Y == 9) || (X == 2 && Y == 9)) {
    enemyHitPower = Math.round(Math.random() * (enemy.power - 9) + 9);
  }

  if (heroHead.checked) heroBlock = 1;
  if (heroBody.checked) heroBlock = 2;
  if (heroLegs.checked) heroBlock = 3;

  if (enemyHead.checked) heroHit = 1;
  if (enemyBody.checked) heroHit = 2;
  if (enemyLegs.checked) heroHit = 3;

  if (heroHit === enemyBlock && heroHit === 1) {
    infoTextBlock.innerText =
      "Вы хотели пробить голову врага, но нечто ушло в сторону!";
    body.append(infoTextBlock);
  }
  if (heroHit === enemyBlock && heroHit === 2) {
    infoTextBlock.innerText = "Вы били в грудь - нечто увернулось!";
    body.append(infoTextBlock);
  }
  if (heroHit === enemyBlock && heroHit === 3) {
    infoTextBlock.innerText =
      "Это мог быть лучший лоу-кик в истории - нечто парирует удар!";
    body.append(infoTextBlock);
  }
  if (heroHit !== enemyBlock && heroHit === 1) {
    infoTextBlock.innerText =
      "Сокрушительный удар в голуву! Нечто : - " + heroHitPower + " hp...";
    body.append(infoTextBlock);
    enemy.healt -= heroHitPower;
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
  }
  if (heroHit !== enemyBlock && heroHit === 2) {
    infoTextBlock.innerText =
      "Резкий рывок и грудная клетка хрустит! Нечто : - " +
      heroHitPower +
      " hp...";
    body.append(infoTextBlock);
    enemy.healt -= heroHitPower;
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
  }
  if (heroHit !== enemyBlock && heroHit === 3) {
    infoTextBlock.innerText =
      "Сокрушительный удар по ногам! Нечто : - " + heroHitPower + " hp...";
    body.append(infoTextBlock);
    enemy.healt -= heroHitPower;
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
  }
  if (enemyHit === heroBlock && enemyHit === 1) {
    heroTextBlock.innerText = "Эта тварь пыталась впится мне в голову!";
    body.append(heroTextBlock);
  }
  if (enemyHit === heroBlock && enemyHit === 2) {
    heroTextBlock.innerText =
      "Фух! Нечисть прыгнула мне в грудь - я успел увернуться!";
    body.append(heroTextBlock);
  }
  if (enemyHit === heroBlock && enemyHit === 3) {
    heroTextBlock.innerText = "Ха! Как ловко убрал ноги!";
    body.append(heroTextBlock);
  }
  if (enemyHit !== heroBlock && enemyHit === 1) {
    let sum = enemyHitPower - hero.armor;
    enemyHitPower -= hero.armor;
    if (enemyHitPower <= 0) {
      infoTextBlock.innerText = "Броня поглотила урон!";
      heroTextBlock.innerText = "Отличная куртка!";
      hero.healt + -sum;
    } else {
      heroTextBlock.innerText =
        "У меня затряслась голова! Герой : - " + enemyHitPower + " hp...";
      body.append(heroTextBlock);
      hero.healt -= enemyHitPower;
      healt.innerText = hero.healt;
      body.append(healt);
    }
  }
  if (enemyHit !== heroBlock && enemyHit === 2) {
    let sum = enemyHitPower - hero.armor;
    enemyHitPower -= hero.armor;
    if (enemyHitPower <= 0) {
      infoTextBlock.innerText = "Нечто не пробило броню.";
      heroTextBlock.innerText = "Хорошее одеяние я приобрел!";
      hero.healt += sum;
    } else
      heroTextBlock.innerText =
        "Нечисть процарапала мне грудь! Герой : - " + enemyHitPower + " hp...";
    body.append(heroTextBlock);
    hero.healt -= enemyHitPower;
    healt.innerText = hero.healt;
    body.append(healt);
  }
  if (enemyHit !== heroBlock && enemyHit === 3) {
    let sum = enemyHitPower - hero.armor;
    enemyHitPower -= hero.armor;
    if (enemyHitPower <= 0) {
      infoTextBlock.innerText = "Бронь спасла от удара!";
      heroTextBlock.innerText = "Хотя цены здешний уродец завышает...";
      hero.healt += sum;
    } else
      heroTextBlock.innerText =
        "Ааа! Тварь вцепилась в ноги! Герой : - " + enemyHitPower + " hp...";
    body.append(heroTextBlock);
    hero.healt -= enemyHitPower;
    healt.innerText = hero.healt;
    body.append(healt);
  }
  if (enemy.healt <= 19) enemyHealtText.style.color = "red";

  if (hero.healt <= 0) {
    audio.setAttribute("src", "mp3/dead.mp3");
    printHealt.hidden = true;
    printPower.hidden = true;
    printGold.hidden = true;
    healt.hidden = true;
    power.hidden = true;
    gold.hidden = true;
    enemyHead.hidden = true;
    enemyBody.hidden = true;
    enemyLegs.hidden = true;
    enemyHeadText.hidden = true;
    enemyBodyText.hidden = true;
    enemyLegsText.hidden = true;
    enemyHealtText.hidden = true;
    map.hidden = true;
    heroImg.hidden = true;
    heroHead.hidden = true;
    heroBody.hidden = true;
    heroLegs.hidden = true;
    heroHeadText.hidden = true;
    heroBodyText.hidden = true;
    heroLegsText.hidden = true;
    buttonFight.hidden = true;
    buttonFightText.hidden = true;
    goldDustButton.hidden = true;
    healtButtleButton.hidden = true;
    setTimeout(youDied, 6660);
    return;
  }

  if (enemy.healt <= 0) {
    heroImg.hidden = true;
    heroHead.hidden = true;
    heroBody.hidden = true;
    heroLegs.hidden = true;
    heroHeadText.hidden = true;
    heroBodyText.hidden = true;
    heroLegsText.hidden = true;
    enemyImg.hidden = true;
    enemyHealtText.hidden = true;
    enemyHead.hidden = true;
    enemyBody.hidden = true;
    enemyLegs.hidden = true;
    enemyHeadText.hidden = true;
    enemyBodyText.hidden = true;
    enemyLegsText.hidden = true;
    buttonFight.hidden = true;
    buttonFightText.hidden = true;
    buttonDeadEnemy.hidden = false;

    if (Y < 13) {
      buttonDeadEnemy.setAttribute("class", "buttonDeadScelet");
    }
    buttonDeadEnemy.setAttribute("onclick", "searchDeadEnemy()");
    body.append(buttonDeadEnemy);

    enemyDied();
    return;
  }

  fight();
};

const createEnemy = () => {
  if (
    (X == 6 && Y == 9 && DEALERDEMON === false) ||
    (X == 2 && Y == 9 && DEALERDEMON === false)
  ) {
    divDealerDemonText.hidden = true;
    dealerDemonText.hidden = true;
    enemyImg.setAttribute("class", "dealerDemonFalse");
    buttonDealerDemon.setAttribute("class", "dealerDemonFalse");
    enemy.healt = 666;
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
    enemy.gold = 0;
    enemy.power = 20;
  } else if (X == 2 && Y == 7 && SCELETBOSS === true) {
    enemyImg.setAttribute("class", "sceletBoss");
    sceletBoss.setAttribute("class", "sceletBoss");
    enemy.healt = 333;
    enemy.power = 66;
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
    enemy.gold = Math.round(Math.random() * (27 - 13) + 13);
    SCELETBOSS = false;
    ENEMYCOUNT++;
  } else if (X == 7 && Y == 12 && BLUEDEMONBOSS === true) {
    enemyImg.setAttribute("class", "blueDemonBoss");
    blueDemonBoss.setAttribute("class", "blueDemonBoss");
    enemy.healt = 666;
    enemy.power = 66;
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
    enemy.gold = Math.round(Math.random() * (50 - 27) + 27);
    BLUEDEMONBOSS = false;
    ENEMYCOUNT++;
  } else if (X == 3 && Y == 12 && REDDEMONBOSS === true) {
    enemyImg.setAttribute("class", "redDemonBoss");
    redDemonBoss.setAttribute("class", "redDemonBoss");
    enemy.healt = 999;
    enemy.power = 66;
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
    enemy.gold = Math.round(Math.random() * (66 - 33) + 33);
    REDDEMONBOSS = false;
    ENEMYCOUNT++;
  } else if (Y < 4) {
    enemy.healt = Math.round(Math.random() * (27 - 11) + 11);
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
    enemy.power = 20;
    enemy.gold = Math.round(Math.random() * (8 - 0) + 0);
    ENEMYCOUNT++;
    if (enemyRandom === 1) {
      enemyImg.setAttribute("class", "scelet1");
    }
    if (enemyRandom === 2) {
      enemyImg.setAttribute("class", "scelet");
    }
    if (enemyRandom === 3) {
      enemyImg.setAttribute("class", "scelet2");
    }
  } else if (Y >= 4) {
    enemyRandom = Math.round(Math.random() * (3 - 0) + 0);
    enemy.healt = Math.round(Math.random() * (40 - 13) + 13);
    enemyHealtText.innerText = enemy.healt;
    body.append(enemyHealtText);
    enemy.power = 27;
    enemy.gold = Math.round(Math.random() * (13 - 0) + 0);
    ENEMYCOUNT++;
    if (enemyRandom === 0) {
      enemyImg.setAttribute("class", "demon");
    }
    if (enemyRandom === 1) {
      enemyImg.setAttribute("class", "demon1");
    }
    if (enemyRandom === 2) {
      enemyImg.setAttribute("class", "demon2");
    }
    if (enemyRandom === 3) {
      enemyImg.setAttribute("class", "demon3");
    }
  }

  if (enemy.healt > 19) enemyHealtText.style.color = "green";
  if (enemy.healt <= 19) enemyHealtText.style.color = "red";

  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  heroImg.hidden = false;
  enemyImg.hidden = false;
  heroHead.hidden = false;
  heroBody.hidden = false;
  heroLegs.hidden = false;
  heroHeadText.hidden = false;
  heroBodyText.hidden = false;
  heroLegsText.hidden = false;
  enemyHead.hidden = false;
  enemyBody.hidden = false;
  enemyLegs.hidden = false;
  enemyHeadText.hidden = false;
  enemyBodyText.hidden = false;
  enemyLegsText.hidden = false;
  buttonFight.hidden = false;
  buttonFightText.hidden = false;
  enemyHealtText.hidden = false;
};

const fight = () => {
  let x = X;
  let y = Y;

  if (roomArray[x][y].enemy > 0) {
    infoTextBlock.innerText =
      "Отходя от тайника вы слышите шорох! Перед вами предстает нечто...";
    if (
      (X == 6 && Y == 9 && DEALERDEMON === false) ||
      (X == 2 && Y == 9 && DEALERDEMON === false) ||
      (X == 2 && Y == 7 && SCELETBOSS === true) ||
      (X == 7 && Y == 12 && BLUEDEMONBOSS === true) ||
      (X == 3 && Y == 12 && REDDEMONBOSS === true)
    ) {
      infoTextBlock.innerText = "";
    } else if (X == 3 && Y == 2 && TOMBTRUE === true) {
      infoTextBlock.innerText =
        "Вы открываете крышку - из склепа вылазит нечто!";
    }

    body.append(infoTextBlock);

    createEnemy();
    roomArray[x][y].enemy = 0;
  }

  body.append(enemyImg);
  enemyHealtText.setAttribute("class", "enemyHealtText");
  enemyHealtText.innerText = enemy.healt;
  body.append(enemyHealtText);

  heroImg.setAttribute("class", "heroImg");
  body.append(heroImg);

  const heroVSmonster = () => {
    heroHead.setAttribute("class", "heroHead");
    heroHead.setAttribute("checked", "checked");
    heroHead.setAttribute("type", "radio");
    heroHead.setAttribute("value", "1");
    heroHead.setAttribute("name", "hero");
    body.append(heroHead);

    heroBody.setAttribute("class", "heroBody");
    heroBody.setAttribute("type", "radio");
    heroBody.setAttribute("value", "2");
    heroBody.setAttribute("name", "hero");
    body.append(heroBody);

    heroLegs.setAttribute("class", "heroLegs");
    heroLegs.setAttribute("type", "radio");
    heroLegs.setAttribute("value", "3");
    heroLegs.setAttribute("name", "hero");
    body.append(heroLegs);

    enemyHead.setAttribute("class", "enemyHead");
    enemyHead.setAttribute("checked", "checked");
    enemyHead.setAttribute("type", "radio");
    enemyHead.setAttribute("value", "1");
    enemyHead.setAttribute("name", "enemy");
    body.append(enemyHead);

    enemyBody.setAttribute("class", "enemyBody");
    enemyBody.setAttribute("type", "radio");
    enemyBody.setAttribute("value", "2");
    enemyBody.setAttribute("name", "enemy");
    body.append(enemyBody);

    enemyLegs.setAttribute("class", "enemyLegs");
    enemyLegs.setAttribute("type", "radio");
    enemyLegs.setAttribute("value", "3");
    enemyLegs.setAttribute("name", "enemy");
    body.append(enemyLegs);

    heroHeadText.innerText = "Прикрить голову";
    heroBodyText.innerText = "Закрыть грудь";
    heroLegsText.innerText = "Блок ног";

    enemyHeadText.innerText = "Удар в голову";
    enemyBodyText.innerText = "Пробить грудь";
    enemyLegsText.innerText = "Прострел по ногам";

    heroHeadText.setAttribute("class", "heroHeadText");
    heroBodyText.setAttribute("class", "heroBodyText");
    heroLegsText.setAttribute("class", "heroLegsText");

    enemyHeadText.setAttribute("class", "enemyHeadText");
    enemyBodyText.setAttribute("class", "enemyBodyText");
    enemyLegsText.setAttribute("class", "enemyLegsText");

    body.append(heroHeadText);
    body.append(heroBodyText);
    body.append(heroLegsText);
    body.append(enemyHeadText);
    body.append(enemyBodyText);
    body.append(enemyLegsText);

    buttonFight.setAttribute("class", "buttonFight");
    buttonFight.setAttribute("type", "submit");
    buttonFight.setAttribute("name", "hero");
    buttonFight.setAttribute("onclick", "battleLogic()");
    body.append(buttonFight);

    buttonFightText.innerText = "Бой!";
    buttonFightText.setAttribute("class", "buttonFightText");
    body.append(buttonFightText);
  };
  setTimeout(heroVSmonster, 2000);
};

const buttonYesFunc = () => {
  //   Функция воды - ответ ДА   >>>>>>>>>
  let x = X;
  let y = Y;

  buttonYes.hidden = true;
  buttonNo.hidden = true;

  if (roomArray[x][y].water == 1 || roomArray[x][y].water == 2) {
    let waterYesStr =
      "В воде которую вы выпили были личинки паразитов :  - " +
      roomArray[x][y].water +
      " здоровья.";
    infoTextBlock.innerText = waterYesStr;
    hero.healt -= roomArray[x][y].water;
    healt.innerText = hero.healt;
    if (hero.healt <= 0) {
      audio.setAttribute("src", "mp3/dead.mp3");
      printHealt.hidden = true;
      printPower.hidden = true;
      printGold.hidden = true;
      healt.hidden = true;
      power.hidden = true;
      gold.hidden = true;
      enemyHead.hidden = true;
      enemyBody.hidden = true;
      enemyLegs.hidden = true;
      enemyHeadText.hidden = true;
      enemyBodyText.hidden = true;
      enemyLegsText.hidden = true;
      enemyHealtText.hidden = true;
      map.hidden = true;
      heroImg.hidden = true;
      heroHead.hidden = true;
      heroBody.hidden = true;
      heroLegs.hidden = true;
      heroHeadText.hidden = true;
      heroBodyText.hidden = true;
      heroLegsText.hidden = true;
      buttonFight.hidden = true;
      buttonFightText.hidden = true;
      goldDustButton.hidden = true;
      healtButtleButton.hidden = true;
      setTimeout(youDied, 6660);
      return;
    }
  } else if (roomArray[x][y].water == 0) {
    infoTextBlock.innerText =
      "Вода которую вы випили, была отравлена! Healt : - 6 hp.";
    hero.healt -= 6;
    healt.innerText = hero.healt;
    if (hero.healt <= 0) {
      audio.setAttribute("src", "mp3/dead.mp3");
      printHealt.hidden = true;
      printPower.hidden = true;
      printGold.hidden = true;
      healt.hidden = true;
      power.hidden = true;
      gold.hidden = true;
      enemyHead.hidden = true;
      enemyBody.hidden = true;
      enemyLegs.hidden = true;
      enemyHeadText.hidden = true;
      enemyBodyText.hidden = true;
      enemyLegsText.hidden = true;
      enemyHealtText.hidden = true;
      map.hidden = true;
      heroImg.hidden = true;
      heroHead.hidden = true;
      heroBody.hidden = true;
      heroLegs.hidden = true;
      heroHeadText.hidden = true;
      heroBodyText.hidden = true;
      heroLegsText.hidden = true;
      buttonFight.hidden = true;
      buttonFightText.hidden = true;
      goldDustButton.hidden = true;
      healtButtleButton.hidden = true;
      setTimeout(youDied, 6660);
      return;
    }
  } else {
    let waterYesStr =
      "Вы испили воды из сосуда и чувствуете прилив сил :  + " +
      roomArray[x][y].water +
      " здоровья.";
    infoTextBlock.innerText = waterYesStr;
    hero.healt += roomArray[x][y].water;
    healt.innerText = hero.healt;
  }
  if (roomArray[x][y].enemy > 0 && Y < 4) {
    enemyRandom = Math.round(Math.random() * (3 - 1) + 1);
    setTimeout(fight, 5000);
  } else if (roomArray[x][y].enemy > 0 && Y >= 4) {
    enemyRandom = Math.round(Math.random() * (3 - 0) + 0);
    setTimeout(fight, 5000);
  }

  if (roomArray[x][y].enemy === 0) {
    buttonE.hidden = false;
    buttonN.hidden = false;
    buttonS.hidden = false;
    buttonW.hidden = false;
    buttonStash.hidden = false;
    goldDustButton.setAttribute("onclick", "takeGoldDust()");
    healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    jugButton.setAttribute("onclick", "startJugButton()");
    if (SEAL_1 == false) seal_1.setAttribute("onclick", "pushSeal()");
    if (SEAL_2 == false) seal_2.setAttribute("onclick", "pushSeal()");
    if (SEAL_3 == false) seal_3.setAttribute("onclick", "pushSeal()");
    falseSeal.setAttribute("onclick", "falsePushSeal()");
    buttonDealerDemon.setAttribute("onclick", "dealerDemon()");
    buttonTomb.setAttribute("onclick", "openTomb()");
  }
}; //   Функция воды - ответ ДА   >>>>>>>>>

const buttonNoFunc = () => {
  //   Функция воды - ответ НЕТ   >>>>>>>>>
  let x = X;
  let y = Y;

  buttonYes.hidden = true;
  buttonNo.hidden = true;
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  buttonStash.hidden = true;
  infoTextBlock.innerText = "Вы вылили жидкость на пол лабиринта ...";

  if (roomArray[x][y].enemy > 0 && Y < 4) {
    enemyRandom = Math.round(Math.random() * (3 - 1) + 1);
    setTimeout(fight, 5000);
  } else if (roomArray[x][y].enemy > 0 && Y >= 4) {
    enemyRandom = Math.round(Math.random() * (3 - 0) + 0);
    setTimeout(fight, 5000);
  }

  if (roomArray[x][y].enemy === 0) {
    buttonE.hidden = false;
    buttonN.hidden = false;
    buttonS.hidden = false;
    buttonW.hidden = false;
    buttonStash.hidden = false;
    goldDustButton.setAttribute("onclick", "takeGoldDust()");
    healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    jugButton.setAttribute("onclick", "startJugButton()");
    if (SEAL_1 == false) seal_1.setAttribute("onclick", "pushSeal()");
    if (SEAL_2 == false) seal_2.setAttribute("onclick", "pushSeal()");
    if (SEAL_3 == false) seal_3.setAttribute("onclick", "pushSeal()");
    falseSeal.setAttribute("onclick", "falsePushSeal()");
    buttonDealerDemon.setAttribute("onclick", "dealerDemon()");
    buttonTomb.setAttribute("onclick", "openTomb()");
  }
}; //   Функция воды - ответ НЕТ   >>>>>>>>>

//   СОЗДАНИЕ DOM ОБЬЕКТОВ   >>>>>>>

let body = document.querySelector("body"); //   Получение тела body.

let audio = document.querySelector("audio"); //   Получение тега аудио.

const userWidth = window.screen.width; //   Ширина экрана пользователя.
const userHeight = window.screen.height; //   Высота экрана пользователя.
const userSizeStr = userWidth + "px " + userHeight + "px"; //   Разширение экрана пользователя (строка).
let startButton = document.querySelector("button"); //   Получение кнопки старта игры.
let heroTextBlock = document.createElement("p"); //   Создание блока с текстом (героя).
let infoTextBlock = document.createElement("p"); //   Создание текста подсказки.
let printGold = document.createElement("p"); //   Создание параграфа под строку.
let printHealt = document.createElement("p"); //   Создание параграфа под строку.
let printPower = document.createElement("p"); //   Создание параграфа под строку.
let printArmor = document.createElement("p");
let gold = document.createElement("p"); //   Создание параграфа под строку.
let healt = document.createElement("p"); //   Создание параграфа под строку.
let power = document.createElement("p"); //   Создание параграфа под строку.
let armor = document.createElement("p");
let map = document.createElement("a"); //   Создание ссылки на карту.
let buttonStash = document.createElement("button");
let buttonN = document.createElement("button"); //   Создание кнопки перехода из комнат.
let buttonE = document.createElement("button"); //   Создание кнопки перехода из комнат.
let buttonS = document.createElement("button"); //   Создание кнопки перехода из комнат.
let buttonW = document.createElement("button"); //   Создание кнопки перехода из комнат.
let buttonYes = document.createElement("button"); //   Создание кнопки выбора воды - ДА.
let buttonNo = document.createElement("button"); //   Создание кнопки выбора воды - НЕТ.
let enemyImg = document.createElement("img");
let enemyHealtText = document.createElement("p");
let heroImg = document.createElement("img");
let heroHead = document.createElement("input");
let heroBody = document.createElement("input");
let heroLegs = document.createElement("input");
let enemyHead = document.createElement("input");
let enemyBody = document.createElement("input");
let enemyLegs = document.createElement("input");
let heroHeadText = document.createElement("p");
let heroBodyText = document.createElement("p");
let heroLegsText = document.createElement("p");
let enemyHeadText = document.createElement("p");
let enemyBodyText = document.createElement("p");
let enemyLegsText = document.createElement("p");
let buttonFight = document.createElement("input");
let buttonFightText = document.createElement("p");
let youDiedText = document.createElement("p");
let buttonDeadEnemy = document.createElement("button");
let healtButtleButton = document.createElement("button");
body.append(healtButtleButton);
let goldDustButton = document.createElement("button");
body.append(goldDustButton);
let jugButton = document.createElement("button");
body.append(jugButton);
let balualText = document.createElement("p");
let balualTextButtonNext = document.createElement("button");
let balual = document.createElement("img");
let divBalualText = document.createElement("div");
let mapImage = document.createElement("img");
let mapButton = document.createElement("button");
let seal_1 = document.createElement("button");
let seal_2 = document.createElement("button");
let seal_3 = document.createElement("button");
let sealNumberImg_0 = document.createElement("img");
let sealNumberImg_1 = document.createElement("img");
let sealNumberImg_2 = document.createElement("img");
let sealNumberImg_3 = document.createElement("img");
let sealNumberImg_4 = document.createElement("img");
let sealNumberImg_5 = document.createElement("img");
let sealNumberImg_6 = document.createElement("img");
let sealNumberImg_7 = document.createElement("img");
let sealNumberImg_8 = document.createElement("img");
let sealNumberImg_9 = document.createElement("img");
let falseSeal = document.createElement("button");
let buttonDealerDemon = document.createElement("button");
let dealerDemonText = document.createElement("p");
let divDealerDemonText = document.createElement("div");
let yesStore = document.createElement("button");
let noStore = document.createElement("button");
let storeImg = document.createElement("button");
let healtButtleStore = document.createElement("button");
let knifeStore = document.createElement("button");
let knifeStore2 = document.createElement("button");
let chainMail = document.createElement("button");
let tunic = document.createElement("button");
let armorStore = document.createElement("button");
let sceletBoss = document.createElement("button");
let blueDemonBoss = document.createElement("button");
let redDemonBoss = document.createElement("button");
let buttonTomb = document.createElement("button");

body.append(mapImage);
body.append(mapButton);
body.append(balual);
body.append(divBalualText);
body.append(seal_1);
body.append(seal_2);
body.append(seal_3);
body.append(sealNumberImg_0);
body.append(sealNumberImg_1);
body.append(sealNumberImg_2);
body.append(sealNumberImg_3);
body.append(sealNumberImg_4);
body.append(sealNumberImg_5);
body.append(sealNumberImg_6);
body.append(sealNumberImg_7);
body.append(sealNumberImg_8);
body.append(sealNumberImg_9);
body.append(falseSeal);
body.append(buttonDealerDemon);
body.append(sceletBoss);
body.append(blueDemonBoss);
body.append(redDemonBoss);
body.append(buttonTomb);

let br = document.createElement("br");
let enemy = new Object();
let hero = new Object();
//   СОЗДАНИЕ DOM ОБЬЕКТОВ   >>>>>>>

sealNumberImg_0.setAttribute("class", "sealNumberImg_0");
sealNumberImg_1.setAttribute("class", "sealNumberImg_1");
sealNumberImg_2.setAttribute("class", "sealNumberImg_2");
sealNumberImg_3.setAttribute("class", "sealNumberImg_3");
sealNumberImg_4.setAttribute("class", "sealNumberImg_4");
sealNumberImg_5.setAttribute("class", "sealNumberImg_5");
sealNumberImg_6.setAttribute("class", "sealNumberImg_6");
sealNumberImg_7.setAttribute("class", "sealNumberImg_7");
sealNumberImg_8.setAttribute("class", "sealNumberImg_8");
sealNumberImg_9.setAttribute("class", "sealNumberImg_9");
falseSeal.setAttribute("onclick", "falsePushSeal()");
buttonDealerDemon.setAttribute("class", "dealerDemon");

sealNumberImg_0.hidden = true;
sealNumberImg_1.hidden = true;
sealNumberImg_2.hidden = true;
sealNumberImg_3.hidden = true;
sealNumberImg_4.hidden = true;
sealNumberImg_5.hidden = true;
sealNumberImg_6.hidden = true;
sealNumberImg_7.hidden = true;
sealNumberImg_8.hidden = true;
sealNumberImg_9.hidden = true;
falseSeal.hidden = true;
buttonDealerDemon.hidden = true;

//   Создание персонажа   >>>>>>>
hero.gold = 999;
hero.power = 9919;
hero.healt = 91;
hero.armor = 0;
//   Создание персонажа   >>>>>>>
//   Создание монстра   >>>>>>>
enemy.healt = 0;
enemy.power = 0;
//   Создание монстра   >>>>>>>

let roomArray = []; //   Создание массива.

const createRoomArray = () => {
  //   Функция создания массива комнат лабиринта   >>>>>>>
  let rows = 8;
  let cols = 13;

  for (let i = 0; i < rows; i++) {
    roomArray[i] = [];
    for (let j = 0; j < cols; j++) {
      roomArray[i][j] = new Object();
      roomArray[i][j].gold = Math.round(Math.random() * (5 - 0) + 0);
      roomArray[i][j].water = Math.round(Math.random() * (9 - 1) + 0);
      roomArray[i][j].enemy = Math.round(Math.random() * (5 - 0) + 0);
      roomArray[i][j].stash = Math.round(Math.random() * (10 - 0) + 0);
      roomArray[i][j].healtButtle = Math.round(Math.random() * (3 - 1) + 1);
      roomArray[i][j].goldDust = Math.round(Math.random() * (1 - 0) + 0);
    }
  }
  roomArray[4][0].stash = 9;
  roomArray[4][0].water = 9;
  roomArray[4][0].enemy = 0;
  roomArray[4][0].healtButtle = 1;
  roomArray[4][0].goldDust = 1;
  roomArray[4][1].goldDust = 1;
  console.dir(roomArray);
}; //   Функция создания массива комнат лабиринта   >>>>>>>
createRoomArray(); //   Вызов функции заполнения массива обьектами комнат.

const openStash = () => {
  //   Функция открытия тайника   >>>>>>>
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  goldDustButton.setAttribute("onclick", "");
  healtButtleButton.setAttribute("onclick", "");
  jugButton.setAttribute("onclick", "");
  seal_1.setAttribute("onclick", "");
  seal_2.setAttribute("onclick", "");
  seal_3.setAttribute("onclick", "");
  heroTextBlock.innerText = "";
  falseSeal.setAttribute("onclick", "");
  buttonDealerDemon.setAttribute("onclick", "");
  buttonTomb.setAttribute("onclick", "");

  let x = X;
  let y = Y;

  if (roomArray[x][y].stash <= 2) {
    infoTextBlock.innerText = " Здесь ничего нет ...";
    buttonE.hidden = false;
    buttonN.hidden = false;
    buttonS.hidden = false;
    buttonW.hidden = false;
    buttonNo.hidden = true;
    buttonYes.hidden = true;
    buttonStash.hidden = false;
    goldDustButton.setAttribute("onclick", "takeGoldDust()");
    healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    jugButton.setAttribute("onclick", "startJugButton()");
    if (SEAL_1 == false) seal_1.setAttribute("onclick", "pushSeal()");
    if (SEAL_2 == false) seal_2.setAttribute("onclick", "pushSeal()");
    if (SEAL_3 == false) seal_3.setAttribute("onclick", "pushSeal()");
    falseSeal.setAttribute("onclick", "falsePushSeal()");
    buttonDealerDemon.setAttribute("onclick", "dealerDemon()");
    buttonTomb.setAttribute("onclick", "openTomb()");
    return;
  }

  roomArray[x][y].stash = 0;

  hero.gold = hero.gold + roomArray[x][y].gold;
  let goldStr =
    "Вы нащупали в полумраке тайник, найдено : " +
    roomArray[x][y].gold +
    " золота ...";
  infoTextBlock.innerText = goldStr;
  gold.innerText = hero.gold;

  const water = () => {
    buttonYes.hidden = false;
    buttonNo.hidden = false;
    if (roomArray[x][y].water !== 0) {
      let waterTextStr = "Вы находите сосуд с водой ... Выпить?";
      infoTextBlock.innerText = waterTextStr;
      buttonYes.setAttribute("class", "buttonYes");
      buttonYes.setAttribute("onclick", "buttonYesFunc()");
      buttonYes.innerText = "Да";
      body.append(buttonYes);

      buttonNo.setAttribute("class", "buttonNo");
      buttonNo.setAttribute("onclick", "buttonNoFunc()");
      buttonNo.innerText = "Нет";
      body.append(buttonNo);
    }
  };
  buttonStash.hidden = true;
  setTimeout(water, 5000);
}; //   Функция открытия тайника   >>>>>>>

const goStrange = () => {
  //   Функция хотьбы прямо   >>>>>>>
  heroTextBlock.innerText = "";
  infoTextBlock.innerText = "";
  let x = X;
  let y = Y;

  buttonStash.hidden = false;

  if (STEP == 0 && roomArray[x][y].stash > 0) {
    heroTextBlock.innerText = " Не спеши, стоит лучше осмотреть эту комнату!";
    return;
  }

  if (Y == 12) {
    infoTextBlock.hidden = false;
    infoTextBlock.innerText = "Стены лабиринта мешают вам пройти!";
    heroTextBlock.innerText = "Я не могу идти дальше ...";
    heroTextBlock.hidden = false;
    return;
  }

  Y++;
  STEP++;

  if (
    (X == 1 && Y == 1) ||
    (X == 3 && Y == 1) ||
    (X == 5 && Y == 1) ||
    (X == 6 && Y == 1) ||
    (X == 1 && Y == 2) ||
    (X == 6 && Y == 2) ||
    (X == 2 && Y == 3) ||
    (X == 3 && Y == 3) ||
    (X == 6 && Y == 3) ||
    (X == 0 && Y == 4) ||
    (X == 2 && Y == 4) ||
    (X == 4 && Y == 4) ||
    (X == 5 && Y == 4) ||
    (X == 6 && Y == 4) ||
    (X == 2 && Y == 5) ||
    (X == 6 && Y == 5) ||
    (X == 2 && Y == 6) ||
    (X == 4 && Y == 6) ||
    (X == 6 && Y == 6) ||
    (X == 3 && Y == 7) ||
    (X == 6 && Y == 7) ||
    (X == 2 && Y == 8) ||
    (X == 6 && Y == 8) ||
    (X == 3 && Y == 9) ||
    (X == 4 && Y == 9) ||
    (X == 1 && Y == 10) ||
    (X == 3 && Y == 10) ||
    (X == 6 && Y == 10) ||
    (X == 1 && Y == 11) ||
    (X == 5 && Y == 11) ||
    (X == 6 && Y == 11) ||
    (X == 2 && Y == 12) ||
    (X == 4 && Y == 12)
  ) {
    infoTextBlock.hidden = false;
    heroTextBlock.hidden = false;
    infoTextBlock.innerText = "Вы не видите куда идти и остаетесь на месте!";
    heroTextBlock.innerText = "Я не могу идти в этом направлении ...";
    Y--;
    return;
  }

  buttonDeadEnemy.hidden = true;
  body.style.background = "black";
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  buttonStash.hidden = true;
  map.hidden = true;
  healtButtleButton.hidden = true;
  goldDustButton.hidden = true;
  jugButton.hidden = true;
  jugButton.setAttribute("onclick", "");
  mapButton.hidden = true;
  seal_1.hidden = true;
  seal_2.hidden = true;
  seal_3.hidden = true;
  sealNumberImg_0.hidden = true;
  sealNumberImg_1.hidden = true;
  sealNumberImg_2.hidden = true;
  sealNumberImg_3.hidden = true;
  sealNumberImg_4.hidden = true;
  sealNumberImg_5.hidden = true;
  sealNumberImg_6.hidden = true;
  sealNumberImg_7.hidden = true;
  sealNumberImg_8.hidden = true;
  sealNumberImg_9.hidden = true;
  falseSeal.hidden = true;
  buttonDealerDemon.hidden = true;
  divDealerDemonText.hidden = true;
  buttonTomb.hidden = true;

  const roomsImg = () => {
    if (X == 4 && Y == 0) {
      body.style.background = "url(rooms/startRoom.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash");
      jugButton.hidden = false;
      mapImage.setAttribute("class", "mapImage40");
    }

    if (X == 4 && Y == 1) {
      body.style.background = "url(rooms/41.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash41");
      mapImage.setAttribute("class", "mapImage41");
    }

    if (X == 3 && Y == 0) {
      body.style.background = "url(rooms/30.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash30");
      mapImage.setAttribute("class", "mapImage30");
    }

    if (X == 5 && Y == 0) {
      body.style.background = "url(rooms/50.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash50");
      mapImage.setAttribute("class", "mapImage50");
    }

    if (X == 4 && Y == 2) {
      body.style.background = "url(rooms/42.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash42");
      mapImage.setAttribute("class", "mapImage42");
    }

    if (X == 2 && Y == 0) {
      body.style.background = "url(rooms/20.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash20");
      mapImage.setAttribute("class", "mapImage20");
    }

    if (X == 1 && Y == 0) {
      body.style.background = "url(rooms/10.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash10");
      mapImage.setAttribute("class", "mapImage10");
    }

    if (X == 6 && Y == 0) {
      body.style.background = "url(rooms/60.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash60");
      mapImage.setAttribute("class", "mapImage60");
    }

    if (X == 2 && Y == 1) {
      body.style.background = "url(rooms/21.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash21");
      mapImage.setAttribute("class", "mapImage21");
    }

    if (X == 3 && Y == 2) {
      body.style.background = "url(rooms/32.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash32");
      mapImage.setAttribute("class", "mapImage32");
      buttonTomb.setAttribute("class", "buttonTomb");
      buttonTomb.setAttribute("onclick", "openTomb()");
      buttonTomb.hidden = false;
    }

    if (X == 2 && Y == 2) {
      body.style.background = "url(rooms/22.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash22");
      mapImage.setAttribute("class", "mapImage22");
    }

    if (X == 5 && Y == 2) {
      body.style.background = "url(rooms/52.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash52");
      mapImage.setAttribute("class", "mapImage52");
      if (MAP === false) {
        mapButton.setAttribute("class", "mapButton");
        mapButton.setAttribute("onclick", "showMap()");
        mapButton.hidden = false;
      }
    }

    if (X == 0 && Y == 0) {
      body.style.background = "url(rooms/00.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash00");
      mapImage.setAttribute("class", "mapImage00");
    }

    if (X == 7 && Y == 0) {
      body.style.background = "url(rooms/70.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash70");
      mapImage.setAttribute("class", "mapImage70");
    }

    if (X == 7 && Y == 1) {
      body.style.background = "url(rooms/71.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash71");
      mapImage.setAttribute("class", "mapImage71");
    }

    if (X == 7 && Y == 2) {
      body.style.background = "url(rooms/72.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash72");
      mapImage.setAttribute("class", "mapImage72");
    }

    if (X == 7 && Y == 3) {
      body.style.background = "url(rooms/73.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash73");
      mapImage.setAttribute("class", "mapImage73");
    }

    if (X == 0 && Y == 1) {
      body.style.background = "url(rooms/01.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash01");
      mapImage.setAttribute("class", "mapImage01");
    }

    if (X == 0 && Y == 2) {
      body.style.background = "url(rooms/02.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash02");
      mapImage.setAttribute("class", "mapImage02");
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
      falseSeal.setAttribute("class", "falseSeal34");
      falseSeal.hidden = false;
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
    }

    if (X == 7 && Y == 6) {
      body.style.background = "url(rooms/76.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash76");
      mapImage.setAttribute("class", "mapImage76");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 5 && Y == 3) {
      body.style.background = "url(rooms/53.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash53");
      mapImage.setAttribute("class", "mapImage53");
    }

    if (X == 4 && Y == 3) {
      body.style.background = "url(rooms/43.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash43");
      mapImage.setAttribute("class", "mapImage43");
    }

    if (X == 0 && Y == 3) {
      body.style.background = "url(rooms/03.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash03");
      mapImage.setAttribute("class", "mapImage03");
    }

    if (X == 1 && Y == 3) {
      body.style.background = "url(rooms/13.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash13");
      mapImage.setAttribute("class", "mapImage13");
    }

    if (X == 1 && Y == 4) {
      body.style.background = "url(rooms/14.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash14");
      mapImage.setAttribute("class", "mapImage14");
    }

    if (X == 7 && Y == 4) {
      body.style.background = "url(rooms/74.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash74");
      mapImage.setAttribute("class", "mapImage74");
    }

    if (X == 7 && Y == 5) {
      body.style.background = "url(rooms/75.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash75");
      mapImage.setAttribute("class", "mapImage75");
    }

    if (X == 7 && Y == 8) {
      body.style.background = "url(rooms/78.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash78");
      mapImage.setAttribute("class", "mapImage78");
    }

    if (X == 7 && Y == 7) {
      body.style.background = "url(rooms/77.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash77");
      mapImage.setAttribute("class", "mapImage77");
    }

    if (X == 0 && Y == 5) {
      body.style.background = "url(rooms/05.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash05");
      mapImage.setAttribute("class", "mapImage05");
    }

    if (X == 1 && Y == 5) {
      body.style.background = "url(rooms/15.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash15");
      mapImage.setAttribute("class", "mapImage15");
    }

    if (X == 0 && Y == 6) {
      body.style.background = "url(rooms/06.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash06");
      mapImage.setAttribute("class", "mapImage06");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 2 && Y == 7) {
      body.style.background = "url(rooms/27.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash27");
      mapImage.setAttribute("class", "mapImage27");
      if (SCELETBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_1 === false) {
        seal_1.setAttribute("class", "seal_1");
        seal_1.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_1 == true) {
        seal_1.setAttribute("class", "pushSeal_1");
      }
      seal_1.hidden = false;
      if (SEAL_1 == true) {
        if (SEAL_1numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "sealNumberImg_0");
        }
        if (SEAL_1numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "sealNumberImg_1");
        }
        if (SEAL_1numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "sealNumberImg_2");
        }
        if (SEAL_1numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "sealNumberImg_3");
        }
        if (SEAL_1numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "sealNumberImg_4");
        }
        if (SEAL_1numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "sealNumberImg_5");
        }
        if (SEAL_1numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "sealNumberImg_6");
        }
        if (SEAL_1numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "sealNumberImg_7");
        }
        if (SEAL_1numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "sealNumberImg_8");
        }
        if (SEAL_1numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "sealNumberImg_9");
        }
      }
    }

    if (X == 1 && Y == 7) {
      body.style.background = "url(rooms/17.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash17");
      mapImage.setAttribute("class", "mapImage17");
    }

    if (X == 0 && Y == 7) {
      body.style.background = "url(rooms/07.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash07");
      mapImage.setAttribute("class", "mapImage07");
    }

    if (X == 7 && Y == 9) {
      body.style.background = "url(rooms/79.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash79");
      mapImage.setAttribute("class", "mapImage79");
    }

    if (X == 0 && Y == 8) {
      body.style.background = "url(rooms/08.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash08");
      mapImage.setAttribute("class", "mapImage08");
    }

    if (X == 1 && Y == 8) {
      body.style.background = "url(rooms/18.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash18");
      mapImage.setAttribute("class", "mapImage18");
    }

    if (X == 0 && Y == 10) {
      body.style.background = "url(rooms/010.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash010");
      mapImage.setAttribute("class", "mapImage010");
    }

    if (X == 0 && Y == 11) {
      body.style.background = "url(rooms/011.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash011");
      mapImage.setAttribute("class", "mapImage011");
    }

    if (X == 0 && Y == 12) {
      body.style.background = "url(rooms/012.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash012");
      mapImage.setAttribute("class", "mapImage012");
      falseSeal.setAttribute("class", "falseSeal");
      falseSeal.hidden = false;
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 7 && Y == 12) {
      body.style.background = "url(rooms/712.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash712");
      mapImage.setAttribute("class", "mapImage712");
      if (BLUEDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_3 === false) {
        seal_3.setAttribute("class", "seal_3");
        seal_3.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_3 == true) {
        seal_3.setAttribute("class", "pushSeal_3");
      }
      seal_3.hidden = false;
      if (SEAL_3 == true) {
        if (SEAL_3numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_3NumberImg_0");
        }
        if (SEAL_3numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_3NumberImg_1");
        }
        if (SEAL_3numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_3NumberImg_2");
        }
        if (SEAL_3numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_3NumberImg_3");
        }
        if (SEAL_3numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_3NumberImg_4");
        }
        if (SEAL_3numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_3NumberImg_5");
        }
        if (SEAL_3numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_3NumberImg_6");
        }
        if (SEAL_3numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_3NumberImg_7");
        }
        if (SEAL_3numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_3NumberImg_8");
        }
        if (SEAL_3numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_3NumberImg_9");
        }
      }
    }

    if (X == 6 && Y == 12) {
      body.style.background = "url(rooms/612.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash612");
      mapImage.setAttribute("class", "mapImage612");
    }

    if (X == 5 && Y == 12) {
      body.style.background = "url(rooms/512.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash512");
      mapImage.setAttribute("class", "mapImage512");
      falseSeal.setAttribute("class", "falseSeal512");
      falseSeal.hidden = false;
    }

    if (X == 7 && Y == 10) {
      body.style.background = "url(rooms/710.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash710");
      mapImage.setAttribute("class", "mapImage710");
    }

    if (X == 7 && Y == 11) {
      body.style.background = "url(rooms/711.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash711");
      mapImage.setAttribute("class", "mapImage711");
    }

    if (X == 0 && Y == 9) {
      body.style.background = "url(rooms/09.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash09");
      mapImage.setAttribute("class", "mapImage09");
    }

    if (X == 1 && Y == 9) {
      body.style.background = "url(rooms/19.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash19");
      mapImage.setAttribute("class", "mapImage19");
    }

    if (X == 2 && Y == 9) {
      body.style.background = "url(rooms/29.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash29");
      mapImage.setAttribute("class", "mapImage29");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 2 && Y == 10) {
      body.style.background = "url(rooms/210.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash210");
      mapImage.setAttribute("class", "mapImage210");
    }

    if (X == 2 && Y == 11) {
      body.style.background = "url(rooms/211.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash211");
      mapImage.setAttribute("class", "mapImage211");
    }

    if (X == 3 && Y == 11) {
      body.style.background = "url(rooms/311.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash311");
      mapImage.setAttribute("class", "mapImage311");
    }

    if (X == 4 && Y == 11) {
      body.style.background = "url(rooms/411.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash411");
      mapImage.setAttribute("class", "mapImage411");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
      if (REDDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_2 === false) {
        seal_2.setAttribute("class", "seal_2");
        seal_2.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_2 == true) {
        seal_2.setAttribute("class", "pushSeal_2");
      }
      seal_2.hidden = false;
      if (SEAL_2 == true) {
        if (SEAL_2numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_2NumberImg_0");
        }
        if (SEAL_2numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_2NumberImg_1");
        }
        if (SEAL_2numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_2NumberImg_2");
        }
        if (SEAL_2numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_2NumberImg_3");
        }
        if (SEAL_2numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_2NumberImg_4");
        }
        if (SEAL_2numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_2NumberImg_5");
        }
        if (SEAL_2numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_2NumberImg_6");
        }
        if (SEAL_2numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_2NumberImg_7");
        }
        if (SEAL_2numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_2NumberImg_8");
        }
        if (SEAL_2numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_2NumberImg_9");
        }
      }
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 5 && Y == 10) {
      body.style.background = "url(rooms/510.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash510");
      mapImage.setAttribute("class", "mapImage510");
    }

    if (X == 4 && Y == 10) {
      body.style.background = "url(rooms/410.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash410");
      mapImage.setAttribute("class", "mapImage410");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
    }

    if (X == 5 && Y == 9) {
      body.style.background = "url(rooms/59.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash59");
      mapImage.setAttribute("class", "mapImage59");
    }

    if (X == 5 && Y == 8) {
      body.style.background = "url(rooms/58.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash58");
      mapImage.setAttribute("class", "mapImage58");
    }

    if (X == 5 && Y == 7) {
      body.style.background = "url(rooms/57.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash57");
      mapImage.setAttribute("class", "mapImage57");
    }

    if (X == 3 && Y == 8) {
      body.style.background = "url(rooms/38.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash38");
      mapImage.setAttribute("class", "mapImage38");
    }

    if (X == 4 && Y == 8) {
      body.style.background = "url(rooms/48.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash48");
      mapImage.setAttribute("class", "mapImage48");
    }

    if (X == 5 && Y == 6) {
      body.style.background = "url(rooms/56.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash56");
      mapImage.setAttribute("class", "mapImage56");
    }

    if (X == 3 && Y == 5) {
      body.style.background = "url(rooms/35.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash35");
      mapImage.setAttribute("class", "mapImage35");
    }

    if (X == 4 && Y == 5) {
      body.style.background = "url(rooms/45.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash45");
      mapImage.setAttribute("class", "mapImage45");
    }

    if (X == 5 && Y == 5) {
      body.style.background = "url(rooms/55.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash55");
      mapImage.setAttribute("class", "mapImage55");
    }

    if (X == 4 && Y == 7) {
      body.style.background = "url(rooms/47.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash47");
      mapImage.setAttribute("class", "mapImage47");
    }

    if (ENEMYCOUNT == 4 && BALUALHEALT === false && BALUAL === true) {
      buttonStash.setAttribute("onclick", "");
      setTimeout(balualHealt, 1501);
    }

    if (roomArray[X][Y].healtButtle === 1 && roomArray[X][Y].stash === 0) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else if (
      roomArray[X][Y].healtButtle === 2 &&
      roomArray[X][Y].stash === 0
    ) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton2");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else {
      healtButtleButton.hidden = true;
    }

    if (roomArray[X][Y].goldDust === 1) {
      goldDustButton.setAttribute("onclick", "takeGoldDust()");
      goldDustButton.hidden = false;
      let randClassGoldDustButton = Math.round(Math.random() * (10 - 1) + 1);
      if (randClassGoldDustButton === 1 || randClassGoldDustButton === 6) {
        goldDustButton.setAttribute("class", "goldDustButton");
      } else if (
        randClassGoldDustButton === 2 ||
        randClassGoldDustButton === 7
      ) {
        goldDustButton.setAttribute("class", "goldDustButton2");
      } else if (
        randClassGoldDustButton === 3 ||
        randClassGoldDustButton === 8
      ) {
        goldDustButton.setAttribute("class", "goldDustButton3");
      } else if (
        randClassGoldDustButton === 4 ||
        randClassGoldDustButton === 9
      ) {
        goldDustButton.setAttribute("class", "goldDustButton4");
      } else if (
        randClassGoldDustButton === 5 ||
        randClassGoldDustButton === 10
      ) {
        goldDustButton.setAttribute("class", "goldDustButton5");
      } else {
        goldDustButton.hidden = true;
      }
    }

    body.style.backgroundSize = userSizeStr;
    if (userWidth < 500) {
      body.style.backgroundSize = "100% 100%";
    }
    setTimeout(nextRoom, 1500);
  };
  setTimeout(roomsImg, 2000);
}; //   Функция хотьбы прямо   >>>>>>>

const goRight = () => {
  //   Функция хотьбы в право   >>>>>>>
  heroTextBlock.innerText = "";
  infoTextBlock.innerText = "";
  let x = X;
  let y = Y;

  buttonStash.hidden = false;

  if (STEP == 0 && roomArray[x][y].stash > 0) {
    heroTextBlock.innerText = " Не спеши, стоит лучше осмотреть эту комнату!";
    return;
  }

  if (X == 7) {
    infoTextBlock.hidden = false;
    heroTextBlock.hidden = false;
    infoTextBlock.innerText = "Стены лабиринта мешают вам пройти!";
    heroTextBlock.innerText = "Я не могу идти дальше ...";
    return;
  }

  X++;
  STEP++;

  if (
    (X == 1 && Y == 1) ||
    (X == 3 && Y == 1) ||
    (X == 5 && Y == 1) ||
    (X == 6 && Y == 1) ||
    (X == 1 && Y == 2) ||
    (X == 6 && Y == 2) ||
    (X == 2 && Y == 3) ||
    (X == 3 && Y == 3) ||
    (X == 6 && Y == 3) ||
    (X == 0 && Y == 4) ||
    (X == 2 && Y == 4) ||
    (X == 4 && Y == 4) ||
    (X == 5 && Y == 4) ||
    (X == 6 && Y == 4) ||
    (X == 2 && Y == 5) ||
    (X == 6 && Y == 5) ||
    (X == 2 && Y == 6) ||
    (X == 4 && Y == 6) ||
    (X == 6 && Y == 6) ||
    (X == 3 && Y == 7) ||
    (X == 6 && Y == 7) ||
    (X == 2 && Y == 8) ||
    (X == 6 && Y == 8) ||
    (X == 3 && Y == 9) ||
    (X == 4 && Y == 9) ||
    (X == 1 && Y == 10) ||
    (X == 3 && Y == 10) ||
    (X == 6 && Y == 10) ||
    (X == 1 && Y == 11) ||
    (X == 5 && Y == 11) ||
    (X == 6 && Y == 11) ||
    (X == 2 && Y == 12) ||
    (X == 4 && Y == 12)
  ) {
    infoTextBlock.hidden = false;
    heroTextBlock.hidden = false;
    infoTextBlock.innerText = "Вы не видите куда идти и остаетесь на месте!";
    heroTextBlock.innerText = "Я не могу идти в этом направлении ...";
    X--;
    return;
  }

  buttonDeadEnemy.hidden = true;
  body.style.background = "black";
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  buttonStash.hidden = true;
  map.hidden = true;
  healtButtleButton.hidden = true;
  goldDustButton.hidden = true;
  jugButton.hidden = true;
  jugButton.setAttribute("onclick", "");
  mapButton.hidden = true;
  seal_1.hidden = true;
  seal_2.hidden = true;
  seal_3.hidden = true;
  sealNumberImg_0.hidden = true;
  sealNumberImg_1.hidden = true;
  sealNumberImg_2.hidden = true;
  sealNumberImg_3.hidden = true;
  sealNumberImg_4.hidden = true;
  sealNumberImg_5.hidden = true;
  sealNumberImg_6.hidden = true;
  sealNumberImg_7.hidden = true;
  sealNumberImg_8.hidden = true;
  sealNumberImg_9.hidden = true;
  falseSeal.hidden = true;
  buttonDealerDemon.hidden = true;
  divDealerDemonText.hidden = true;
  buttonTomb.hidden = true;

  const roomsImg = () => {
    if (X == 4 && Y == 0) {
      body.style.background = "url(rooms/startRoom.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash");
      jugButton.hidden = false;
      mapImage.setAttribute("class", "mapImage40");
    }

    if (X == 4 && Y == 1) {
      body.style.background = "url(rooms/41.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash41");
      mapImage.setAttribute("class", "mapImage41");
    }

    if (X == 3 && Y == 0) {
      body.style.background = "url(rooms/30.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash30");
      mapImage.setAttribute("class", "mapImage30");
    }

    if (X == 5 && Y == 0) {
      body.style.background = "url(rooms/50.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash50");
      mapImage.setAttribute("class", "mapImage50");
    }

    if (X == 4 && Y == 2) {
      body.style.background = "url(rooms/42.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash42");
      mapImage.setAttribute("class", "mapImage42");
    }

    if (X == 2 && Y == 0) {
      body.style.background = "url(rooms/20.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash20");
      mapImage.setAttribute("class", "mapImage20");
    }

    if (X == 1 && Y == 0) {
      body.style.background = "url(rooms/10.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash10");
      mapImage.setAttribute("class", "mapImage10");
    }

    if (X == 6 && Y == 0) {
      body.style.background = "url(rooms/60.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash60");
      mapImage.setAttribute("class", "mapImage60");
    }

    if (X == 2 && Y == 1) {
      body.style.background = "url(rooms/21.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash21");
      mapImage.setAttribute("class", "mapImage21");
    }

    if (X == 3 && Y == 2) {
      body.style.background = "url(rooms/32.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash32");
      mapImage.setAttribute("class", "mapImage32");
      buttonTomb.setAttribute("class", "buttonTomb");
      buttonTomb.setAttribute("onclick", "openTomb()");
      buttonTomb.hidden = false;
    }

    if (X == 2 && Y == 2) {
      body.style.background = "url(rooms/22.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash22");
      mapImage.setAttribute("class", "mapImage22");
    }

    if (X == 5 && Y == 2) {
      body.style.background = "url(rooms/52.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash52");
      mapImage.setAttribute("class", "mapImage52");
      if (MAP === false) {
        mapButton.setAttribute("class", "mapButton");
        mapButton.setAttribute("onclick", "showMap()");
        mapButton.hidden = false;
      }
    }

    if (X == 0 && Y == 0) {
      body.style.background = "url(rooms/00.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash00");
      mapImage.setAttribute("class", "mapImage00");
    }

    if (X == 7 && Y == 0) {
      body.style.background = "url(rooms/70.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash70");
      mapImage.setAttribute("class", "mapImage70");
    }

    if (X == 7 && Y == 1) {
      body.style.background = "url(rooms/71.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash71");
      mapImage.setAttribute("class", "mapImage71");
    }

    if (X == 7 && Y == 2) {
      body.style.background = "url(rooms/72.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash72");
      mapImage.setAttribute("class", "mapImage72");
    }

    if (X == 7 && Y == 3) {
      body.style.background = "url(rooms/73.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash73");
      mapImage.setAttribute("class", "mapImage73");
    }

    if (X == 0 && Y == 1) {
      body.style.background = "url(rooms/01.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash01");
      mapImage.setAttribute("class", "mapImage01");
    }

    if (X == 0 && Y == 2) {
      body.style.background = "url(rooms/02.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash02");
      mapImage.setAttribute("class", "mapImage02");
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
      falseSeal.setAttribute("class", "falseSeal34");
      falseSeal.hidden = false;
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
    }

    if (X == 7 && Y == 6) {
      body.style.background = "url(rooms/76.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash76");
      mapImage.setAttribute("class", "mapImage76");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 5 && Y == 3) {
      body.style.background = "url(rooms/53.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash53");
      mapImage.setAttribute("class", "mapImage53");
    }

    if (X == 4 && Y == 3) {
      body.style.background = "url(rooms/43.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash43");
      mapImage.setAttribute("class", "mapImage43");
    }

    if (X == 0 && Y == 3) {
      body.style.background = "url(rooms/03.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash03");
      mapImage.setAttribute("class", "mapImage03");
    }

    if (X == 1 && Y == 3) {
      body.style.background = "url(rooms/13.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash13");
      mapImage.setAttribute("class", "mapImage13");
    }

    if (X == 1 && Y == 4) {
      body.style.background = "url(rooms/14.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash14");
      mapImage.setAttribute("class", "mapImage14");
    }

    if (X == 7 && Y == 4) {
      body.style.background = "url(rooms/74.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash74");
      mapImage.setAttribute("class", "mapImage74");
    }

    if (X == 7 && Y == 5) {
      body.style.background = "url(rooms/75.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash75");
      mapImage.setAttribute("class", "mapImage75");
    }

    if (X == 7 && Y == 8) {
      body.style.background = "url(rooms/78.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash78");
      mapImage.setAttribute("class", "mapImage78");
    }

    if (X == 7 && Y == 7) {
      body.style.background = "url(rooms/77.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash77");
      mapImage.setAttribute("class", "mapImage77");
    }

    if (X == 0 && Y == 5) {
      body.style.background = "url(rooms/05.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash05");
      mapImage.setAttribute("class", "mapImage05");
    }

    if (X == 1 && Y == 5) {
      body.style.background = "url(rooms/15.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash15");
      mapImage.setAttribute("class", "mapImage15");
    }

    if (X == 0 && Y == 6) {
      body.style.background = "url(rooms/06.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash06");
      mapImage.setAttribute("class", "mapImage06");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 2 && Y == 7) {
      body.style.background = "url(rooms/27.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash27");
      mapImage.setAttribute("class", "mapImage27");
      if (SCELETBOSS === true) {
        sceletBoss.setAttribute("class", "sceletBoss");
        body.append(sceletBoss);
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_1 === false) {
        seal_1.setAttribute("class", "seal_1");
        seal_1.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_1 == true) {
        seal_1.setAttribute("class", "pushSeal_1");
      }
      seal_1.hidden = false;
      if (SEAL_1 == true) {
        if (SEAL_1numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "sealNumberImg_0");
        }
        if (SEAL_1numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "sealNumberImg_1");
        }
        if (SEAL_1numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "sealNumberImg_2");
        }
        if (SEAL_1numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "sealNumberImg_3");
        }
        if (SEAL_1numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "sealNumberImg_4");
        }
        if (SEAL_1numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "sealNumberImg_5");
        }
        if (SEAL_1numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "sealNumberImg_6");
        }
        if (SEAL_1numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "sealNumberImg_7");
        }
        if (SEAL_1numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "sealNumberImg_8");
        }
        if (SEAL_1numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "sealNumberImg_9");
        }
      }
    }

    if (X == 1 && Y == 7) {
      body.style.background = "url(rooms/17.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash17");
      mapImage.setAttribute("class", "mapImage17");
    }

    if (X == 0 && Y == 7) {
      body.style.background = "url(rooms/07.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash07");
      mapImage.setAttribute("class", "mapImage07");
    }

    if (X == 7 && Y == 9) {
      body.style.background = "url(rooms/79.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash79");
      mapImage.setAttribute("class", "mapImage79");
    }

    if (X == 0 && Y == 8) {
      body.style.background = "url(rooms/08.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash08");
      mapImage.setAttribute("class", "mapImage08");
    }

    if (X == 1 && Y == 8) {
      body.style.background = "url(rooms/18.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash18");
      mapImage.setAttribute("class", "mapImage18");
    }

    if (X == 0 && Y == 10) {
      body.style.background = "url(rooms/010.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash010");
      mapImage.setAttribute("class", "mapImage010");
    }

    if (X == 0 && Y == 11) {
      body.style.background = "url(rooms/011.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash011");
      mapImage.setAttribute("class", "mapImage011");
    }

    if (X == 0 && Y == 12) {
      body.style.background = "url(rooms/012.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash012");
      mapImage.setAttribute("class", "mapImage012");
      falseSeal.setAttribute("class", "falseSeal");
      falseSeal.hidden = false;
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 7 && Y == 12) {
      body.style.background = "url(rooms/712.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash712");
      mapImage.setAttribute("class", "mapImage712");
      if (BLUEDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_3 === false) {
        seal_3.setAttribute("class", "seal_3");
        seal_3.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_3 == true) {
        seal_3.setAttribute("class", "pushSeal_3");
      }
      seal_3.hidden = false;
      if (SEAL_3 == true) {
        if (SEAL_3numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_3NumberImg_0");
        }
        if (SEAL_3numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_3NumberImg_1");
        }
        if (SEAL_3numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_3NumberImg_2");
        }
        if (SEAL_3numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_3NumberImg_3");
        }
        if (SEAL_3numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_3NumberImg_4");
        }
        if (SEAL_3numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_3NumberImg_5");
        }
        if (SEAL_3numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_3NumberImg_6");
        }
        if (SEAL_3numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_3NumberImg_7");
        }
        if (SEAL_3numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_3NumberImg_8");
        }
        if (SEAL_3numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_3NumberImg_9");
        }
      }
    }

    if (X == 6 && Y == 12) {
      body.style.background = "url(rooms/612.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash612");
      mapImage.setAttribute("class", "mapImage612");
    }

    if (X == 5 && Y == 12) {
      body.style.background = "url(rooms/512.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash512");
      mapImage.setAttribute("class", "mapImage512");
      falseSeal.setAttribute("class", "falseSeal512");
      falseSeal.hidden = false;
    }

    if (X == 7 && Y == 10) {
      body.style.background = "url(rooms/710.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash710");
      mapImage.setAttribute("class", "mapImage710");
    }

    if (X == 7 && Y == 11) {
      body.style.background = "url(rooms/711.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash711");
      mapImage.setAttribute("class", "mapImage711");
    }

    if (X == 0 && Y == 9) {
      body.style.background = "url(rooms/09.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash09");
      mapImage.setAttribute("class", "mapImage09");
    }

    if (X == 1 && Y == 9) {
      body.style.background = "url(rooms/19.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash19");
      mapImage.setAttribute("class", "mapImage19");
    }

    if (X == 2 && Y == 9) {
      body.style.background = "url(rooms/29.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash29");
      mapImage.setAttribute("class", "mapImage29");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 2 && Y == 10) {
      body.style.background = "url(rooms/210.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash210");
      mapImage.setAttribute("class", "mapImage210");
    }

    if (X == 2 && Y == 11) {
      body.style.background = "url(rooms/211.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash211");
      mapImage.setAttribute("class", "mapImage211");
    }

    if (X == 3 && Y == 11) {
      body.style.background = "url(rooms/311.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash311");
      mapImage.setAttribute("class", "mapImage311");
    }

    if (X == 4 && Y == 11) {
      body.style.background = "url(rooms/411.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash411");
      mapImage.setAttribute("class", "mapImage411");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
      if (REDDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_2 === false) {
        seal_2.setAttribute("class", "seal_2");
        seal_2.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_2 == true) {
        seal_2.setAttribute("class", "pushSeal_2");
      }
      seal_2.hidden = false;
      if (SEAL_2 == true) {
        if (SEAL_2numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_2NumberImg_0");
        }
        if (SEAL_2numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_2NumberImg_1");
        }
        if (SEAL_2numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_2NumberImg_2");
        }
        if (SEAL_2numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_2NumberImg_3");
        }
        if (SEAL_2numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_2NumberImg_4");
        }
        if (SEAL_2numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_2NumberImg_5");
        }
        if (SEAL_2numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_2NumberImg_6");
        }
        if (SEAL_2numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_2NumberImg_7");
        }
        if (SEAL_2numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_2NumberImg_8");
        }
        if (SEAL_2numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_2NumberImg_9");
        }
      }
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 5 && Y == 10) {
      body.style.background = "url(rooms/510.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash510");
      mapImage.setAttribute("class", "mapImage510");
    }

    if (X == 4 && Y == 10) {
      body.style.background = "url(rooms/410.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash410");
      mapImage.setAttribute("class", "mapImage410");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
    }

    if (X == 5 && Y == 9) {
      body.style.background = "url(rooms/59.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash59");
      mapImage.setAttribute("class", "mapImage59");
    }

    if (X == 5 && Y == 8) {
      body.style.background = "url(rooms/58.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash58");
      mapImage.setAttribute("class", "mapImage58");
    }

    if (X == 5 && Y == 7) {
      body.style.background = "url(rooms/57.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash57");
      mapImage.setAttribute("class", "mapImage57");
    }

    if (X == 3 && Y == 8) {
      body.style.background = "url(rooms/38.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash38");
      mapImage.setAttribute("class", "mapImage38");
    }

    if (X == 4 && Y == 8) {
      body.style.background = "url(rooms/48.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash48");
      mapImage.setAttribute("class", "mapImage48");
    }

    if (X == 5 && Y == 6) {
      body.style.background = "url(rooms/56.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash56");
      mapImage.setAttribute("class", "mapImage56");
    }

    if (X == 3 && Y == 5) {
      body.style.background = "url(rooms/35.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash35");
      mapImage.setAttribute("class", "mapImage35");
    }

    if (X == 4 && Y == 5) {
      body.style.background = "url(rooms/45.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash45");
      mapImage.setAttribute("class", "mapImage45");
    }

    if (X == 5 && Y == 5) {
      body.style.background = "url(rooms/55.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash55");
      mapImage.setAttribute("class", "mapImage55");
    }

    if (X == 4 && Y == 7) {
      body.style.background = "url(rooms/47.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash47");
      mapImage.setAttribute("class", "mapImage47");
    }

    if (ENEMYCOUNT == 4 && BALUALHEALT === false && BALUAL === true) {
      buttonStash.setAttribute("onclick", "");
      setTimeout(balualHealt, 1501);
    }

    if (roomArray[X][Y].healtButtle === 1 && roomArray[X][Y].stash === 0) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else if (
      roomArray[X][Y].healtButtle === 2 &&
      roomArray[X][Y].stash === 0
    ) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton2");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else {
      healtButtleButton.hidden = true;
    }

    if (roomArray[X][Y].goldDust === 1) {
      goldDustButton.setAttribute("onclick", "takeGoldDust()");
      goldDustButton.hidden = false;
      let randClassGoldDustButton = Math.round(Math.random() * (10 - 1) + 1);
      if (randClassGoldDustButton === 1 || randClassGoldDustButton === 6) {
        goldDustButton.setAttribute("class", "goldDustButton");
      } else if (
        randClassGoldDustButton === 2 ||
        randClassGoldDustButton === 7
      ) {
        goldDustButton.setAttribute("class", "goldDustButton2");
      } else if (
        randClassGoldDustButton === 3 ||
        randClassGoldDustButton === 8
      ) {
        goldDustButton.setAttribute("class", "goldDustButton3");
      } else if (
        randClassGoldDustButton === 4 ||
        randClassGoldDustButton === 9
      ) {
        goldDustButton.setAttribute("class", "goldDustButton4");
      } else if (
        randClassGoldDustButton === 5 ||
        randClassGoldDustButton === 10
      ) {
        goldDustButton.setAttribute("class", "goldDustButton5");
      } else {
        goldDustButton.hidden = true;
      }
    }

    body.style.backgroundSize = userSizeStr;
    if (userWidth < 500) {
      body.style.backgroundSize = "100% 100%";
    }
    setTimeout(nextRoom, 1500);
  };
  setTimeout(roomsImg, 2000);
}; //   Функция хотьбы в право   >>>>>>>

const goDown = () => {
  //   Функция хотьбы назад   >>>>>>>
  heroTextBlock.innerText = "";
  infoTextBlock.innerText = "";
  let x = X;
  let y = Y;

  buttonStash.hidden = false;

  if (STEP == 0 && roomArray[x][y].stash > 0) {
    heroTextBlock.innerText = " Не спеши, стоит лучше осмотреть эту комнату!";
    return;
  }

  if (Y == 0) {
    infoTextBlock.innerText = "Стены лабиринта мешают вам пройти!";
    heroTextBlock.innerText = "Я не могу идти дальше ...";
    heroTextBlock.hidden = false;
    infoTextBlock.hidden = false;
    return;
  }

  Y--;
  STEP++;

  if (
    (X == 1 && Y == 1) ||
    (X == 3 && Y == 1) ||
    (X == 5 && Y == 1) ||
    (X == 6 && Y == 1) ||
    (X == 1 && Y == 2) ||
    (X == 6 && Y == 2) ||
    (X == 2 && Y == 3) ||
    (X == 3 && Y == 3) ||
    (X == 6 && Y == 3) ||
    (X == 0 && Y == 4) ||
    (X == 2 && Y == 4) ||
    (X == 4 && Y == 4) ||
    (X == 5 && Y == 4) ||
    (X == 6 && Y == 4) ||
    (X == 2 && Y == 5) ||
    (X == 6 && Y == 5) ||
    (X == 2 && Y == 6) ||
    (X == 4 && Y == 6) ||
    (X == 6 && Y == 6) ||
    (X == 3 && Y == 7) ||
    (X == 6 && Y == 7) ||
    (X == 2 && Y == 8) ||
    (X == 6 && Y == 8) ||
    (X == 3 && Y == 9) ||
    (X == 4 && Y == 9) ||
    (X == 1 && Y == 10) ||
    (X == 3 && Y == 10) ||
    (X == 6 && Y == 10) ||
    (X == 1 && Y == 11) ||
    (X == 5 && Y == 11) ||
    (X == 6 && Y == 11) ||
    (X == 2 && Y == 12) ||
    (X == 4 && Y == 12)
  ) {
    infoTextBlock.hidden = false;
    heroTextBlock.hidden = false;
    infoTextBlock.innerText = "Вы не видите куда идти и остаетесь на месте!";
    heroTextBlock.innerText = "Я не могу идти в этом направлении ...";
    Y++;
    return;
  }

  buttonDeadEnemy.hidden = true;
  body.style.background = "black";
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  buttonStash.hidden = true;
  map.hidden = true;
  healtButtleButton.hidden = true;
  goldDustButton.hidden = true;
  jugButton.hidden = true;
  jugButton.setAttribute("onclick", "");
  mapButton.hidden = true;
  seal_1.hidden = true;
  seal_2.hidden = true;
  seal_3.hidden = true;
  sealNumberImg_0.hidden = true;
  sealNumberImg_1.hidden = true;
  sealNumberImg_2.hidden = true;
  sealNumberImg_3.hidden = true;
  sealNumberImg_4.hidden = true;
  sealNumberImg_5.hidden = true;
  sealNumberImg_6.hidden = true;
  sealNumberImg_7.hidden = true;
  sealNumberImg_8.hidden = true;
  sealNumberImg_9.hidden = true;
  falseSeal.hidden = true;
  buttonDealerDemon.hidden = true;
  divDealerDemonText.hidden = true;
  buttonTomb.hidden = true;

  const roomsImg = () => {
    if (X == 4 && Y == 0) {
      body.style.background = "url(rooms/startRoom.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash");
      jugButton.hidden = false;
      mapImage.setAttribute("class", "mapImage40");
    }

    if (X == 4 && Y == 1) {
      body.style.background = "url(rooms/41.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash41");
      mapImage.setAttribute("class", "mapImage41");
    }

    if (X == 3 && Y == 0) {
      body.style.background = "url(rooms/30.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash30");
      mapImage.setAttribute("class", "mapImage30");
    }

    if (X == 5 && Y == 0) {
      body.style.background = "url(rooms/50.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash50");
      mapImage.setAttribute("class", "mapImage50");
    }

    if (X == 4 && Y == 2) {
      body.style.background = "url(rooms/42.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash42");
      mapImage.setAttribute("class", "mapImage42");
    }

    if (X == 2 && Y == 0) {
      body.style.background = "url(rooms/20.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash20");
      mapImage.setAttribute("class", "mapImage20");
    }

    if (X == 1 && Y == 0) {
      body.style.background = "url(rooms/10.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash10");
      mapImage.setAttribute("class", "mapImage10");
    }

    if (X == 6 && Y == 0) {
      body.style.background = "url(rooms/60.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash60");
      mapImage.setAttribute("class", "mapImage60");
    }

    if (X == 2 && Y == 1) {
      body.style.background = "url(rooms/21.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash21");
      mapImage.setAttribute("class", "mapImage21");
    }

    if (X == 3 && Y == 2) {
      body.style.background = "url(rooms/32.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash32");
      mapImage.setAttribute("class", "mapImage32");
      buttonTomb.setAttribute("class", "buttonTomb");
      buttonTomb.setAttribute("onclick", "openTomb()");
      buttonTomb.hidden = false;
    }

    if (X == 2 && Y == 2) {
      body.style.background = "url(rooms/22.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash22");
      mapImage.setAttribute("class", "mapImage22");
    }

    if (X == 5 && Y == 2) {
      body.style.background = "url(rooms/52.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash52");
      mapImage.setAttribute("class", "mapImage52");
      if (MAP === false) {
        mapButton.setAttribute("class", "mapButton");
        mapButton.setAttribute("onclick", "showMap()");
        mapButton.hidden = false;
      }
    }

    if (X == 0 && Y == 0) {
      body.style.background = "url(rooms/00.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash00");
      mapImage.setAttribute("class", "mapImage00");
    }

    if (X == 7 && Y == 0) {
      body.style.background = "url(rooms/70.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash70");
      mapImage.setAttribute("class", "mapImage70");
    }

    if (X == 7 && Y == 1) {
      body.style.background = "url(rooms/71.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash71");
      mapImage.setAttribute("class", "mapImage71");
    }

    if (X == 7 && Y == 2) {
      body.style.background = "url(rooms/72.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash72");
      mapImage.setAttribute("class", "mapImage72");
    }

    if (X == 7 && Y == 3) {
      body.style.background = "url(rooms/73.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash73");
      mapImage.setAttribute("class", "mapImage73");
    }

    if (X == 0 && Y == 1) {
      body.style.background = "url(rooms/01.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash01");
      mapImage.setAttribute("class", "mapImage01");
    }

    if (X == 0 && Y == 2) {
      body.style.background = "url(rooms/02.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash02");
      mapImage.setAttribute("class", "mapImage02");
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
      falseSeal.setAttribute("class", "falseSeal34");
      falseSeal.hidden = false;
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
    }

    if (X == 7 && Y == 6) {
      body.style.background = "url(rooms/76.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash76");
      mapImage.setAttribute("class", "mapImage76");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 5 && Y == 3) {
      body.style.background = "url(rooms/53.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash53");
      mapImage.setAttribute("class", "mapImage53");
    }

    if (X == 4 && Y == 3) {
      body.style.background = "url(rooms/43.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash43");
      mapImage.setAttribute("class", "mapImage43");
    }

    if (X == 0 && Y == 3) {
      body.style.background = "url(rooms/03.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash03");
      mapImage.setAttribute("class", "mapImage03");
    }

    if (X == 1 && Y == 3) {
      body.style.background = "url(rooms/13.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash13");
      mapImage.setAttribute("class", "mapImage13");
    }

    if (X == 1 && Y == 4) {
      body.style.background = "url(rooms/14.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash14");
      mapImage.setAttribute("class", "mapImage14");
    }

    if (X == 7 && Y == 4) {
      body.style.background = "url(rooms/74.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash74");
      mapImage.setAttribute("class", "mapImage74");
    }

    if (X == 7 && Y == 5) {
      body.style.background = "url(rooms/75.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash75");
      mapImage.setAttribute("class", "mapImage75");
    }

    if (X == 7 && Y == 8) {
      body.style.background = "url(rooms/78.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash78");
      mapImage.setAttribute("class", "mapImage78");
    }

    if (X == 7 && Y == 7) {
      body.style.background = "url(rooms/77.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash77");
      mapImage.setAttribute("class", "mapImage77");
    }

    if (X == 0 && Y == 5) {
      body.style.background = "url(rooms/05.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash05");
      mapImage.setAttribute("class", "mapImage05");
    }

    if (X == 1 && Y == 5) {
      body.style.background = "url(rooms/15.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash15");
      mapImage.setAttribute("class", "mapImage15");
    }

    if (X == 0 && Y == 6) {
      body.style.background = "url(rooms/06.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash06");
      mapImage.setAttribute("class", "mapImage06");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 2 && Y == 7) {
      body.style.background = "url(rooms/27.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash27");
      mapImage.setAttribute("class", "mapImage27");
      if (SCELETBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_1 === false) {
        seal_1.setAttribute("class", "seal_1");
        seal_1.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_1 == true) {
        seal_1.setAttribute("class", "pushSeal_1");
      }
      seal_1.hidden = false;
      if (SEAL_1 == true) {
        if (SEAL_1numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "sealNumberImg_0");
        }
        if (SEAL_1numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "sealNumberImg_1");
        }
        if (SEAL_1numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "sealNumberImg_2");
        }
        if (SEAL_1numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "sealNumberImg_3");
        }
        if (SEAL_1numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "sealNumberImg_4");
        }
        if (SEAL_1numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "sealNumberImg_5");
        }
        if (SEAL_1numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "sealNumberImg_6");
        }
        if (SEAL_1numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "sealNumberImg_7");
        }
        if (SEAL_1numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "sealNumberImg_8");
        }
        if (SEAL_1numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "sealNumberImg_9");
        }
      }
    }

    if (X == 1 && Y == 7) {
      body.style.background = "url(rooms/17.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash17");
      mapImage.setAttribute("class", "mapImage17");
    }

    if (X == 0 && Y == 7) {
      body.style.background = "url(rooms/07.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash07");
      mapImage.setAttribute("class", "mapImage07");
    }

    if (X == 7 && Y == 9) {
      body.style.background = "url(rooms/79.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash79");
      mapImage.setAttribute("class", "mapImage79");
    }

    if (X == 0 && Y == 8) {
      body.style.background = "url(rooms/08.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash08");
      mapImage.setAttribute("class", "mapImage08");
    }

    if (X == 1 && Y == 8) {
      body.style.background = "url(rooms/18.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash18");
      mapImage.setAttribute("class", "mapImage18");
    }

    if (X == 0 && Y == 10) {
      body.style.background = "url(rooms/010.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash010");
      mapImage.setAttribute("class", "mapImage010");
    }

    if (X == 0 && Y == 11) {
      body.style.background = "url(rooms/011.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash011");
      mapImage.setAttribute("class", "mapImage011");
    }

    if (X == 0 && Y == 12) {
      body.style.background = "url(rooms/012.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash012");
      mapImage.setAttribute("class", "mapImage012");
      falseSeal.setAttribute("class", "falseSeal");
      falseSeal.hidden = false;
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 7 && Y == 12) {
      body.style.background = "url(rooms/712.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash712");
      mapImage.setAttribute("class", "mapImage712");
      if (BLUEDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_3 === false) {
        seal_3.setAttribute("class", "seal_3");
        seal_3.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_3 == true) {
        seal_3.setAttribute("class", "pushSeal_3");
      }
      seal_3.hidden = false;
      if (SEAL_3 == true) {
        if (SEAL_3numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_3NumberImg_0");
        }
        if (SEAL_3numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_3NumberImg_1");
        }
        if (SEAL_3numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_3NumberImg_2");
        }
        if (SEAL_3numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_3NumberImg_3");
        }
        if (SEAL_3numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_3NumberImg_4");
        }
        if (SEAL_3numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_3NumberImg_5");
        }
        if (SEAL_3numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_3NumberImg_6");
        }
        if (SEAL_3numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_3NumberImg_7");
        }
        if (SEAL_3numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_3NumberImg_8");
        }
        if (SEAL_3numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_3NumberImg_9");
        }
      }
    }

    if (X == 6 && Y == 12) {
      body.style.background = "url(rooms/612.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash612");
      mapImage.setAttribute("class", "mapImage612");
    }

    if (X == 5 && Y == 12) {
      body.style.background = "url(rooms/512.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash512");
      mapImage.setAttribute("class", "mapImage512");
      falseSeal.setAttribute("class", "falseSeal512");
      falseSeal.hidden = false;
    }

    if (X == 7 && Y == 10) {
      body.style.background = "url(rooms/710.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash710");
      mapImage.setAttribute("class", "mapImage710");
    }

    if (X == 7 && Y == 11) {
      body.style.background = "url(rooms/711.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash711");
      mapImage.setAttribute("class", "mapImage711");
    }

    if (X == 0 && Y == 9) {
      body.style.background = "url(rooms/09.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash09");
      mapImage.setAttribute("class", "mapImage09");
    }

    if (X == 1 && Y == 9) {
      body.style.background = "url(rooms/19.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash19");
      mapImage.setAttribute("class", "mapImage19");
    }

    if (X == 2 && Y == 9) {
      body.style.background = "url(rooms/29.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash29");
      mapImage.setAttribute("class", "mapImage29");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 2 && Y == 10) {
      body.style.background = "url(rooms/210.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash210");
      mapImage.setAttribute("class", "mapImage210");
    }

    if (X == 2 && Y == 11) {
      body.style.background = "url(rooms/211.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash211");
      mapImage.setAttribute("class", "mapImage211");
    }

    if (X == 3 && Y == 11) {
      body.style.background = "url(rooms/311.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash311");
      mapImage.setAttribute("class", "mapImage311");
    }

    if (X == 4 && Y == 11) {
      body.style.background = "url(rooms/411.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash411");
      mapImage.setAttribute("class", "mapImage411");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
      if (REDDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_2 === false) {
        seal_2.setAttribute("class", "seal_2");
        seal_2.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_2 == true) {
        seal_2.setAttribute("class", "pushSeal_2");
      }
      seal_2.hidden = false;
      if (SEAL_2 == true) {
        if (SEAL_2numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_2NumberImg_0");
        }
        if (SEAL_2numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_2NumberImg_1");
        }
        if (SEAL_2numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_2NumberImg_2");
        }
        if (SEAL_2numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_2NumberImg_3");
        }
        if (SEAL_2numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_2NumberImg_4");
        }
        if (SEAL_2numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_2NumberImg_5");
        }
        if (SEAL_2numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_2NumberImg_6");
        }
        if (SEAL_2numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_2NumberImg_7");
        }
        if (SEAL_2numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_2NumberImg_8");
        }
        if (SEAL_2numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_2NumberImg_9");
        }
      }
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 5 && Y == 10) {
      body.style.background = "url(rooms/510.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash510");
      mapImage.setAttribute("class", "mapImage510");
    }

    if (X == 4 && Y == 10) {
      body.style.background = "url(rooms/410.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash410");
      mapImage.setAttribute("class", "mapImage410");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
    }

    if (X == 5 && Y == 9) {
      body.style.background = "url(rooms/59.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash59");
      mapImage.setAttribute("class", "mapImage59");
    }

    if (X == 5 && Y == 8) {
      body.style.background = "url(rooms/58.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash58");
      mapImage.setAttribute("class", "mapImage58");
    }

    if (X == 5 && Y == 7) {
      body.style.background = "url(rooms/57.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash57");
      mapImage.setAttribute("class", "mapImage57");
    }

    if (X == 3 && Y == 8) {
      body.style.background = "url(rooms/38.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash38");
      mapImage.setAttribute("class", "mapImage38");
    }

    if (X == 4 && Y == 8) {
      body.style.background = "url(rooms/48.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash48");
      mapImage.setAttribute("class", "mapImage48");
    }

    if (X == 5 && Y == 6) {
      body.style.background = "url(rooms/56.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash56");
      mapImage.setAttribute("class", "mapImage56");
    }

    if (X == 3 && Y == 5) {
      body.style.background = "url(rooms/35.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash35");
      mapImage.setAttribute("class", "mapImage35");
    }

    if (X == 4 && Y == 5) {
      body.style.background = "url(rooms/45.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash45");
      mapImage.setAttribute("class", "mapImage45");
    }

    if (X == 5 && Y == 5) {
      body.style.background = "url(rooms/55.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash55");
      mapImage.setAttribute("class", "mapImage55");
    }

    if (X == 4 && Y == 7) {
      body.style.background = "url(rooms/47.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash47");
      mapImage.setAttribute("class", "mapImage47");
    }

    if (ENEMYCOUNT == 4 && BALUALHEALT === false && BALUAL === true) {
      buttonStash.setAttribute("onclick", "");
      setTimeout(balualHealt, 1501);
    }

    if (roomArray[X][Y].healtButtle === 1 && roomArray[X][Y].stash === 0) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else if (
      roomArray[X][Y].healtButtle === 2 &&
      roomArray[X][Y].stash === 0
    ) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton2");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else {
      healtButtleButton.hidden = true;
    }

    if (roomArray[X][Y].goldDust === 1) {
      goldDustButton.setAttribute("onclick", "takeGoldDust()");
      goldDustButton.hidden = false;
      let randClassGoldDustButton = Math.round(Math.random() * (10 - 1) + 1);
      if (randClassGoldDustButton === 1 || randClassGoldDustButton === 6) {
        goldDustButton.setAttribute("class", "goldDustButton");
      } else if (
        randClassGoldDustButton === 2 ||
        randClassGoldDustButton === 7
      ) {
        goldDustButton.setAttribute("class", "goldDustButton2");
      } else if (
        randClassGoldDustButton === 3 ||
        randClassGoldDustButton === 8
      ) {
        goldDustButton.setAttribute("class", "goldDustButton3");
      } else if (
        randClassGoldDustButton === 4 ||
        randClassGoldDustButton === 9
      ) {
        goldDustButton.setAttribute("class", "goldDustButton4");
      } else if (
        randClassGoldDustButton === 5 ||
        randClassGoldDustButton === 10
      ) {
        goldDustButton.setAttribute("class", "goldDustButton5");
      } else {
        goldDustButton.hidden = true;
      }
    }

    body.style.backgroundSize = userSizeStr;
    if (userWidth < 500) {
      body.style.backgroundSize = "100% 100%";
    }
    setTimeout(nextRoom, 1500);
  };
  setTimeout(roomsImg, 2000);
}; //   Функция хотьбы назад   >>>>>>>

const goLeft = () => {
  //   Функция хотьбы в лево   >>>>>>>
  heroTextBlock.innerText = "";
  infoTextBlock.innerText = "";
  let x = X;
  let y = Y;

  buttonStash.hidden = false;

  if (STEP == 0 && roomArray[x][y].stash > 0) {
    heroTextBlock.innerText = " Не спеши, стоит лучше осмотреть эту комнату!";
    return;
  }

  if (X == 0) {
    infoTextBlock.hidden = false;
    infoTextBlock.innerText = "Стены лабиринта мешают вам пройти!";
    heroTextBlock.innerText = "Я не могу идти дальше ...";
    heroTextBlock.hidden = false;
    return;
  }

  X--;
  STEP++;

  if (
    (X == 1 && Y == 1) ||
    (X == 3 && Y == 1) ||
    (X == 5 && Y == 1) ||
    (X == 6 && Y == 1) ||
    (X == 1 && Y == 2) ||
    (X == 6 && Y == 2) ||
    (X == 2 && Y == 3) ||
    (X == 3 && Y == 3) ||
    (X == 6 && Y == 3) ||
    (X == 0 && Y == 4) ||
    (X == 2 && Y == 4) ||
    (X == 4 && Y == 4) ||
    (X == 5 && Y == 4) ||
    (X == 6 && Y == 4) ||
    (X == 2 && Y == 5) ||
    (X == 6 && Y == 5) ||
    (X == 2 && Y == 6) ||
    (X == 4 && Y == 6) ||
    (X == 6 && Y == 6) ||
    (X == 3 && Y == 7) ||
    (X == 6 && Y == 7) ||
    (X == 2 && Y == 8) ||
    (X == 6 && Y == 8) ||
    (X == 3 && Y == 9) ||
    (X == 4 && Y == 9) ||
    (X == 1 && Y == 10) ||
    (X == 3 && Y == 10) ||
    (X == 6 && Y == 10) ||
    (X == 1 && Y == 11) ||
    (X == 5 && Y == 11) ||
    (X == 6 && Y == 11) ||
    (X == 2 && Y == 12) ||
    (X == 4 && Y == 12)
  ) {
    infoTextBlock.hidden = false;
    heroTextBlock.hidden = false;
    infoTextBlock.innerText = "Вы не видите куда идти и остаетесь на месте!";
    heroTextBlock.innerText = "Я не могу идти в этом направлении ...";
    X++;
    return;
  }

  buttonDeadEnemy.hidden = true;
  body.style.background = "black";
  buttonE.hidden = true;
  buttonN.hidden = true;
  buttonS.hidden = true;
  buttonW.hidden = true;
  buttonStash.hidden = true;
  map.hidden = true;
  healtButtleButton.hidden = true;
  goldDustButton.hidden = true;
  jugButton.hidden = true;
  jugButton.setAttribute("onclick", "");
  mapButton.hidden = true;
  seal_1.hidden = true;
  seal_2.hidden = true;
  seal_3.hidden = true;
  sealNumberImg_0.hidden = true;
  sealNumberImg_1.hidden = true;
  sealNumberImg_2.hidden = true;
  sealNumberImg_3.hidden = true;
  sealNumberImg_4.hidden = true;
  sealNumberImg_5.hidden = true;
  sealNumberImg_6.hidden = true;
  sealNumberImg_7.hidden = true;
  sealNumberImg_8.hidden = true;
  sealNumberImg_9.hidden = true;
  falseSeal.hidden = true;
  buttonDealerDemon.hidden = true;
  divDealerDemonText.hidden = true;
  buttonTomb.hidden = true;

  const roomsImg = () => {
    if (X == 4 && Y == 0) {
      body.style.background = "url(rooms/startRoom.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash");
      jugButton.hidden = false;
      mapImage.setAttribute("class", "mapImage40");
    }

    if (X == 4 && Y == 1) {
      body.style.background = "url(rooms/41.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash41");
      mapImage.setAttribute("class", "mapImage41");
    }

    if (X == 3 && Y == 0) {
      body.style.background = "url(rooms/30.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash30");
      mapImage.setAttribute("class", "mapImage30");
    }

    if (X == 5 && Y == 0) {
      body.style.background = "url(rooms/50.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash50");
      mapImage.setAttribute("class", "mapImage50");
    }

    if (X == 4 && Y == 2) {
      body.style.background = "url(rooms/42.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash42");
      mapImage.setAttribute("class", "mapImage42");
    }

    if (X == 2 && Y == 0) {
      body.style.background = "url(rooms/20.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash20");
      mapImage.setAttribute("class", "mapImage20");
    }

    if (X == 1 && Y == 0) {
      body.style.background = "url(rooms/10.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash10");
      mapImage.setAttribute("class", "mapImage10");
    }

    if (X == 6 && Y == 0) {
      body.style.background = "url(rooms/60.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash60");
      mapImage.setAttribute("class", "mapImage60");
    }

    if (X == 2 && Y == 1) {
      body.style.background = "url(rooms/21.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash21");
      mapImage.setAttribute("class", "mapImage21");
    }

    if (X == 3 && Y == 2) {
      body.style.background = "url(rooms/32.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash32");
      mapImage.setAttribute("class", "mapImage32");
      buttonTomb.setAttribute("class", "buttonTomb");
      buttonTomb.setAttribute("onclick", "openTomb()");
      buttonTomb.hidden = false;
    }

    if (X == 2 && Y == 2) {
      body.style.background = "url(rooms/22.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash22");
      mapImage.setAttribute("class", "mapImage22");
    }

    if (X == 5 && Y == 2) {
      body.style.background = "url(rooms/52.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash52");
      mapImage.setAttribute("class", "mapImage52");
      if (MAP === false) {
        mapButton.setAttribute("class", "mapButton");
        mapButton.setAttribute("onclick", "showMap()");
        mapButton.hidden = false;
      }
    }

    if (X == 0 && Y == 0) {
      body.style.background = "url(rooms/00.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash00");
      mapImage.setAttribute("class", "mapImage00");
    }

    if (X == 7 && Y == 0) {
      body.style.background = "url(rooms/70.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash70");
      mapImage.setAttribute("class", "mapImage70");
    }

    if (X == 7 && Y == 1) {
      body.style.background = "url(rooms/71.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash71");
      mapImage.setAttribute("class", "mapImage71");
    }

    if (X == 7 && Y == 2) {
      body.style.background = "url(rooms/72.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash72");
      mapImage.setAttribute("class", "mapImage72");
    }

    if (X == 7 && Y == 3) {
      body.style.background = "url(rooms/73.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash73");
      mapImage.setAttribute("class", "mapImage73");
    }

    if (X == 0 && Y == 1) {
      body.style.background = "url(rooms/01.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash01");
      mapImage.setAttribute("class", "mapImage01");
    }

    if (X == 0 && Y == 2) {
      body.style.background = "url(rooms/02.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash02");
      mapImage.setAttribute("class", "mapImage02");
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
      falseSeal.setAttribute("class", "falseSeal34");
      falseSeal.hidden = false;
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
    }

    if (X == 7 && Y == 6) {
      body.style.background = "url(rooms/76.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash76");
      mapImage.setAttribute("class", "mapImage76");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 5 && Y == 3) {
      body.style.background = "url(rooms/53.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash53");
      mapImage.setAttribute("class", "mapImage53");
    }

    if (X == 4 && Y == 3) {
      body.style.background = "url(rooms/43.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash43");
      mapImage.setAttribute("class", "mapImage43");
    }

    if (X == 0 && Y == 3) {
      body.style.background = "url(rooms/03.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash03");
      mapImage.setAttribute("class", "mapImage03");
    }

    if (X == 1 && Y == 3) {
      body.style.background = "url(rooms/13.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash13");
      mapImage.setAttribute("class", "mapImage13");
    }

    if (X == 1 && Y == 4) {
      body.style.background = "url(rooms/14.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash14");
      mapImage.setAttribute("class", "mapImage14");
    }

    if (X == 7 && Y == 4) {
      body.style.background = "url(rooms/74.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash74");
      mapImage.setAttribute("class", "mapImage74");
    }

    if (X == 7 && Y == 5) {
      body.style.background = "url(rooms/75.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash75");
      mapImage.setAttribute("class", "mapImage75");
    }

    if (X == 7 && Y == 8) {
      body.style.background = "url(rooms/78.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash78");
      mapImage.setAttribute("class", "mapImage78");
    }

    if (X == 7 && Y == 7) {
      body.style.background = "url(rooms/77.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash77");
      mapImage.setAttribute("class", "mapImage77");
    }

    if (X == 0 && Y == 5) {
      body.style.background = "url(rooms/05.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash05");
      mapImage.setAttribute("class", "mapImage05");
    }

    if (X == 1 && Y == 5) {
      body.style.background = "url(rooms/15.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash15");
      mapImage.setAttribute("class", "mapImage15");
    }

    if (X == 0 && Y == 6) {
      body.style.background = "url(rooms/06.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash06");
      mapImage.setAttribute("class", "mapImage06");
    }

    if (X == 1 && Y == 6) {
      body.style.background = "url(rooms/16.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash16");
      mapImage.setAttribute("class", "mapImage16");
    }

    if (X == 2 && Y == 7) {
      body.style.background = "url(rooms/27.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash27");
      mapImage.setAttribute("class", "mapImage27");
      if (SCELETBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_1 === false) {
        seal_1.setAttribute("class", "seal_1");
        seal_1.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_1 == true) {
        seal_1.setAttribute("class", "pushSeal_1");
      }
      seal_1.hidden = false;
      if (SEAL_1 == true) {
        if (SEAL_1numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "sealNumberImg_0");
        }
        if (SEAL_1numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "sealNumberImg_1");
        }
        if (SEAL_1numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "sealNumberImg_2");
        }
        if (SEAL_1numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "sealNumberImg_3");
        }
        if (SEAL_1numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "sealNumberImg_4");
        }
        if (SEAL_1numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "sealNumberImg_5");
        }
        if (SEAL_1numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "sealNumberImg_6");
        }
        if (SEAL_1numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "sealNumberImg_7");
        }
        if (SEAL_1numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "sealNumberImg_8");
        }
        if (SEAL_1numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "sealNumberImg_9");
        }
      }
    }

    if (X == 1 && Y == 7) {
      body.style.background = "url(rooms/17.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash17");
      mapImage.setAttribute("class", "mapImage17");
    }

    if (X == 0 && Y == 7) {
      body.style.background = "url(rooms/07.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash07");
      mapImage.setAttribute("class", "mapImage07");
    }

    if (X == 7 && Y == 9) {
      body.style.background = "url(rooms/79.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash79");
      mapImage.setAttribute("class", "mapImage79");
    }

    if (X == 0 && Y == 8) {
      body.style.background = "url(rooms/08.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash08");
      mapImage.setAttribute("class", "mapImage08");
    }

    if (X == 1 && Y == 8) {
      body.style.background = "url(rooms/18.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash18");
      mapImage.setAttribute("class", "mapImage18");
    }

    if (X == 0 && Y == 10) {
      body.style.background = "url(rooms/010.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash010");
      mapImage.setAttribute("class", "mapImage010");
    }

    if (X == 0 && Y == 11) {
      body.style.background = "url(rooms/011.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash011");
      mapImage.setAttribute("class", "mapImage011");
    }

    if (X == 0 && Y == 12) {
      body.style.background = "url(rooms/012.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash012");
      mapImage.setAttribute("class", "mapImage012");
      falseSeal.setAttribute("class", "falseSeal");
      falseSeal.hidden = false;
    }

    if (X == 1 && Y == 12) {
      body.style.background = "url(rooms/112.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash112");
      mapImage.setAttribute("class", "mapImage112");
    }

    if (X == 7 && Y == 12) {
      body.style.background = "url(rooms/712.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash712");
      mapImage.setAttribute("class", "mapImage712");
      if (BLUEDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_3 === false) {
        seal_3.setAttribute("class", "seal_3");
        seal_3.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_3 == true) {
        seal_3.setAttribute("class", "pushSeal_3");
      }
      seal_3.hidden = false;
      if (SEAL_3 == true) {
        if (SEAL_3numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_3NumberImg_0");
        }
        if (SEAL_3numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_3NumberImg_1");
        }
        if (SEAL_3numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_3NumberImg_2");
        }
        if (SEAL_3numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_3NumberImg_3");
        }
        if (SEAL_3numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_3NumberImg_4");
        }
        if (SEAL_3numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_3NumberImg_5");
        }
        if (SEAL_3numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_3NumberImg_6");
        }
        if (SEAL_3numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_3NumberImg_7");
        }
        if (SEAL_3numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_3NumberImg_8");
        }
        if (SEAL_3numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_3NumberImg_9");
        }
      }
    }

    if (X == 6 && Y == 12) {
      body.style.background = "url(rooms/612.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash612");
      mapImage.setAttribute("class", "mapImage612");
    }

    if (X == 5 && Y == 12) {
      body.style.background = "url(rooms/512.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash512");
      mapImage.setAttribute("class", "mapImage512");
      falseSeal.setAttribute("class", "falseSeal512");
      falseSeal.hidden = false;
    }

    if (X == 7 && Y == 10) {
      body.style.background = "url(rooms/710.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash710");
      mapImage.setAttribute("class", "mapImage710");
    }

    if (X == 7 && Y == 11) {
      body.style.background = "url(rooms/711.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash711");
      mapImage.setAttribute("class", "mapImage711");
    }

    if (X == 0 && Y == 9) {
      body.style.background = "url(rooms/09.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash09");
      mapImage.setAttribute("class", "mapImage09");
    }

    if (X == 1 && Y == 9) {
      body.style.background = "url(rooms/19.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash19");
      mapImage.setAttribute("class", "mapImage19");
    }

    if (X == 2 && Y == 9) {
      body.style.background = "url(rooms/29.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash29");
      mapImage.setAttribute("class", "mapImage29");
      buttonDealerDemon.setAttribute("onclick", "");
      if (DEALERDEMON === true) {
        buttonDealerDemon.hidden = false;
        setTimeout(dealerDemonOnclick, 1501);
      }
    }

    if (X == 2 && Y == 10) {
      body.style.background = "url(rooms/210.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash210");
      mapImage.setAttribute("class", "mapImage210");
    }

    if (X == 2 && Y == 11) {
      body.style.background = "url(rooms/211.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash211");
      mapImage.setAttribute("class", "mapImage211");
    }

    if (X == 3 && Y == 11) {
      body.style.background = "url(rooms/311.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash311");
      mapImage.setAttribute("class", "mapImage311");
    }

    if (X == 4 && Y == 11) {
      body.style.background = "url(rooms/411.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash411");
      mapImage.setAttribute("class", "mapImage411");
    }

    if (X == 3 && Y == 12) {
      body.style.background = "url(rooms/312.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash312");
      mapImage.setAttribute("class", "mapImage312");
      if (REDDEMONBOSS === true) {
        buttonStash.setAttribute("onclick", "");
        setTimeout(fight, 1501);
      }
      if (SEAL_2 === false) {
        seal_2.setAttribute("class", "seal_2");
        seal_2.setAttribute("onclick", "pushSeal()");
      } else if (SEAL_2 == true) {
        seal_2.setAttribute("class", "pushSeal_2");
      }
      seal_2.hidden = false;
      if (SEAL_2 == true) {
        if (SEAL_2numberRandom == 0) {
          sealNumberImg_0.hidden = false;
          sealNumberImg_0.setAttribute("class", "seal_2NumberImg_0");
        }
        if (SEAL_2numberRandom == 1) {
          sealNumberImg_1.hidden = false;
          sealNumberImg_1.setAttribute("class", "seal_2NumberImg_1");
        }
        if (SEAL_2numberRandom == 2) {
          sealNumberImg_2.hidden = false;
          sealNumberImg_2.setAttribute("class", "seal_2NumberImg_2");
        }
        if (SEAL_2numberRandom == 3) {
          sealNumberImg_3.hidden = false;
          sealNumberImg_3.setAttribute("class", "seal_2NumberImg_3");
        }
        if (SEAL_2numberRandom == 4) {
          sealNumberImg_4.hidden = false;
          sealNumberImg_4.setAttribute("class", "seal_2NumberImg_4");
        }
        if (SEAL_2numberRandom == 5) {
          sealNumberImg_5.hidden = false;
          sealNumberImg_5.setAttribute("class", "seal_2NumberImg_5");
        }
        if (SEAL_2numberRandom == 6) {
          sealNumberImg_6.hidden = false;
          sealNumberImg_6.setAttribute("class", "seal_2NumberImg_6");
        }
        if (SEAL_2numberRandom == 7) {
          sealNumberImg_7.hidden = false;
          sealNumberImg_7.setAttribute("class", "seal_2NumberImg_7");
        }
        if (SEAL_2numberRandom == 8) {
          sealNumberImg_8.hidden = false;
          sealNumberImg_8.setAttribute("class", "seal_2NumberImg_8");
        }
        if (SEAL_2numberRandom == 9) {
          sealNumberImg_9.hidden = false;
          sealNumberImg_9.setAttribute("class", "seal_2NumberImg_9");
        }
      }
    }

    if (X == 3 && Y == 4) {
      body.style.background = "url(rooms/34.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash34");
      mapImage.setAttribute("class", "mapImage34");
    }

    if (X == 3 && Y == 6) {
      body.style.background = "url(rooms/36.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash36");
      mapImage.setAttribute("class", "mapImage36");
    }

    if (X == 5 && Y == 10) {
      body.style.background = "url(rooms/510.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash510");
      mapImage.setAttribute("class", "mapImage510");
    }

    if (X == 4 && Y == 10) {
      body.style.background = "url(rooms/410.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash410");
      mapImage.setAttribute("class", "mapImage410");
    }

    if (X == 6 && Y == 9) {
      body.style.background = "url(rooms/69.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash69");
      mapImage.setAttribute("class", "mapImage69");
    }

    if (X == 5 && Y == 9) {
      body.style.background = "url(rooms/59.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash59");
      mapImage.setAttribute("class", "mapImage59");
    }

    if (X == 5 && Y == 8) {
      body.style.background = "url(rooms/58.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash58");
      mapImage.setAttribute("class", "mapImage58");
    }

    if (X == 5 && Y == 7) {
      body.style.background = "url(rooms/57.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash57");
      mapImage.setAttribute("class", "mapImage57");
    }

    if (X == 3 && Y == 8) {
      body.style.background = "url(rooms/38.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash38");
      mapImage.setAttribute("class", "mapImage38");
    }

    if (X == 4 && Y == 8) {
      body.style.background = "url(rooms/48.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash48");
      mapImage.setAttribute("class", "mapImage48");
    }

    if (X == 5 && Y == 6) {
      body.style.background = "url(rooms/56.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash56");
      mapImage.setAttribute("class", "mapImage56");
    }

    if (X == 3 && Y == 5) {
      body.style.background = "url(rooms/35.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash35");
      mapImage.setAttribute("class", "mapImage35");
    }

    if (X == 4 && Y == 5) {
      body.style.background = "url(rooms/45.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash45");
      mapImage.setAttribute("class", "mapImage45");
    }

    if (X == 5 && Y == 5) {
      body.style.background = "url(rooms/55.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash55");
      mapImage.setAttribute("class", "mapImage55");
    }

    if (X == 4 && Y == 7) {
      body.style.background = "url(rooms/47.jpg) no-repeat center";
      buttonStash.setAttribute("class", "stash47");
      mapImage.setAttribute("class", "mapImage47");
    }

    if (ENEMYCOUNT == 4 && BALUALHEALT === false && BALUAL === true) {
      buttonStash.setAttribute("onclick", "");
      setTimeout(balualHealt, 1501);
    }

    if (roomArray[X][Y].healtButtle === 1 && roomArray[X][Y].stash === 0) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else if (
      roomArray[X][Y].healtButtle === 2 &&
      roomArray[X][Y].stash === 0
    ) {
      healtButtleButton.hidden = false;
      healtButtleButton.setAttribute("class", "healtButtleButton2");
      healtButtleButton.setAttribute("onclick", "drinkHealtButtle()");
    } else {
      healtButtleButton.hidden = true;
    }

    if (roomArray[X][Y].goldDust === 1) {
      goldDustButton.setAttribute("onclick", "takeGoldDust()");
      goldDustButton.hidden = false;
      let randClassGoldDustButton = Math.round(Math.random() * (10 - 1) + 1);
      if (randClassGoldDustButton === 1 || randClassGoldDustButton === 6) {
        goldDustButton.setAttribute("class", "goldDustButton");
      } else if (
        randClassGoldDustButton === 2 ||
        randClassGoldDustButton === 7
      ) {
        goldDustButton.setAttribute("class", "goldDustButton2");
      } else if (
        randClassGoldDustButton === 3 ||
        randClassGoldDustButton === 8
      ) {
        goldDustButton.setAttribute("class", "goldDustButton3");
      } else if (
        randClassGoldDustButton === 4 ||
        randClassGoldDustButton === 9
      ) {
        goldDustButton.setAttribute("class", "goldDustButton4");
      } else if (
        randClassGoldDustButton === 5 ||
        randClassGoldDustButton === 10
      ) {
        goldDustButton.setAttribute("class", "goldDustButton5");
      } else {
        goldDustButton.hidden = true;
      }
    }

    body.style.backgroundSize = userSizeStr;
    if (userWidth < 500) {
      body.style.backgroundSize = "100% 100%";
    }
    setTimeout(nextRoom, 1500);
  };
  setTimeout(roomsImg, 2000);
}; //   Функция хотьбы в лево   >>>>>>>

const startGame = () => {
  //   СТАРТ ИГРЫ   >>>>>>>

  enemyImg.hidden = true;
  infoTextBlock.hidden = false;
  infoTextBlock.innerHTML = "";
  heroTextBlock.hidden = false;
  youDiedText.hidden = true;
  BALUAL = false;
  mapImage.hidden = true;

  audio.setAttribute("src", "mp3/LA.mp3");

  let h1 = document.querySelector(".nameGame"); //   Получение абзаца.
  h1.hidden = true; //   Скрытие абзаца.

  startButton.hidden = true; //   Скрытие кнопки старта игры.
  let pCorp = document.querySelector(".corp"); //   Получение параграфа corp.
  pCorp.hidden = true; //   Скрытие параграфа corp.
  let pStartGame = document.querySelector(".start"); //   Получение параграфа Начать игру...
  pStartGame.hidden = true; //   Скрытие параграфа начать игру.

  let bodyWidth = userWidth + " px";
  let bodyHeight = userHeight + " px";
  body.style.width = bodyWidth;
  body.style.height = bodyHeight;
  body.style.background = "black"; //   Черный фон (эффект пробуждения).
  heroTextBlock.innerText =
    "Господи как же больно! Наконец-то все закончилось! Сан-Франциско 70х - встречай меня!"; //   Заполнение коментария героя.
  heroTextBlock.setAttribute("class", "heroTextBlock"); //   Подключение сss к тексту героя.
  body.append(heroTextBlock); //   Добавление блока комментария в html.

  const wakeUp = () => {
    //   Функция пробуждения героя в лабиринте   >>>>>>>

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/1.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
        heroTextBlock.style.color = "red";
      }),
      9000
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/2.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
      }),
      9400
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/3.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
        heroTextBlock.style.color = "blue";
      }),
      9800
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/4.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
      }),
      10200
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/5.jpeg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
        heroTextBlock.style.color = "yellow";
      }),
      10600
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/6.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
      }),
      11000
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/7.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
        heroTextBlock.style.color = "green";
      }),
      11400
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/8.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
      }),
      11800
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/9.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
        heroTextBlock.style.color = "white";
      }),
      12200
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        body.style.background = "url(la/10.jpg) center no-repeat";
        body.style.backgroundSize = userSizeStr;
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
      }),
      12600
    );

    setTimeout(
      (dreamsImg = () => {
        //   Замена изображения.
        audio.setAttribute("src", "#");
        body.style.background = "black";
        body.style.backgroundSize = userSizeStr;
        heroTextBlock.innerHTML = "";
        heroTextBlock.style.color = "rgb(255, 94, 0)";
      }),
      13000
    );
    setTimeout(
      (x = () => {
        body.style.background = "url(rooms/startRoom.jpg) center no-repeat"; //   Изменение изображения фона.
        body.style.backgroundSize = userSizeStr; //   Изменение размера изображения фона.})
        jugButton.hidden = false;
        jugButton.setAttribute("class", "jugButton");
        if (userWidth < 500) {
          body.style.backgroundSize = "100% 100%";
        }
        audio.setAttribute("src", "mp3/tomb.mp3");
      }),
      15000
    );

    setTimeout(
      (x = () => {
        heroTextBlock.innerText =
          "Ааа -ааа! Что происходит? Что за... Нет - нет только не это! Где я?! Проклятье! Вот дерьмо! Ааа - ааа!";
      }),
      18000
    ); //   Изменение текста героя с отсрочкой по времени.

    setTimeout(
      (x = () => {
        heroTextBlock.innerText =
          "Нужно осмотреться... В таком говнище я точно не бывал! Какой-то жуткий кошмар! Проклятье! Черт!";
      }),
      24000
    ); //   Изменение текста героя с отсрочкой по времени.
  };

  wakeUp();

  const showUser = () => {
    //   Функция показа пользователя   >>>>>>>
    printHealt.hidden = false;
    printPower.hidden = false;
    printGold.hidden = false;
    healt.hidden = false;
    power.hidden = false;
    gold.hidden = false;

    heroTextBlock.innerText = "";

    let goldStr = "Gold : "; //   Строка золото.
    let healtStr = "Healt : "; //   Строка жизни.
    let powerStr = "Power : "; //   Строка силы.
    let armorStr = "Armor : ";

    printGold.setAttribute("class", "userPrintGold"); //   Добавление стилей.
    printHealt.setAttribute("class", "userPrintHealt"); //   Добавление стилей.
    printPower.setAttribute("class", "userPrintPower"); //   Добавление стилей.
    printArmor.setAttribute("class", "userPrintArmor");

    printGold.innerText = goldStr; //   Текст золота.
    printHealt.innerText = healtStr; //   Текст жизни.
    printPower.innerText = powerStr; //   Текст силы.
    printArmor.innerText = armorStr;

    body.append(printGold); //   Вставка золота.
    body.append(printHealt); //   Вставка жизни.
    body.append(printPower); //   Вставка силы.
    body.append(printArmor);

    gold.setAttribute("class", "userGold"); //   Добавление стилей.
    healt.setAttribute("class", "userHealt"); //   Добавление стилей.
    power.setAttribute("class", "userPower"); //   Добавление стилей.
    armor.setAttribute("class", "userArmor");

    gold.innerText = hero.gold; //   Текст золота.
    healt.innerText = hero.healt; //   Текст жизни.
    power.innerText = hero.power; //   Текст силы.
    armor.innerText = hero.armor;

    body.append(gold); //   Вставка золота.
    body.append(healt); //   Вставка жизни.
    body.append(power); //   Вставка силы.
    body.append(armor);

    if (hero.armor == 0) {
      armor.hidden = true;
      printArmor.hidden = true;
    }
  };
  setTimeout(showUser, 32000); //   Функция показа пользователя   >>>>>>>

  const textInfo = () => {
    //   Функция Text Info   >>>>>>>
    infoTextBlock.innerText =
      "Найди способ выбраться. Обыскивай комнаты, осматривай стены и будь осторожен!";

    infoTextBlock.setAttribute("class", "textInfo");
    body.append(infoTextBlock);
  };
  setTimeout(textInfo, 34000); //   Функция Text Info   >>>>>>>

  const createMap = () => {
    //   Функция создания ссылки на карту   >>>>>>>
    map.hidden = false;
    map.setAttribute("href", "map/map.jpg");
    map.setAttribute("class", "map");
    map.setAttribute("target", "_blank");
    body.append(map);
  };
  setTimeout(createMap, 35000); //   Функция создания ссылки на карту   >>>>>>>

  const createButtonStash = () => {
    //   Функция создания кнопки тайника   >>>>>>>
    buttonStash.hidden = false;
    buttonStash.setAttribute("class", "stash");
    buttonStash.setAttribute("onclick", "openStash()");
    body.append(buttonStash);
    jugButton.setAttribute("onclick", "startJugButton()");
  };
  setTimeout(createButtonStash, 35000); //   Функция создания кнопки тайника   >>>>>>>

  createButtonGo = () => {
    //   Функция создания кнопок ходьбы   >>>>>>>

    buttonN.hidden = false;
    buttonE.hidden = false;
    buttonS.hidden = false;
    buttonW.hidden = false;

    buttonN.setAttribute("class", "buttonLeft");
    buttonE.setAttribute("class", "buttonStraight");
    buttonS.setAttribute("class", "buttonRight");
    buttonW.setAttribute("class", "buttonBack");

    buttonN.setAttribute("onclick", "goStrange()");
    buttonE.setAttribute("onclick", "goRight()");
    buttonS.setAttribute("onclick", "goDown()");
    buttonW.setAttribute("onclick", "goLeft()");

    buttonN.innerText = "N";
    buttonE.innerText = "E";
    buttonS.innerText = "S";
    buttonW.innerText = "W";

    body.append(buttonN);
    body.append(buttonE);
    body.append(buttonS);
    body.append(buttonW);
  };
  setTimeout(createButtonGo, 35000); //   Функция создания кнопок ходьбы   >>>>>>>
}; //   СТАРТ ИГРЫ   >>>>>>>
