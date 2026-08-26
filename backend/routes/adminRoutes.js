import express from "express";
import {
  generateAIQuestion, saveAIQuestion,
  getAllUsers, createUser, resetUserPassword, updateUserRole, deleteUser,
  getAdminEvents, createEvent, updateEvent, deleteEvent,
  getAdminStats, triggerWeeklyReset,
  clearUserAttempts, resetUserXP,
  deleteTeam, deleteProject, getAllTeams,
  getAllScheduledTests, deleteScheduledTest, clearAllAttempts,
  exportAllData,
} from "../controllers/adminController.js";
import { requireAdmin, checkFeatureFlag } from "../middleware/authMiddleware.js";
import { exportUsers } from "../controllers/admin/users.js";
import { getActiveUsers } from "../services/realtime.js";

const router = express.Router();
router.use(requireAdmin);

// Active users snapshot (REST fallback)
router.get("/active-users", (req, res) => {
  res.json(getActiveUsers());
});

// AI
router.get("/generate",  generateAIQuestion);
router.post("/save",     saveAIQuestion);

// Stats
router.get("/stats",     getAdminStats);

// Users
router.get("/users",                         getAllUsers);
router.get("/users/export",                  exportUsers);
router.post("/users/create",                 createUser);          // ← NEW
router.post("/users/:userId/reset-password", resetUserPassword);
router.patch("/users/:userId/role",          updateUserRole);
router.delete("/users/:userId",              deleteUser);          // ← NEW

// Events (use getAdminEvents not getEvents to avoid naming clash)
router.get("/events",        getAdminEvents);
router.post("/events",       createEvent);
router.patch("/events/:id",  updateEvent);
router.delete("/events/:id", deleteEvent);

// Weekly reset
router.post("/reset-week", triggerWeeklyReset);

// Export (requires data_export feature)
router.get("/export",                     checkFeatureFlag("data_export"), exportAllData);

// Data management
router.get("/data/teams",                 getAllTeams);
router.delete("/data/teams/:teamId",      deleteTeam);
router.delete("/data/projects/:id",       deleteProject);
router.get("/data/tests",                 getAllScheduledTests);
router.delete("/data/tests/:testId",      deleteScheduledTest);
router.delete("/data/attempts/:userId",   clearUserAttempts);
router.patch("/data/reset-xp/:userId",    resetUserXP);
router.delete("/data/all-attempts",       clearAllAttempts);

export default router;