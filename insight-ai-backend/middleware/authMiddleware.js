export const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.suspended) {
    return res.status(403).json({
      success: false,
      message: "Your account has been suspended",
    });
  }

  next();
};