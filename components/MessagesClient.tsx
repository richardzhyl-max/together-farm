"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Nav from "@/components/Nav";

type Message = { id: string; content: string; createdAt: string; user: { id: string; username: string } };

export default function MessagesClient({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [farmId, setFarmId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/messages", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) { setMessages(data.messages); setFarmId(data.farmId); } else setError(data.error);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!farmId) return;
    const socket = io({ path: "/socket.io" }); socket.emit("farm:join", farmId); socket.on("message:update", load);
    return () => { socket.disconnect(); };
  }, [farmId, load]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: data.get("content") }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setError(result.error);
    form.reset(); await load();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-28 pt-6">
      <header className="card p-5"><p className="text-sm text-slate-500">只让彼此看见的小角落</p><h1 className="text-3xl font-black">情侣留言板 💌</h1><p className="mt-1 text-sm text-rose-600">每天首次留言，情侣值 +1</p></header>
      {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-red-700">{error}</p>}
      <section className="mt-4 flex-1 space-y-3 rounded-[32px] bg-white/50 p-4">
        {!messages.length && <div className="py-20 text-center text-slate-400"><div className="text-6xl">✉️</div><p className="mt-3">写下第一句话吧。</p></div>}
        {messages.map((message) => {
          const mine = message.user.id === userId;
          return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-3xl px-4 py-3 ${mine ? "rounded-br-md bg-leaf text-white" : "rounded-bl-md bg-white shadow-sm"}`}><p className={`mb-1 text-xs font-bold ${mine ? "text-green-100" : "text-rose-600"}`}>{message.user.username}</p><p className="whitespace-pre-wrap break-words">{message.content}</p><p className={`mt-1 text-right text-[10px] ${mine ? "text-green-100" : "text-slate-400"}`}>{new Date(message.createdAt).toLocaleString("zh-CN")}</p></div></div>;
        })}
        <div ref={bottom} />
      </section>
      <form onSubmit={send} className="sticky bottom-24 mt-4 flex gap-2 rounded-3xl bg-white/90 p-2 shadow-soft backdrop-blur"><textarea name="content" rows={1} maxLength={300} required placeholder="给对方留句话..." className="input resize-none" /><button disabled={busy} className="btn-primary shrink-0">{busy ? "..." : "发送"}</button></form>
      <Nav />
    </main>
  );
}
