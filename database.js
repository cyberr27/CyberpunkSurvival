// database.js

const { MongoClient } = require("mongodb");

async function connectToDatabase(uri) {
  if (!uri || typeof uri !== "string" || !uri.trim()) {
    console.error(
      "Ошибка: Переменная окружения MONGO_URI не определена или пуста!",
    );
    process.exit(1);
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    console.error(
      "Ошибка: Некорректная схема в MONGO_URI. Ожидается 'mongodb://' или 'mongodb+srv://'",
    );
    process.exit(1);
  }

  console.log(
    "Используемая строка подключения MongoDB:",
    uri.replace(/:([^:@]+)@/, ":<password>@"),
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
        maxStats: user.maxStats || {
          health: 100 + (user.healthUpgrade || 0),
          energy: 100 + (user.energyUpgrade || 0),
          food: 100 + (user.foodUpgrade || 0),
          water: 100 + (user.waterUpgrade || 0),
          armor: 0,
        },
        // Ограничиваем текущие статы сразу при загрузке
        health: Math.max(
          0,
          Math.min(user.health || 100, user.maxStats?.health || 100),
        ),
        energy: Math.max(
          0,
          Math.min(user.energy || 100, user.maxStats?.energy || 100),
        ),
        food: Math.max(
          0,
          Math.min(user.food || 100, user.maxStats?.food || 100),
        ),
        water: Math.max(
          0,
          Math.min(user.water || 100, user.maxStats?.water || 100),
        ),
        armor: Math.max(
          0,
          Math.min(user.armor || 0, user.maxStats?.armor || 0),
        ),
      };
      userDatabase.set(user.id, userData);
    });
  } catch (error) {}
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
      healthUpgrade: player.healthUpgrade || 0,
      energyUpgrade: player.energyUpgrade || 0,
      foodUpgrade: player.foodUpgrade || 0,
      waterUpgrade: player.waterUpgrade || 0,
      // Ограничиваем текущие статы
      health: Math.min(player.health, player.maxStats?.health || 100),
      energy: Math.min(player.energy, player.maxStats?.energy || 100),
      food: Math.min(player.food, player.maxStats?.food || 100),
      water: Math.min(player.water, player.maxStats?.water || 100),
      armor: Math.min(player.armor, player.maxStats?.armor || 0),

      skills: player.skills || [],
      skillPoints: player.skillPoints || 0,
    };
    await collection.updateOne(
      { id: username },
      { $set: playerData },
      { upsert: true },
    );
  } catch (error) {}
}

module.exports = { connectToDatabase, loadUserDatabase, saveUserDatabase };
