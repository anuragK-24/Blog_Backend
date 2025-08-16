const jwt = require("jsonwebtoken");

function verifyCronJob(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json("No token provided");

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json("Invalid token");

    // Only allow the cron job email
    if (decoded.email !== "cronjob@anuragk24.com") {
      return res.status(403).json("Not authorized for cleanup");
    }

    req.user = decoded;
    next();
  });
}

module.exports = verifyCronJob;
