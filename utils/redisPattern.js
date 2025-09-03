export async function delByPattern(redisClient, pattern) {

  const pipeline = redisClient.multi();
  let batch = 0;

  for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 1000 })) {
    pipeline.unlink(key);           
    batch++;

    if (batch % 1000 === 0) {
      await pipeline.exec();
    }
  }

  if (batch % 1000 !== 0) {
    await pipeline.exec();
  }
}
