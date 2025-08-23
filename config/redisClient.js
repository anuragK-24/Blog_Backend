const redis = require("redis");

let redisClient;

if (!redisClient) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL, // Your Redis URL
  });

  redisClient.on("error", (err) => console.error("Redis Client Error", err));

  (async () => {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Connected to Redis");
    }
  })();
}

module.exports = redisClient;
