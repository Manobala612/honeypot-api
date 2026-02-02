export function errorHandler(err, req, res, next) {
  console.error("Error:", err.message);

  res.status(500).json({
    error: "Internal Server Error",
    message: "Something went wrong"
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Not Found",
    message: "Route does not exist"
  });
}
