import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

/**
 * Create or get user from database (used during login)
 */
export async function createOrGetUser(decodedToken) {
  console.log(
    "Token values:\n",
    "name:",
    decodedToken.name,
    "email:",
    decodedToken.email
  );
  await connectDB();
  let dbUser = await User.findOne({ email: decodedToken.email });
  if (dbUser) console.log("User exists already in db: ", dbUser);
  if (!dbUser) {
    console.log("Creating new user in db for:", decodedToken.email);
    dbUser = await User.create({
      name: decodedToken.name,
      email: decodedToken.email,
      image: decodedToken.picture,
      profileType: null,
      isAdmin: false,
    });
  }
  console.log("final User check:", dbUser);
  return dbUser;
}
