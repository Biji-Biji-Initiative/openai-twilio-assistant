"use client";

import ConsoleTabs from "@/components/ConsoleTabs";
import { useState } from "react";

export default function Page() {
  const [ready, setReady] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");

  return (
    <ConsoleTabs
      ready={ready}
      setReady={setReady}
      selectedPhoneNumber={selectedPhoneNumber}
      setSelectedPhoneNumber={setSelectedPhoneNumber}
    />
  );
}
