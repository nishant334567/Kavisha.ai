import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

/**
 * Get user from database by email
 */
export async function getUserFromDB(email) {
  await connectDB();
  const dbUser = await User.findOne({ email });
  if (!dbUser) return null;

  return {
    id: dbUser._id.toString(),
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    profileType: dbUser.profileType,
    isAdmin: dbUser.isAdmin || false,
  };
}
