import express from "express";
import cors from "cors";
import { config } from "@/config/env.ts";
import { errorHandler } from "@/middleware/error.ts";
import routes from "@/routes/index.ts";

// Create Express application
const app = express();

// CORS - Allow frontend to access backend
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "https://timeforge.mhga.dev", "https://timeforge.mhga.dev:3001"],
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(routes);

// Error handling (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.isDev ? "development" : "production"}`);
});

export default app;
