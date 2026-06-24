function isDefaultZodMessage(message = "") {
  return /^(Too small:|Too big:|Invalid )/.test(message);
}

function formatZodIssue(issue) {
  if (issue?.message && !isDefaultZodMessage(issue.message)) {
    return issue.message;
  }

  switch (issue?.code) {
    case "too_small":
      if (issue.origin === "string") {
        return issue.minimum <= 1
          ? "Ce champ est obligatoire."
          : `Ce champ doit contenir au moins ${issue.minimum} caracteres.`;
      }

      if (issue.origin === "number") {
        return `Cette valeur doit etre superieure ou egale a ${issue.minimum}.`;
      }

      if (issue.origin === "array") {
        return `Selectionne au moins ${issue.minimum} element(s).`;
      }

      return "La valeur saisie est trop courte.";

    case "too_big":
      if (issue.origin === "string") {
        return `Ce champ doit contenir au maximum ${issue.maximum} caracteres.`;
      }

      if (issue.origin === "number") {
        return `Cette valeur doit etre inferieure ou egale a ${issue.maximum}.`;
      }

      return "La valeur saisie est trop longue.";

    case "invalid_format":
      if (issue.format === "email") {
        return "Merci de saisir une adresse email valide.";
      }

      return "Le format saisi est invalide.";

    case "invalid_type":
      if (issue.expected === "number") {
        return "Ce champ doit contenir un nombre valide.";
      }

      if (issue.expected === "string") {
        return "Ce champ est obligatoire.";
      }

      return "Le type de valeur envoye est invalide.";

    case "invalid_value":
      return "La valeur choisie est invalide.";

    default:
      return issue?.message || "La valeur envoyee est invalide.";
  }
}

function serializeZodIssues(error) {
  return (error?.issues || []).map((issue) => ({
    path: Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path || ""),
    message: formatZodIssue(issue),
  }));
}

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

  return res.status(status).json({
    message,
    ...(isZodError ? { issues: serializeZodIssues(error) } : {}),
  });
}

module.exports = errorHandler;
