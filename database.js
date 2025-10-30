// database.js

const { MongoClient } = require("mongodb");

async function connectToDatabase(uri) {
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
    console.log("Подключено к MongoDB");
    return mongoClient.db("cyberpunk_survival").collection("users");
  } catch (error) {
    console.error("Ошибка подключения к MongoDB:", error);
    process.exit(1);
  }
}

async function loadUserDatabase(collection, userDatabase) {
  try {
    const users = await collection.find({}).toArray();
    users.forEach((user) => {
      const userData = {
        ...user,
        maxStats: {
          health: user.maxStats?.health || 100,
          energy: user.maxStats?.energy || 100,
          food: user.maxStats?.food || 100,
          water: user.maxStats?.water || 100,
          armor: user.maxStats?.armor || 0,
        },
        upgradeMaxStats: {
          health: user.upgradeMaxStats?.health || 0,
          energy: user.upgradeMaxStats?.energy || 0,
          food: user.upgradeMaxStats?.food || 0,
          water: user.upgradeMaxStats?.water || 0,
          armor: user.upgradeMaxStats?.armor || 0,
        },
        health: Math.min(user.health || 100, user.maxStats?.health || 100),
        energy: Math.min(user.energy || 100, user.maxStats?.energy || 100),
        food: Math.min(user.food || 100, user.maxStats?.food || 100),
        water: Math.min(user.water || 100, user.maxStats?.water || 100),
        armor: Math.min(user.armor || 0, user.maxStats?.armor || 0),
      };
      userDatabase.set(user.id, userData);
      console.log(
        `Загружен игрок ${user.id}, maxStats: ${JSON.stringify(
          userData.maxStats
        )}, upgradeMaxStats: ${JSON.stringify(userData.upgradeMaxStats)}`
      );
    });
    console.log("База данных пользователей загружена из MongoDB");
  } catch (error) {
    console.error("Ошибка при загрузке базы данных из MongoDB:", error);
  }
}

async function saveUserDatabase(collection, username, player) {
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
      upgradeMaxStats: {
        health: user.upgradeMaxStats?.health || 0,
        energy: user.upgradeMaxStats?.energy || 0,
        food: user.upgradeMaxStats?.food || 0,
        water: user.upgradeMaxStats?.water || 0,
        armor: user.upgradeMaxStats?.armor || 0,
      },
      health: Math.min(player.health, player.maxStats?.health || 100),
      energy: Math.min(player.energy, player.maxStats?.energy || 100),
      food: Math.min(player.food, player.maxStats?.food || 100),
      water: Math.min(player.water, player.maxStats?.water || 100),
      armor: Math.min(player.armor, player.maxStats?.armor || 0),
    };

    await collection.updateOne(
      { id: username },
      { $set: playerData },
      { upsert: true }
    );
    console.log(
      `Сохранен игрок ${user.id}, maxStats: ${JSON.stringify(
        userData.maxStats
      )}, upgradeMaxStats: ${JSON.stringify(userData.upgradeMaxStats)}`
    );
  } catch (error) {
    console.error("Ошибка при сохранении данных в MongoDB:", error);
  }
}

module.exports = { connectToDatabase, loadUserDatabase, saveUserDatabase };
