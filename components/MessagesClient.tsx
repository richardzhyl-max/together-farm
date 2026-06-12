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
    <main className="game-page">
      <div className="message-canvas">
        <div className="message-hills" />
        <TreeArt className="message-tree left" />
        <TreeArt className="message-tree right" />
        <FarmHouse className="message-house" />
        <div className="mailbox">
          <EnvelopeIcon className="h-12 w-14" />
          <span>每日第一张纸条，情侣值 +1</span>
        </div>

        <div className="note-wall">
          <div className="note-wall-title">我们的留言小屋</div>
          <div className="note-scroll">
            {!messages.length && (
              <div className="empty-mail">
                <EnvelopeIcon className="h-20 w-24" />
                <p>信箱还空着，写下第一张小纸条吧。</p>
              </div>
            )}
            {messages.map((message, index) => {
              const mine = message.user.id === userId;
              return (
                <article
                  key={message.id}
                  className={`wall-note note-color-${index % 4} ${mine ? "mine" : ""}`}
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

        <form onSubmit={send} className="mail-compose">
          <textarea
            name="content"
            rows={2}
            maxLength={300}
            required
            placeholder="写一张给对方的小纸条..."
          />
          <button disabled={busy}>
            <EnvelopeIcon className="h-9 w-11" />
            {busy ? "投递中" : "投入信箱"}
          </button>
        </form>

        {error && (
          <button className="game-toast error" onClick={() => setError("")}>{error}</button>
        )}
      </div>
      <Nav />
    </main>
  );
}
