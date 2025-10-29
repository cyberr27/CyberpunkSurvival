// database.js

const { MongoClient } = require("mongodb");

async function connectToDatabase(uri) {
  console.log("Попытка подключения к MongoDB...");
  if (!uri || typeof uri !== "string" || !uri.trim()) {
    console.error(
      "Ошибка: Переменная окружения MONGO_URI не определена или пуста!"
    );
    process.exit(1);
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    console.error(
      "Ошибка: Некорректная схема в MONGO_URI. Ожидается 'mongodb://' или 'mongodb+srv://'"
    );
    process.exit(1);
  }

  console.log(
    "Используемая строка подключения MongoDB:",
    uri.replace(/:([^:@]+)@/, ":<password>@")
  );
  const mongoClient = new MongoClient(uri);

  try {
    await mongoClient.connect();
    console.log("Подключено к MongoDB успешно");
    const db = mongoClient.db("cyberpunk_survival");
    const collection = db.collection("users");
    console.log("Получена коллекция 'users' из базы 'cyberpunk_survival'");
    return collection;
  } catch (error) {
    console.error("Ошибка подключения к MongoDB:", error.message);
    console.error("Полная ошибка:", error);
    process.exit(1);
  }
}

async function loadUserDatabase(collection, userDatabase) {
  console.log("Начало загрузки базы данных пользователей из MongoDB...");
  try {
    const users = await collection.find({}).toArray();
    console.log(`Найдено ${users.length} пользователей в коллекции`);
    users.forEach((user, index) => {
      console.log(
        `Обработка пользователя ${index + 1}/${users.length}: id=${user.id}`
      );
      const userData = {
        ...user,
        maxStats: {
          health: user.maxStats?.health || 100,
          energy: user.maxStats?.energy || 100,
          food: user.maxStats?.food || 100,
          water: user.maxStats?.water || 100,
          armor: user.maxStats?.armor || 0,
        },
        health: Math.min(user.health || 100, user.maxStats?.health || 100),
        energy: Math.min(user.energy || 100, user.maxStats?.energy || 100),
        food: Math.min(user.food || 100, user.maxStats?.food || 100),
        water: Math.min(user.water || 100, user.maxStats?.water || 100),
        armor: Math.min(user.armor || 0, user.maxStats?.armor || 0),
      };
      console.log(
        `Нормализованные maxStats для ${user.id}: ${JSON.stringify(
          userData.maxStats
        )}`
      );
      console.log(
        `Нормализованные stats для ${user.id}: health=${userData.health}, energy=${userData.energy}, food=${userData.food}, water=${userData.water}, armor=${userData.armor}`
      );
      userDatabase.set(user.id, userData);
      console.log(`Пользователь ${user.id} добавлен в userDatabase`);
    });
    console.log(
      `База данных пользователей загружена из MongoDB: загружено ${users.length} записей`
    );
  } catch (error) {
    console.error("Ошибка при загрузке базы данных из MongoDB:", error.message);
    console.error("Полная ошибка:", error);
  }
}

async function saveUserDatabase(collection, username, player) {
  console.log(`Начало сохранения пользователя ${username}...`);
  console.log(`Входные данные player: ${JSON.stringify(player, null, 2)}`);
  try {
    const playerData = {
      ...player,
      maxStats: {
        health: player.maxStats?.health || 100,
        energy: player.maxStats?.energy || 100,
        food: player.maxStats?.food || 100,
        water: player.maxStats?.water || 100,
        armor: player.maxStats?.armor || 0,
      },
      health: Math.min(player.health, player.maxStats?.health || 100),
      energy: Math.min(player.energy, player.maxStats?.energy || 100),
      food: Math.min(player.food, player.maxStats?.food || 100),
      water: Math.min(player.water, player.maxStats?.water || 100),
      armor: Math.min(player.armor, player.maxStats?.armor || 0),
    };
    console.log(
      `Нормализованные maxStats: ${JSON.stringify(playerData.maxStats)}`
    );
    console.log(
      `Нормализованные stats: health=${playerData.health}, energy=${playerData.energy}, food=${playerData.food}, water=${playerData.water}, armor=${playerData.armor}`
    );
    console.log(
      `Полные нормализованные данные playerData: ${JSON.stringify(
        playerData,
        null,
        2
      )}`
    );

    const result = await collection.updateOne(
      { id: username },
      { $set: playerData },
      { upsert: true }
    );
    console.log(
      `Результат обновления: matchedCount=${
        result.matchedCount
      }, modifiedCount=${result.modifiedCount}, upsertedId=${
        result.upsertedId ? result.upsertedId._id : "none"
      }`
    );
    console.log(`Пользователь ${username} сохранён успешно`);
  } catch (error) {
    console.error("Ошибка при сохранении данных в MongoDB:", error.message);
    console.error("Полная ошибка:", error);
  }
}

module.exports = { connectToDatabase, loadUserDatabase, saveUserDatabase };
