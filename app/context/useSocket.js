import { useContext } from "react";
import { SocketContext } from "./SocketContext";

export default function useSocket() {
  const { socket, isOnline } = useContext(SocketContext);
  return { socket, isOnline };
}
