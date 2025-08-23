require("dotenv").config();
const redis = require("redis");
// Create a fresh client just for clearing cache
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  try {
    await redisClient.connect();  // Connect explicitly
    await redisClient.flushAll(); // Clear all keys
    console.log("Cache cleared successfully");
  } catch (err) {
    console.error("Failed to clear cache:", err);
  } finally {
    await redisClient.quit();     // Quit after operation
  }
})();
