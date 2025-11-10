"use client";

import { useEffect, useState } from "react";
import { firebaseAuth } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function GreetPage() {
  const [user, setUser] = useState(() => firebaseAuth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (authUser) => {
      setUser(authUser);
    });

    return () => unsubscribe();
  }, []);

  if (!user) {
    return <p>Hello, guest!</p>;
  }

  const name = user.displayName || user.email || "there";

  return <p>Hello, {name}!</p>;
}
