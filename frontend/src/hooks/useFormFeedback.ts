import axios from "axios";
import { useState } from "react";

export type FieldErrors = Record<string, string>;
export type FieldAliases = Record<string, string>;

type ApiIssue = {
  path?: string | string[];
  message?: string;
};

type ApiErrorPayload = {
  message?: string;
  issues?: ApiIssue[];
};

function normalizePath(path?: string | string[]) {
  if (Array.isArray(path)) {
    return path.join(".");
  }

  return path ?? "";
}

function getFormFeedback(error: unknown, aliases: FieldAliases = {}) {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return {
      formError: "Une erreur est survenue. Reessaie.",
      fieldErrors: {} as FieldErrors,
    };
  }

  const payload = error.response?.data;
  const fieldErrors: FieldErrors = {};

  for (const issue of payload?.issues ?? []) {
    const issuePath = normalizePath(issue.path);

    if (!issuePath || !issue.message) {
      continue;
    }

    const key = aliases[issuePath] ?? issuePath;

    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return {
    formError:
      Object.keys(fieldErrors).length > 0
        ? "Merci de corriger les champs en erreur."
        : payload?.message || "Une erreur est survenue.",
    fieldErrors,
  };
}

export default function useFormFeedback() {
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const resetFeedback = () => {
    setFormError(null);
    setFieldErrors({});
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const applyApiError = (error: unknown, aliases: FieldAliases = {}) => {
    const feedback = getFormFeedback(error, aliases);
    setFormError(feedback.formError);
    setFieldErrors(feedback.fieldErrors);
  };

  return {
    formError,
    fieldErrors,
    resetFeedback,
    clearFieldError,
    applyApiError,
  };
}
