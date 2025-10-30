import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seedSuperAdmin() {
  const email = "admin@menuflow.com";
  const password = "admin123456";
  const name = "Super Admin";

  try {
    // Check if super admin already exists
    const existing = await storage.getSuperAdminByEmail(email);
    if (existing) {
      console.log("✅ Super admin already exists:");
      console.log("   Email:", email);
      console.log("   Password: (use the one you set)");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin
    const admin = await storage.createSuperAdmin({
      email,
      password: hashedPassword,
      name,
    });

    console.log("✅ Super admin created successfully!");
    console.log("   Email:", email);
    console.log("   Password:", password);
    console.log("   Name:", name);
    console.log("\n⚠️  IMPORTANT: Change this password after first login!");
    console.log("   Login at: /super-admin/login");
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
  }
}

seedSuperAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
