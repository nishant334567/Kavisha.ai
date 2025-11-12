import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

/**
 * Create or get user from database (used during login)
 */
export async function createOrGetUser(decodedToken) {
  await connectDB();
  let dbUser = await User.findOne({ email: decodedToken.email });

  if (!dbUser) {
    dbUser = await User.create({
      name: decodedToken.name,
      email: decodedToken.email,
      image: decodedToken.picture,
      profileType: null,
      isAdmin: false,
    });
  }

  return dbUser;
}
