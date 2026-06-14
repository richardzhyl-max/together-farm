"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SceneAsset } from "@/components/game/FarmGameScene";
import { FARM_VISUAL_ASSETS } from "@/lib/visual-layout";

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
  const noteScroll = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    const container = noteScroll.current;
    if (container) container.scrollTop = container.scrollHeight;
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
    <main className="messages-visual-page">
      <div className="messages-game-scene">
        <Image
          className="messages-scene-background"
          src={FARM_VISUAL_ASSETS.background.src}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 860px"
        />
        <div className="messages-scene-wash" />

        <header className="messages-title-sign">
          <SceneAsset asset={FARM_VISUAL_ASSETS.hud.farmSign} label="留言小屋招牌" fill />
          <span>
            <b>情侣留言小屋</b>
            <small>只属于我们的悄悄话</small>
          </span>
        </header>

        <section className="messages-reward-note">
          <span className="messages-reward-icon">
            <SceneAsset
              asset={FARM_VISUAL_ASSETS.hud.messagesButton}
              label="留言信箱"
              fill
            />
          </span>
          <span>
            <b>每日甜蜜奖励</b>
            <small>每天第一张纸条，情侣值 +1</small>
          </span>
        </section>

        <section className="messages-note-board">
          <span className="messages-board-background" aria-hidden="true">
            <SceneAsset asset={FARM_VISUAL_ASSETS.dialog.panel} label="留言墙面板" fill />
          </span>
          <h1>我们的留言墙</h1>
          <div ref={noteScroll} className="messages-note-scroll">
            {!messages.length && (
              <div className="messages-empty-mail">
                <span>
                  <SceneAsset
                    asset={FARM_VISUAL_ASSETS.hud.messagesButton}
                    label="空信箱"
                    fill
                  />
                </span>
                <p>信箱还空着，写下第一张小纸条吧。</p>
              </div>
            )}
            {messages.map((message, index) => {
              const mine = message.user.id === userId;
              return (
                <article
                  key={message.id}
                  className={`messages-note color-${index % 4} ${mine ? "mine" : ""}`}
                >
                  <span className="messages-note-paper" aria-hidden="true">
                    <SceneAsset
                      asset={FARM_VISUAL_ASSETS.dialog.seedCard}
                      label="留言纸条"
                      fill
                    />
                  </span>
                  <div>
                    <b>{mine ? "我" : message.user.username}</b>
                    <p>{message.content}</p>
                    <time>{new Date(message.createdAt).toLocaleString("zh-CN")}</time>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <form onSubmit={send} className="messages-compose">
          <textarea
            name="content"
            rows={3}
            maxLength={300}
            required
            placeholder="写一张给对方的小纸条..."
          />
          <button disabled={busy}>
            <span>
              <SceneAsset
                asset={FARM_VISUAL_ASSETS.hud.messagesButton}
                label="投递留言"
                fill
              />
            </span>
            <b>{busy ? "投递中" : "投入信箱"}</b>
          </button>
        </form>

        {error && (
          <button className="messages-visual-toast error" onClick={() => setError("")}>
            {error}
          </button>
        )}

        <nav className="messages-visual-nav" aria-label="游戏导航">
          <Link href="/farm">
            <span className="messages-nav-art farm-art">
              <SceneAsset asset={FARM_VISUAL_ASSETS.plots.empty} label="农场" fill />
            </span>
            <b>农场</b>
          </Link>
          <Link href="/shop">
            <span className="messages-nav-art">
              <SceneAsset asset={FARM_VISUAL_ASSETS.hud.shopButton} label="商店" fill />
            </span>
            <b>商店</b>
          </Link>
          <Link href="/messages" className="active">
            <span className="messages-nav-art">
              <SceneAsset asset={FARM_VISUAL_ASSETS.hud.messagesButton} label="留言" fill />
            </span>
            <b>留言</b>
          </Link>
        </nav>
      </div>
    </main>
  );
}
