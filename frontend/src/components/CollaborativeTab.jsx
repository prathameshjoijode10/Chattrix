import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, PencilBrush } from "fabric";
import { createSocket } from "../lib/socket";

const MIN_CANVAS_HEIGHT = 320;

const throttle = (fn, ms) => {
  let last = 0;
  let timeout = null;
  let pendingArgs = null;

  return (...args) => {
    const now = Date.now();
    const remaining = ms - (now - last);

    pendingArgs = args;

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      last = now;
      fn(...pendingArgs);
      pendingArgs = null;
      return;
    }

    if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now();
        timeout = null;
        fn(...(pendingArgs || []));
        pendingArgs = null;
      }, remaining);
    }
  };
};

const CollaborativeTab = ({ roomId, userId, className = "" }) => {
  const wrapperRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const applyingRemoteCanvasRef = useRef(false);
  const sizeRef = useRef({ width: 900, height: 450 });

  const toolRef = useRef("pen");
  const colorRef = useRef("#2563eb");

  const socketRef = useRef(null);

  const [remoteCursors, setRemoteCursors] = useState({});

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#2563eb");

  const roomKey = useMemo(() => String(roomId || ""), [roomId]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  const getBoardBackgroundColor = () => {
    const el = wrapperRef.current;
    if (!el) return "#ffffff";
    const computed = window.getComputedStyle(el);
    return computed?.backgroundColor || "#ffffff";
  };

  const applyBrush = (canvas) => {
    if (!canvas) return;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 3;

    if (toolRef.current === "eraser") {
      canvas.freeDrawingBrush.color = getBoardBackgroundColor();
    } else {
      canvas.freeDrawingBrush.color = colorRef.current;
    }
  };

  useEffect(() => {
    if (!roomKey) return;

    const socket = createSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("collab:join", { roomId: roomKey, userId });
    });

    socket.on("collab:state", ({ canvasJson } = {}) => {
      if (canvasJson && fabricCanvasRef.current) {
        applyingRemoteCanvasRef.current = true;
        fabricCanvasRef.current.loadFromJSON(canvasJson, () => {
          applyBrush(fabricCanvasRef.current);
          fabricCanvasRef.current.renderAll();
          applyingRemoteCanvasRef.current = false;
        });
      }
    });

    socket.on("whiteboard:canvas", ({ canvasJson } = {}) => {
      if (!canvasJson || !fabricCanvasRef.current) return;
      applyingRemoteCanvasRef.current = true;
      fabricCanvasRef.current.loadFromJSON(canvasJson, () => {
        applyBrush(fabricCanvasRef.current);
        fabricCanvasRef.current.renderAll();
        applyingRemoteCanvasRef.current = false;
      });
    });

    socket.on("whiteboard:mouse-move", ({ socketId, x, y } = {}) => {
      if (!socketId) return;
      if (typeof x !== "number" || typeof y !== "number") return;
      setRemoteCursors((prev) => ({
        ...prev,
        [socketId]: { x, y, ts: Date.now() },
      }));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomKey, userId]);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: sizeRef.current.width,
      height: sizeRef.current.height,
      selection: false,
      preserveObjectStacking: true,
    });

    // Ensure drawing works on touch/trackpad devices.
    try {
      if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.touchAction = "none";
    } catch {
      // ignore
    }

    applyBrush(canvas);

    fabricCanvasRef.current = canvas;

    const emitCanvas = throttle(() => {
      const socket = socketRef.current;
      if (!socket || !roomKey) return;
      if (!fabricCanvasRef.current) return;
      if (applyingRemoteCanvasRef.current) return;

      const canvasJson = fabricCanvasRef.current.toJSON();
      socket.emit("whiteboard:canvas", { roomId: roomKey, canvasJson });
    }, 150);

    const emitMouseMove = throttle((evt) => {
      const socket = socketRef.current;
      if (!socket || !roomKey) return;
      if (!fabricCanvasRef.current) return;

      const pointer = fabricCanvasRef.current.getPointer(evt.e);
      const { width, height } = sizeRef.current;
      const x = width ? pointer.x / width : 0;
      const y = height ? pointer.y / height : 0;

      socket.emit("whiteboard:mouse-move", { roomId: roomKey, x, y });
    }, 50);

    const onPathCreated = () => {
      emitCanvas();
    };

    const onMouseMove = (evt) => {
      emitMouseMove(evt);
    };

    canvas.on("path:created", onPathCreated);
    canvas.on("mouse:move", onMouseMove);

    return () => {
      canvas.off("path:created", onPathCreated);
      canvas.off("mouse:move", onMouseMove);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [roomKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteCursors((prev) => {
        const next = { ...prev };
        const now = Date.now();
        Object.keys(next).forEach((key) => {
          if (now - (next[key]?.ts || 0) > 5000) delete next[key];
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    applyBrush(canvas);
    canvas.renderAll();

    const socket = socketRef.current;
    if (socket && roomKey) {
      const canvasJson = canvas.toJSON();
      socket.emit("whiteboard:canvas", { roomId: roomKey, canvasJson });
    }
  };

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const nextWidth = Math.max(300, Math.floor(entry.contentRect.width));
      const nextHeight = Math.max(MIN_CANVAS_HEIGHT, Math.floor(entry.contentRect.height));

      sizeRef.current = { width: nextWidth, height: nextHeight };

      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      canvas.setWidth(nextWidth);
      canvas.setHeight(nextHeight);
      canvas.calcOffset();
      canvas.requestRenderAll();
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    applyBrush(canvas);
  }, [tool, color]);

  return (
    <div className={`p-3 h-full ${className}`}>
      <div className="card bg-base-200 h-full">
        <div className="card-body h-full flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Whiteboard</h3>

            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-10 cursor-pointer bg-transparent"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (tool !== "pen") setTool("pen");
                }}
                aria-label="Brush color"
                title="Brush color"
              />

              <div className="join">
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm join-item ${tool === "pen" ? "btn-active" : ""}`}
                  onClick={() => setTool("pen")}
                >
                  Pen
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm join-item ${tool === "eraser" ? "btn-active" : ""}`}
                  onClick={() => setTool("eraser")}
                >
                  Eraser
                </button>
              </div>

              <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>

          <div ref={wrapperRef} className="flex-1 min-h-0 rounded-lg border border-base-300 bg-base-100 overflow-hidden">
            <div className="relative w-full h-full">
              <canvas ref={canvasElRef} className="block" />

              {Object.entries(remoteCursors).map(([sid, c]) => {
                const { width, height } = sizeRef.current;
                const left = (c?.x || 0) * width;
                const top = (c?.y || 0) * height;
                return (
                  <div
                    key={sid}
                    className="absolute w-2 h-2 rounded-full bg-primary pointer-events-none"
                    style={{ left, top, transform: "translate(-50%, -50%)" }}
                    aria-hidden
                  />
                );
              })}
            </div>
          </div>

          <div className="text-xs opacity-70">
            Draw together in real-time. Paths and cursor movement are synced.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeTab;
