function getScopeSchoolId(req) {
  if (req.user.role === "ADMIN") {
    return req.query.schoolId || req.body.schoolId || null;
  }

  return req.user.schoolId;
}

function requireScopedSchoolId(req) {
  const schoolId = getScopeSchoolId(req);

  if (!schoolId) {
    const error = new Error("Un schoolId est requis pour cette action.");
    error.status = 400;
    throw error;
  }

  return schoolId;
}

module.exports = {
  getScopeSchoolId,
  requireScopedSchoolId,
};
