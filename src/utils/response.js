// utils/response.js
export function ok(res, data, message = "Success", status = 200) {
  return res.status(status).json({
    success: true,
    data: data,
    message,
  });
}

export function fail(res, code, message, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
  });
}