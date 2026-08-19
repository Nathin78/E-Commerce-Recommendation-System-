import { useEffect, useState } from "react";

function format(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export default function useCountdown(targetTime, serverNow) {
  const getRemaining = () => Math.max(0, new Date(targetTime).getTime() - (serverNow || Date.now()));
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    setRemaining(getRemaining());
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [targetTime, serverNow]);

  return {
    remaining,
    label: format(remaining),
    expired: remaining <= 0
  };
}
