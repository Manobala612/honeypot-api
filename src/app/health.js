export function healthCheck(req, res) {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime()
  });
}
