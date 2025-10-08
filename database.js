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
        maxStats: user.maxStats || {
          health: player.health,
          energy: player.energy,  
          food: player.food,
          water: player.water,
        },
      };
      userDatabase.set(user.id, userData);
      console.log(
        `Загружен игрок ${user.id}, maxStats: ${JSON.stringify(
          userData.maxStats
        )}`
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
      maxStats: player.maxStats || {
        health: player.health,
        energy: player.energy,
        food: player.food,
        water: player.water,
      },
    };
    await collection.updateOne(
      { id: username },
      { $set: playerData },
      { upsert: true }
    );
    console.log(
      `Данные игрока ${username} сохранены, maxStats: ${JSON.stringify(
        playerData.maxStats
      )}`
    );
  } catch (error) {
    console.error("Ошибка при сохранении данных в MongoDB:", error);
  }
}

module.exports = { connectToDatabase, loadUserDatabase, saveUserDatabase };
