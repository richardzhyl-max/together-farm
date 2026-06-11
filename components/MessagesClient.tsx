"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Nav from "@/components/Nav";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string };
};

export default function MessagesClient({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [farmId, setFarmId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/messages", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setMessages(data.messages);
      setFarmId(data.farmId);
    } else {
      setError(data.error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!farmId) return;
    const socket = io({ path: "/socket.io" });
    socket.emit("farm:join", farmId);
    socket.on("message:update", load);
    socket.on("farm:error", ({ message }) => setError(message));
    return () => {
      socket.disconnect();
    };
  }, [farmId, load]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: data.get("content") }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setError(result.error);
    form.reset();
    await load();
  }

  return (
    <main className="farm-world min-h-screen pb-28 pt-4">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col px-3 sm:px-6">
        <header className="hud rounded-[28px] p-5 text-white">
          <p className="text-xs font-bold text-green-100">只让彼此看见的小角落</p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-black drop-shadow sm:text-3xl">情侣留言板 💌</h1>
            <span className="hud-pill whitespace-nowrap text-xs">每日首条 💛 +1</span>
          </div>
        </header>

        {error && (
          <button
            onClick={() => setError("")}
            className="mt-4 rounded-2xl bg-red-600 p-3 font-bold text-white"
          >
            {error}
          </button>
        )}

        <section className="game-panel relative mt-5 flex-1 overflow-hidden p-4 sm:p-6">
          <div className="pointer-events-none absolute left-5 top-3 text-3xl">🌸</div>
          <div className="pointer-events-none absolute right-5 top-4 text-3xl">🌿</div>
          <div className="mx-auto mb-5 w-fit rotate-1 rounded-xl bg-rose-300/80 px-5 py-2 text-sm font-black text-rose-950 shadow">
            我们的小纸条
          </div>
          <div className="space-y-5">
            {!messages.length && (
              <div className="py-20 text-center text-green-900/40">
                <div className="crop-bob text-6xl">✉️</div>
                <p className="mt-3 font-bold">写下第一张小纸条吧</p>
              </div>
            )}
            {messages.map((message, index) => {
              const mine = message.user.id === userId;
              return (
                <div
                  key={message.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <article
                    className={`paper-note max-w-[86%] rounded-md px-5 py-4 ${
                      mine ? "rotate-1" : "-rotate-1"
                    } ${index % 3 === 1 ? "!bg-[#f1ffe3]" : ""}`}
                  >
                    <p className={`mb-1 text-xs font-black ${mine ? "text-rose-600" : "text-green-700"}`}>
                      {mine ? "我" : message.user.username}
                    </p>
                    <p className="whitespace-pre-wrap break-words leading-7">{message.content}</p>
                    <p className="mt-2 text-right text-[10px] text-amber-900/45">
                      {new Date(message.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </article>
                </div>
              );
            })}
            <div ref={bottom} />
          </div>
        </section>

        <form
          onSubmit={send}
          className="game-nav sticky bottom-24 mt-4 flex gap-2 rounded-[26px] p-2"
        >
          <textarea
            name="content"
            rows={1}
            maxLength={300}
            required
            placeholder="写一张给对方的小纸条..."
            className="input resize-none !border-amber-200 !bg-[#fffdf0]"
          />
          <button disabled={busy} className="btn-primary shrink-0">
            {busy ? "..." : "💌 发送"}
          </button>
        </form>
      </div>
      <Nav />
    </main>
  );
}
