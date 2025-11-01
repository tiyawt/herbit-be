// utils/response.js
export function ok(res, data = null, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function fail(res, codeOrMessage, messageOrStatus, statusCode = 400) {
  let code = codeOrMessage;
  let message = messageOrStatus;
  let status = statusCode;

  if (typeof messageOrStatus === "number" && statusCode === 400) {
    status = messageOrStatus;
    message = codeOrMessage;
    code = null;
  }

  return res.status(status).json({
    success: false,
    code,
    message,
  });
}
