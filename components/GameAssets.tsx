import type { CSSProperties } from "react";

type AssetProps = {
  className?: string;
  style?: CSSProperties;
};

export function CoinIcon({ className = "" }: AssetProps) {
  return <span className={`asset-coin ${className}`} aria-hidden="true">$</span>;
}

export function HeartIcon({ className = "" }: AssetProps) {
  return (
    <svg className={className} viewBox="0 0 64 58" aria-hidden="true">
      <path d="M32 54C25 46 7 35 7 19 7 5 25 1 32 13 39 1 57 5 57 19c0 16-18 27-25 35Z" fill="#f06b83" stroke="#9e3852" strokeWidth="5" />
      <path d="M17 15c3-5 8-5 11-2" fill="none" stroke="#ffc5cf" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function EnvelopeIcon({ className = "" }: AssetProps) {
  return (
    <svg className={className} viewBox="0 0 72 58" aria-hidden="true">
      <rect x="5" y="8" width="62" height="44" rx="8" fill="#fff5c9" stroke="#8b572d" strokeWidth="5" />
      <path d="m8 13 28 22 28-22M8 48l20-18m36 18L44 30" fill="none" stroke="#c78247" strokeWidth="4" strokeLinejoin="round" />
      <path d="M36 31c-7-7-15 2 0 12 15-10 7-19 0-12Z" fill="#ef7188" />
    </svg>
  );
}

export function WateringCan({ className = "" }: AssetProps) {
  return (
    <svg className={className} viewBox="0 0 90 70" aria-hidden="true">
      <path d="M28 27h43v34H28z" fill="#69b9d0" stroke="#285f73" strokeWidth="5" />
      <path d="M29 34 8 26l-4 10 25 13M67 29c19-16 26 7 10 17" fill="none" stroke="#285f73" strokeWidth="6" strokeLinecap="round" />
      <path d="M37 21c0-14 24-14 24 0" fill="none" stroke="#285f73" strokeWidth="6" />
      <path d="M10 47c-7 8-4 14 2 14s9-6 2-14Z" fill="#5ed5ff" />
    </svg>
  );
}

export function BasketIcon({ className = "" }: AssetProps) {
  return (
    <svg className={className} viewBox="0 0 80 68" aria-hidden="true">
      <path d="M16 29h48l-6 31H22Z" fill="#c77b37" stroke="#73401d" strokeWidth="5" />
      <path d="M27 30c0-25 26-25 26 0M21 41h38M26 51h28M34 31l-3 29m15-29 3 29" fill="none" stroke="#8b4d24" strokeWidth="4" />
    </svg>
  );
}

export function CropArt({ cropKey, stage = "mature", className = "" }: { cropKey?: string | null; stage?: "young" | "mid" | "mature" | "withered"; className?: string }) {
  if (stage === "withered") {
    return (
      <svg className={className} viewBox="0 0 90 100" aria-hidden="true">
        <path d="M47 90 43 38M44 57 25 46m19 26 20-17" stroke="#705b47" strokeWidth="7" strokeLinecap="round" />
        <path d="M22 43c14-4 19 3 20 14-13 1-20-4-20-14Zm45 8c-14-1-20 6-21 17 14-1 20-6 21-17Z" fill="#8b826b" stroke="#5f584a" strokeWidth="4" />
      </svg>
    );
  }
  const scale = stage === "young" ? 0.62 : stage === "mid" ? 0.82 : 1;
  const common = { transform: `translate(45px 93px) scale(${scale}) translate(-45px -93px)`, transformOrigin: "45px 93px" };
  if (cropKey === "radish") return <svg className={className} viewBox="0 0 90 100"><g style={common}><path d="M43 88C17 70 23 38 45 36c22 2 27 34 0 52Z" fill="#f47d45" stroke="#9d3b24" strokeWidth="5" /><path d="M45 39C32 29 27 15 35 8c9 9 10 18 10 31Zm2 0c11-14 18-18 26-13-5 11-13 15-26 13Z" fill="#60a94e" stroke="#34733a" strokeWidth="5" strokeLinejoin="round" /></g></svg>;
  if (cropKey === "wheat") return <svg className={className} viewBox="0 0 90 100"><g style={common} fill="none" strokeLinecap="round"><path d="M45 92V19M45 37 31 25m14 27 16-13M45 66 28 52m17 29 18-17" stroke="#8a5e24" strokeWidth="6" /><path d="M28 25c9-3 15 3 16 12-9 2-15-3-16-12Zm34 12c-9-2-15 4-16 13 9 1 15-4 16-13ZM25 50c11-2 18 5 18 15-11 1-17-5-18-15Zm40 12c-11-1-18 6-18 16 11 0 17-6 18-16Z" fill="#f2c850" stroke="#a87428" strokeWidth="4" /></g></svg>;
  if (cropKey === "tomato") return <svg className={className} viewBox="0 0 90 100"><g style={common}><path d="M45 90V26M45 51 27 40m18 25 19-13" stroke="#34733a" strokeWidth="7" strokeLinecap="round" /><circle cx="27" cy="48" r="16" fill="#ef5545" stroke="#9d3028" strokeWidth="5" /><circle cx="63" cy="61" r="17" fill="#ef5545" stroke="#9d3028" strokeWidth="5" /><path d="m27 34 4 9 9 2-8 5m31-4 3 9 9 2-8 5" fill="#5a9d43" /></g></svg>;
  if (cropKey === "strawberry") return <svg className={className} viewBox="0 0 90 100"><g style={common}><path d="M45 93V25M45 48 25 38m20 25 20-14" stroke="#34733a" strokeWidth="7" strokeLinecap="round" /><path d="M12 43c1-15 27-15 29 0-1 22-14 30-14 30S13 65 12 43Zm37 12c1-16 27-16 29 0-1 22-14 30-14 30S50 77 49 55Z" fill="#ef4b59" stroke="#9d3040" strokeWidth="5" /><path d="m17 38 10-7 10 7m17 12 10-7 10 7" fill="none" stroke="#4f963e" strokeWidth="6" /></g></svg>;
  if (cropKey === "starflower") return <svg className={className} viewBox="0 0 90 100"><g style={common}><path d="M45 94V43" stroke="#397c43" strokeWidth="7" strokeLinecap="round" /><path d="m45 8 9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3Z" fill="#ffd95b" stroke="#b9792d" strokeWidth="5" /><circle cx="45" cy="37" r="8" fill="#f29b38" /></g></svg>;
  return <svg className={className} viewBox="0 0 90 100"><path d="M45 94V45M44 61C24 60 18 48 20 37c15-1 24 7 24 24Zm2-5c20-1 26-13 24-24-15 0-24 8-24 24Z" stroke="#34733a" strokeWidth="7" fill="#65ad4f" strokeLinejoin="round" /></svg>;
}

export function FarmHouse({ className = "" }: AssetProps) {
  return <svg className={className} viewBox="0 0 180 160"><path d="M25 73h130v77H25Z" fill="#f5d58a" stroke="#75431f" strokeWidth="7" /><path d="m12 79 78-66 78 66Z" fill="#d7553f" stroke="#75382b" strokeWidth="8" strokeLinejoin="round" /><rect x="70" y="92" width="40" height="58" rx="4" fill="#8b572d" stroke="#643818" strokeWidth="6" /><rect x="35" y="91" width="27" height="27" fill="#a9e4f1" stroke="#70401f" strokeWidth="6" /><rect x="118" y="91" width="27" height="27" fill="#a9e4f1" stroke="#70401f" strokeWidth="6" /><path d="M129 40V10h18v47" fill="#bd7b4b" stroke="#70401f" strokeWidth="6" /></svg>;
}

export function TreeArt({ className = "", style }: AssetProps) {
  return <svg className={className} style={style} viewBox="0 0 120 150"><path d="M49 140h25L68 79H54Z" fill="#8d512b" stroke="#633719" strokeWidth="6" /><path d="M61 104 35 83m29 5 27-25" fill="none" stroke="#633719" strokeWidth="8" strokeLinecap="round" /><circle cx="34" cy="67" r="29" fill="#4f9f48" stroke="#2f7037" strokeWidth="7" /><circle cx="77" cy="49" r="34" fill="#62b653" stroke="#2f7037" strokeWidth="7" /><circle cx="82" cy="85" r="28" fill="#58aa4c" stroke="#2f7037" strokeWidth="7" /><circle cx="55" cy="28" r="26" fill="#71c35f" stroke="#2f7037" strokeWidth="7" /></svg>;
}

export function FenceArt({ className = "" }: AssetProps) {
  return <svg className={className} viewBox="0 0 220 60"><g fill="#d9a35d" stroke="#74431f" strokeWidth="5"><path d="M12 55V9l11-7 11 7v46ZM91 55V9l11-7 11 7v46Zm81 0V9l11-7 11 7v46Z" /><path d="M20 18h171v13H20Zm0 24h171v13H20Z" /></g></svg>;
}

export function DecorationArt({ decorationKey, className = "" }: { decorationKey: string; className?: string }) {
  if (decorationKey === "fence") return <FenceArt className={className} />;
  if (decorationKey === "flowerbed") return <svg className={className} viewBox="0 0 120 70"><path d="M9 48h102l-10 17H20Z" fill="#a76539" stroke="#68391e" strokeWidth="5" /><g stroke="#397c43" strokeWidth="4"><path d="M28 49V20m31 29V13m31 36V22" /></g><g fill="#f16e86" stroke="#a33d55" strokeWidth="3"><circle cx="28" cy="18" r="10" /><circle cx="59" cy="12" r="11" /><circle cx="90" cy="20" r="10" /></g></svg>;
  if (decorationKey === "swing") return <svg className={className} viewBox="0 0 130 120"><path d="M14 110 43 14h44l29 96M49 24v54m32-54v54" fill="none" stroke="#75431f" strokeWidth="8" strokeLinecap="round" /><path d="M42 78h47v15H42Z" fill="#d99a51" stroke="#75431f" strokeWidth="6" /></svg>;
  if (decorationKey === "lamp") return <svg className={className} viewBox="0 0 70 130"><path d="M35 126V51" stroke="#43525b" strokeWidth="8" /><path d="M16 46h38l-7-33H23Z" fill="#ffe189" stroke="#644929" strokeWidth="6" /><path d="M20 126h30" stroke="#43525b" strokeWidth="9" strokeLinecap="round" /></svg>;
  if (decorationKey === "heartarch") return <svg className={className} viewBox="0 0 150 145"><path d="M19 140V67C19 17 131 17 131 67v73" fill="none" stroke="#e87989" strokeWidth="13" /><path d="M75 39C60 19 36 43 75 68c39-25 15-49 0-29Z" fill="#f6a4ae" stroke="#a84f62" strokeWidth="5" /></svg>;
  if (decorationKey === "path") return <svg className={className} viewBox="0 0 130 70"><g fill="#d8c89f" stroke="#978465" strokeWidth="4"><ellipse cx="22" cy="38" rx="18" ry="12" /><ellipse cx="61" cy="24" rx="20" ry="13" /><ellipse cx="103" cy="41" rx="22" ry="14" /></g></svg>;
  return <TreeArt className={className} />;
}

export function PetArt({ petKey, className = "" }: { petKey: string; className?: string }) {
  const colors: Record<string, [string, string]> = {
    dog: ["#d99a55", "#75431f"],
    cat: ["#e7b76f", "#6e4b35"],
    rabbit: ["#f3ece5", "#ad8b83"],
    fairy: ["#b38cf0", "#644596"],
  };
  const [body, line] = colors[petKey] || colors.dog;
  const ears = petKey === "rabbit" ? <><ellipse cx="36" cy="17" rx="10" ry="26" fill={body} stroke={line} strokeWidth="5" /><ellipse cx="64" cy="17" rx="10" ry="26" fill={body} stroke={line} strokeWidth="5" /></> : <><path d="M25 35 14 15c18-2 25 8 25 20" fill={body} stroke={line} strokeWidth="5" /><path d="m75 35 11-20c-18-2-25 8-25 20" fill={body} stroke={line} strokeWidth="5" /></>;
  return <svg className={className} viewBox="0 0 100 105">{ears}<ellipse cx="50" cy="65" rx="36" ry="33" fill={body} stroke={line} strokeWidth="6" /><circle cx="38" cy="59" r="4" fill={line} /><circle cx="62" cy="59" r="4" fill={line} /><path d="M45 70q5 7 10 0" fill="none" stroke={line} strokeWidth="4" strokeLinecap="round" /><path d="M28 94v8m44-8v8" stroke={line} strokeWidth="7" strokeLinecap="round" />{petKey === "fairy" && <><path d="M17 56C-3 34 4 21 27 42m56 14c20-22 13-35-10-14" fill="#bceeff" stroke="#644596" strokeWidth="4" /><circle cx="50" cy="25" r="7" fill="#ffe76e" /></>}</svg>;
}
