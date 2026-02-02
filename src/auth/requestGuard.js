export function requestGuard(req, res, next) {
  const contentLength = req.headers["content-length"];

  if (contentLength && Number(contentLength) > 10_000) {
    return res.status(413).json({
      error: "Payload Too Large",
      message: "Request body exceeds allowed size"
    });
  }

  next();
}
