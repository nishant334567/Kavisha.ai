"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/app/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const provider = new GoogleAuthProvider();

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { user } = await signInWithPopup(firebaseAuth, provider);
      console.log("User: ", user);
      router.push("/test/greet");
    } catch (err) {
    } finally {
      setLoading(false);
    }

    setLoading(false);
  };

  return (
    <button onClick={handleGoogle} disabled={loading}>
      Sign in with Google
    </button>
  );
}
