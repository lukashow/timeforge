import { Router } from "express";
import type { Request, Response } from "express";
import { pb } from "@/lib/pocketbase.ts";

const router = Router();

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  token?: string;
  error?: string;
}

/**
 * Login endpoint
 * POST /api/auth/login
 */
router.post("/login", async (req: Request<object, AuthResponse, LoginRequest>, res: Response<AuthResponse>) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Authenticate with PocketBase
    const authData = await pb.collection("users").authWithPassword(email, password);
    const record = authData.record;

    // Get avatar URL if available
    let avatarUrl: string | undefined;
    if (record.avatar) {
      avatarUrl = pb.files.getURL(record, record.avatar);
    }

    res.json({
      success: true,
      user: {
        id: record.id,
        email: record.email || "",
        name: record.name || record.username || record.email?.split("@")[0] || "User",
        avatar: avatarUrl,
      },
      token: authData.token,
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(401).json({
      success: false,
      error: "Invalid email or password",
    });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get("/me", async (req: Request, res: Response<AuthResponse>) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Invalid token format",
      });
    }
    
    // Set the auth token and refresh auth data
    pb.authStore.save(token, null);
    
    // Verify token by fetching current user
    const record = await pb.collection("users").authRefresh();
    const user = record.record;

    let avatarUrl: string | undefined;
    if (user.avatar) {
      avatarUrl = pb.files.getURL(user, user.avatar);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email || "",
        name: user.name || user.username || user.email?.split("@")[0] || "User",
        avatar: avatarUrl,
      },
      token: record.token,
    });
  } catch (error) {
    console.error("Auth check failed:", error);
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
});

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
router.post("/logout", (_req: Request, res: Response) => {
  // Clear PocketBase auth store on server
  pb.authStore.clear();
  res.json({ success: true });
});

export default router;
