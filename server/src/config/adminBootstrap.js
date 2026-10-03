import User from "../models/user.model.js";

/**
 * Safe idempotent admin bootstrap on server startup.
 * Creates system admin if missing; resets password only if ADMIN_BOOTSTRAP_RESET is explicitly 'true'.
 */
export const seedAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn("[Admin Bootstrap] ADMIN_EMAIL or ADMIN_PASSWORD not configured in process.env.");
      return;
    }

    const normalizedEmail = adminEmail.toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: normalizedEmail });

    const shouldReset = process.env.ADMIN_BOOTSTRAP_RESET === 'true';

    if (!existingAdmin) {
      await User.create({
        fullName: "System Admin",
        email: normalizedEmail,
        phone: "0000000000",
        password: adminPassword,
        role: "admin",
        availability: "not_available",
        isBlocked: false,
      });
      console.log(`[Admin Bootstrap] Safe bootstrap completed: Created admin user (${normalizedEmail}).`);
    } else {
      if (shouldReset) {
        existingAdmin.role = "admin";
        existingAdmin.password = adminPassword;
        await existingAdmin.save();
        console.log(`[Admin Bootstrap] Password reset synchronized for admin (${normalizedEmail}).`);
      } else {
        console.log(`[Admin Bootstrap] Admin account already exists (${normalizedEmail}). Existing password preserved.`);
      }
    }
  } catch (error) {
    console.error("[Admin Bootstrap] Admin bootstrap error:", error.message);
  }
};
