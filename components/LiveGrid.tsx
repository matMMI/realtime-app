"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Cursor from "./Cursor";
import { AnimatedTooltip } from "./ui/animated-tooltip";

type Cell = {
  id: string;
  label: string;
  content: string;
};

type User = {
  presence_ref: string;
  user_name: string;
  color: string;
  x?: number;
  y?: number;
};

// Simple color generator
const getColor = (str: string) => {
  const colors = [
    "#ef4444",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function LiveGrid() {
  const [cells, setCells] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Record<string, User>>({}); // label -> User
  const [cursors, setCursors] = useState<Record<string, User>>({}); // presence_ref -> User with x,y
  const [myIdentity, setMyIdentity] = useState<{
    user_name: string;
    color: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const localCursorRef = useRef<HTMLDivElement>(null);
  const lastEmitRef = useRef<number>(0);
  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Initialize grid labels (3x3)
  const labels = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];

  useEffect(() => {
    // Generate identity
    const name = `User ${Math.floor(Math.random() * 1000)}`;
    const color = getColor(name);
    setMyIdentity({ user_name: name, color });

    // Fetch initial data
    const fetchCells = async () => {
      const { data } = await supabase.from("cells").select("*");
      if (data) {
        const cellMap: Record<string, string> = {};
        data.forEach((cell: any) => {
          cellMap[cell.label] = cell.content;
        });
        setCells(cellMap);
      }
    };
    fetchCells();

    // Realtime subscription
    const channel = supabase.channel("room1", {
      config: {
        presence: {
          key: name,
        },
      },
    });

    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cells" },
        (payload) => {
          const newCell = payload.new as Cell;
          setCells((prev) => ({ ...prev, [newCell.label]: newCell.content }));
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineUsers: User[] = [];
        for (const key in state) {
          // @ts-ignore
          state[key].forEach((u: any) => {
            // Don't add self to users list mostly for cursors logic if we want, but users list usually shows everyone
            if (
              u.presence_ref !==
              channel.presenceState()[name]?.[0]?.presence_ref
            ) {
              // Logic kept same as before
            }
            onlineUsers.push({
              presence_ref: u.presence_ref,
              user_name: key, // Using key as name passed in config
              color: getColor(key),
            });
          });
        }
        setUsers(onlineUsers);
      })
      .on("broadcast", { event: "editing" }, (payload) => {
        const { label, user, isEditing } = payload.payload;
        setEditing((prev) => {
          const newEditing = { ...prev };
          if (isEditing) {
            newEditing[label] = user;
          } else {
            delete newEditing[label];
          }
          return newEditing;
        });
      })
      .on("broadcast", { event: "cursor-pos" }, (payload) => {
        const { x, y, user } = payload.payload;
        setCursors((prev) => ({
          ...prev,
          [user.user_name]: { ...user, x, y },
        }));
      })
      .on("broadcast", { event: "input" }, (payload) => {
        const { label, value } = payload.payload;
        setCells((prev) => ({ ...prev, [label]: value }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_name: name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !myIdentity) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Direct DOM update for zero latency local cursor
    if (localCursorRef.current) {
      localCursorRef.current.style.transform = `translateX(${x}px) translateY(${y}px)`;
      localCursorRef.current.style.opacity = "1";
    }

    const now = Date.now();
    if (now - lastEmitRef.current < 30) return; // Throttle 30ms

    const channel = supabase
      .getChannels()
      .find((c) => c.topic === "realtime:room1");
    if (channel) {
      channel.send({
        type: "broadcast",
        event: "cursor-pos",
        payload: { x, y, user: myIdentity },
      });
      lastEmitRef.current = now;
    }
  };

  const handleMouseLeave = () => {
    if (localCursorRef.current) {
      localCursorRef.current.style.opacity = "0";
    }
  };

  const handleBlur = async (label: string, value: string) => {
    const channel = supabase
      .getChannels()
      .find((c) => c.topic === "realtime:room1");
    if (channel && myIdentity) {
      channel.send({
        type: "broadcast",
        event: "editing",
        payload: { label, user: myIdentity, isEditing: false },
      });
    }

    const { error } = await supabase
      .from("cells")
      .upsert({ label, content: value }, { onConflict: "label" });

    if (error) console.error("Error updating cell:", error);
  };

  const handleFocus = (label: string) => {
    const channel = supabase
      .getChannels()
      .find((c) => c.topic === "realtime:room1");
    if (channel && myIdentity) {
      channel.send({
        type: "broadcast",
        event: "editing",
        payload: { label, user: myIdentity, isEditing: true },
      });
    }
  };

  const handleChange = (label: string, value: string) => {
    setCells((prev) => ({ ...prev, [label]: value }));

    // Broadcast to other users immediately
    const channel = supabase
      .getChannels()
      .find((c) => c.topic === "realtime:room1");
    if (channel) {
      channel.send({
        type: "broadcast",
        event: "input",
        payload: { label, value },
      });
    }

    // Auto-save to database with debounce (500ms)
    if (saveTimerRef.current[label]) {
      clearTimeout(saveTimerRef.current[label]);
    }

    saveTimerRef.current[label] = setTimeout(async () => {
      const { error } = await supabase
        .from("cells")
        .upsert({ label, content: value }, { onConflict: "label" });

      if (error) console.error("Auto-save error:", error);
      delete saveTimerRef.current[label];
    }, 500);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="p-8 max-w-4xl mx-auto relative min-h-screen cursor-none"
    >
      {/* My Cursor (Direct DOM) */}
      {myIdentity && (
        <div
          ref={localCursorRef}
          style={{ opacity: 0 }}
          className="absolute top-0 left-0 pointer-events-none z-50 transition-opacity duration-150"
        >
          <Cursor
            x={0} // Transformations applied to parent div
            y={0}
            color={myIdentity.color}
            name={myIdentity.user_name}
          />
        </div>
      )}

      {/* Cursors Layer */}
      {Object.values(cursors).map(
        (cursor) =>
          cursor.user_name !== myIdentity?.user_name && (
            <Cursor
              key={cursor.user_name}
              x={cursor.x || 0}
              y={cursor.y || 0}
              color={cursor.color}
              name={cursor.user_name}
            />
          )
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          LiveGrid{" "}
          <span className="text-xs text-primary-foreground bg-primary px-2 py-1 rounded-full">
            Real-time
          </span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            {users.length} Online
          </span>
          <div className="flex flex-row items-center justify-center w-full">
            <AnimatedTooltip
              items={users.map((u, i) => ({
                id: i,
                name: u.user_name,
                designation: "Online User",
                color: u.color,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {labels.map((label) => {
          const editor = editing[label];
          const isBeingEdited = !!editor;

          return (
            <div key={label} className="relative">
              <input
                type="text"
                value={cells[label] || ""}
                onChange={(e) => handleChange(label, e.target.value)}
                onBlur={(e) => handleBlur(label, e.target.value)}
                onFocus={() => handleFocus(label)}
                className={`w-full h-24 text-center text-lg border-2 rounded-lg transition-all outline-none cursor-none bg-card text-card-foreground
                    ${
                      isBeingEdited
                        ? "border-[3px] animate-pulse"
                        : "border-border focus:border-primary focus:ring-2 focus:ring-ring"
                    }`}
                style={{
                  borderColor: isBeingEdited ? editor.color : undefined,
                  boxShadow: isBeingEdited
                    ? `0 0 20px ${editor.color}80, 0 0 40px ${editor.color}40, inset 0 0 20px ${editor.color}20`
                    : undefined,
                }}
                placeholder={label}
              />
              {isBeingEdited && (
                <div
                  className="absolute top-0 right-0 -mt-3 -mr-2 px-2 py-0.5 rounded text-xs text-white shadow-lg z-10 animate-pulse"
                  style={{ backgroundColor: editor.color }}
                >
                  ✏️ {editor.user_name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-sm text-muted-foreground text-center">
        Type in a cell to see updates. Focus a cell to show others you are
        editing. Move your mouse to show your cursor.
      </div>
    </div>
  );
}
