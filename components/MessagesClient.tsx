"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { EnvelopeIcon, FarmHouse, TreeArt } from "@/components/GameAssets";
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

  useEffect(() => void load(), [load]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
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
    <main className="pixel-game-page">
      <div className="pixel-game-canvas message-scene">
        <div className="message-pixel-map">
          <TreeArt className="message-pixel-tree left" />
          <TreeArt className="message-pixel-tree right" />
          <FarmHouse className="message-pixel-house" />
          <div className="pixel-mailbox">
            <EnvelopeIcon />
            <span>每日第一张纸条，情侣值 +1</span>
          </div>
        </div>

        <div className="pixel-note-board">
          <div className="pixel-note-title">COUPLE MESSAGE WALL</div>
          <div className="pixel-note-scroll">
            {!messages.length && (
              <div className="pixel-empty-mail">
                <EnvelopeIcon />
                <p>信箱还空着，写下第一张小纸条吧。</p>
              </div>
            )}
            {messages.map((message, index) => {
              const mine = message.user.id === userId;
              return (
                <article
                  key={message.id}
                  className={`pixel-note color-${index % 4} ${mine ? "mine" : ""}`}
                >
                  <b>{mine ? "我" : message.user.username}</b>
                  <p>{message.content}</p>
                  <time>{new Date(message.createdAt).toLocaleString("zh-CN")}</time>
                </article>
              );
            })}
            <div ref={bottom} />
          </div>
        </div>

        <form onSubmit={send} className="pixel-mail-compose">
          <textarea
            name="content"
            rows={2}
            maxLength={300}
            required
            placeholder="写一张给对方的小纸条..."
          />
          <button disabled={busy}>
            <EnvelopeIcon />
            {busy ? "投递中" : "投入信箱"}
          </button>
        </form>

        {error && (
          <button className="pixel-toast error" onClick={() => setError("")}>
            {error}
          </button>
        )}
      </div>
      <Nav />
    </main>
  );
}
