import {
  Battery,
  CheckCircle2,
  Globe,
  Headphones,
  Mic2,
  Network,
  RotateCcw,
  Speaker,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { DeviceResult, PageHeader } from "../components/ui";
import type { DeviceStatus } from "../types";
const initial: DeviceStatus[] = [
  { name: "Microphone", status: "Not tested", detail: "Input device waiting" },
  { name: "Headset", status: "Not tested", detail: "Output device waiting" },
  { name: "Speaker output", status: "Not tested", detail: "Default output" },
  { name: "Network latency", status: "Not tested", detail: "Not measured" },
  { name: "Packet loss", status: "Not tested", detail: "Not measured" },
  {
    name: "Browser compatibility",
    status: "Good",
    detail: "Modern browser detected",
  },
  { name: "Battery status", status: "Excellent", detail: "86% remaining" },
];
const icons = [Mic2, Headphones, Speaker, Network, Wifi, Globe, Battery];
export function DeviceTest() {
  const [tests, setTests] = useState(initial);
  const [running, setRunning] = useState(false);
  const run = (indices: number[]) => {
    setRunning(true);
    setTimeout(() => {
      setTests((x) =>
        x.map((t, i) =>
          indices.includes(i)
            ? {
                ...t,
                status: i === 4 ? "Good" : "Excellent",
                detail:
                  i === 0
                    ? "Input level stable"
                    : i === 1
                      ? "Stereo output ready"
                      : i === 2
                        ? "Output audible"
                        : i === 3
                          ? "32 ms"
                          : i === 4
                            ? "0.2% packet loss"
                            : t.detail,
              }
            : t,
        ),
      );
      setRunning(false);
    }, 1100);
  };
  return (
    <>
      <PageHeader
        title="Device Test"
        description="Check your setup before joining a live service."
      />
      <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
        This is a simulated test. No microphone, audio device, network
        diagnostic, or battery API is accessed.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((t, i) => {
          const Icon = icons[i];
          return (
            <article className="surface p-5" key={t.name}>
              <div className="flex items-center justify-between">
                <span className="rounded-xl bg-brand-500/10 p-3 text-brand-500">
                  <Icon />
                </span>
                <DeviceResult status={t.status} />
              </div>
              <h3 className="mt-5 font-bold">{t.name}</h3>
              <p className="mt-1 text-sm muted">{t.detail}</p>
              <p
                className={`mt-4 text-sm font-semibold ${t.status === "Not tested" ? "muted" : t.status === "Warning" || t.status === "Failed" ? "text-amber-500" : "text-emerald-500"}`}
              >
                {t.status}
              </p>
            </article>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          disabled={running}
          className="btn-primary"
          onClick={() => run([0])}
        >
          Start microphone test
        </button>
        <button
          disabled={running}
          className="btn-secondary"
          onClick={() => run([1, 2])}
        >
          Play headset test sound
        </button>
        <button
          disabled={running}
          className="btn-secondary"
          onClick={() => run([3, 4])}
        >
          Start connection test
        </button>
        <button className="btn-secondary" onClick={() => setTests(initial)}>
          <RotateCcw size={17} /> Reset test
        </button>
      </div>
      {running && (
        <div className="mt-4 flex items-center gap-2 text-sm text-brand-500">
          <CheckCircle2 className="animate-pulse" /> Running simulated check…
        </div>
      )}
    </>
  );
}
