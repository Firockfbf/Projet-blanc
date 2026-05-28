function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const isZodError = error?.name === "ZodError";
  const isUniqueError =
    typeof error?.message === "string" &&
    error.message.includes("UNIQUE constraint failed");
  const status = error.status || (isZodError || isUniqueError ? 400 : 500);
  const message = isZodError
    ? "Les donnees envoyees sont invalides."
    : isUniqueError
      ? "Une valeur unique existe deja."
    : status >= 500
      ? "Une erreur interne est survenue."
      : error.message;

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({ message });
}

module.exports = errorHandler;
