const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const schoolRoutes = require("./routes/school.routes");
const formationRoutes = require("./routes/formations.routes");
const studentRoutes = require("./routes/students.routes");
const certificateRoutes = require("./routes/certificates.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middleware/error-handler");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    name: "CertiCampus API",
    status: "ok",
    frontendUrl: "http://localhost:5173",
    healthcheck: "/api/health",
    routes: {
      auth: "/api/auth",
      school: "/api/school",
      formations: "/api/formations",
      students: "/api/students",
      certificates: "/api/certificates",
      admin: "/api/admin",
    },
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "Bienvenue sur l'API CertiCampus.",
    healthcheck: "/api/health",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/school", schoolRoutes);
app.use("/api/formations", formationRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable." });
});

app.use(errorHandler);

module.exports = app;
