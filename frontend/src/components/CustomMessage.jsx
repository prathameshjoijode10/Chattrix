import React, { useCallback, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { MessageSimple, useMessageContext } from "stream-chat-react";
import { executeCode } from "../lib/api";

const CODE_BLOCK_RE = /```([^\n`]*)\n([\s\S]*?)```/g;

const normalizeMonacoLanguage = (lang) => {
  const raw = (lang || "").toLowerCase().trim();
  if (!raw) return "plaintext";
  if (raw === "js" || raw === "javascript" || raw === "node") return "javascript";
  if (raw === "ts" || raw === "typescript") return "typescript";
  if (raw === "py" || raw === "python") return "python";
  if (raw === "c++" || raw === "cpp") return "cpp";
  if (raw === "c") return "c";
  if (raw === "java") return "java";
  if (raw === "go" || raw === "golang") return "go";
  if (raw === "rb" || raw === "ruby") return "ruby";
  if (raw === "rs" || raw === "rust") return "rust";
  if (raw === "php") return "php";
  if (raw === "cs" || raw === "csharp") return "csharp";
  if (raw === "json") return "json";
  if (raw === "yaml" || raw === "yml") return "yaml";
  if (raw === "sh" || raw === "bash" || raw === "shell") return "shell";
  return raw;
};

const normalizePistonLanguage = (lang) => {
  const raw = (lang || "").toLowerCase().trim();
  if (!raw) return "javascript";
  if (raw === "js" || raw === "javascript" || raw === "node") return "javascript";
  if (raw === "ts" || raw === "typescript") return "typescript";
  if (raw === "py" || raw === "python") return "python";
  if (raw === "c++" || raw === "cpp") return "cpp";
  if (raw === "c") return "c";
  if (raw === "java") return "java";
  if (raw === "go" || raw === "golang") return "go";
  if (raw === "rb" || raw === "ruby") return "ruby";
  if (raw === "rs" || raw === "rust") return "rust";
  if (raw === "php") return "php";
  if (raw === "cs" || raw === "csharp") return "csharp";
  return raw;
};

const extractCodeBlocks = (text) => {
  const raw = typeof text === "string" ? text : "";
  const blocks = [];

  let match;
  while ((match = CODE_BLOCK_RE.exec(raw)) !== null) {
    const lang = (match[1] || "").trim();
    const code = (match[2] || "").replace(/\n$/, "");
    if (code.trim()) blocks.push({ lang, code });
  }

  return blocks;
};

const isDeletedMessage = (message) => {
  if (!message) return true;
  if (message.type === "deleted") return true;
  if (message.deleted_at) return true;
  return false;
};

const OutputBox = ({ title, text }) => {
  if (!text) return null;
  return (
    <div className="mt-2">
      <div className="text-xs opacity-70 mb-1">{title}</div>
      <pre className="text-xs whitespace-pre-wrap break-words bg-base-200 rounded p-2 border border-base-300">
        {text}
      </pre>
    </div>
  );
};

const CodeBlockRunner = ({ block, messageId }) => {
  const [stdin, setStdin] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const pistonLanguage = useMemo(() => normalizePistonLanguage(block.lang), [block.lang]);
  const monacoLanguage = useMemo(() => normalizeMonacoLanguage(block.lang), [block.lang]);

  const run = useCallback(async () => {
    setIsRunning(true);
    setError("");
    try {
      const res = await executeCode({ language: pistonLanguage, source: block.code, stdin });
      setResult(res);
    } catch (e) {
      console.error("Code execution failed", e);
      setError(e?.response?.data?.message || "Code execution failed");
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  }, [pistonLanguage, block.code, stdin]);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs opacity-70">Code ({pistonLanguage})</div>
        <button type="button" className="btn btn-sm" onClick={run} disabled={isRunning}>
          {isRunning ? "Running..." : "Run Code"}
        </button>
      </div>

      <div className="border border-base-300 rounded overflow-hidden">
        <Editor
          height="200px"
          language={monacoLanguage}
          value={block.code}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>

      <div className="mt-2">
        <div className="text-xs opacity-70 mb-1">stdin</div>
        <textarea
          className="textarea textarea-bordered w-full text-xs"
          rows={2}
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="Type stdin here"
        />
      </div>

      {error ? <div className="mt-2 text-xs text-error">{error}</div> : null}

      {result ? (
        <div className="mt-2">
          <div className="text-xs opacity-70 mb-1">Console Output</div>
          <pre className="text-xs whitespace-pre-wrap break-words bg-base-200 rounded p-2 border border-base-300">
            {result.output || ""}
          </pre>
          <OutputBox title="compile" text={result.compile_output} />
          <OutputBox title="stderr" text={result.stderr} />
        </div>
      ) : null}

      {/* Keep unused param visible for future per-message caching */}
      <span className="hidden">{messageId}</span>
    </div>
  );
};

const CustomMessage = (props) => {
  const { message } = useMessageContext("CustomMessage");

  const codeBlocks = useMemo(() => extractCodeBlocks(message?.text), [message?.text]);

  return (
    <div>
      <MessageSimple {...props} />

      {isDeletedMessage(message) ? null : (
        <div className="px-2 pb-2">
          {codeBlocks.length
            ? codeBlocks.map((block, idx) => (
                <CodeBlockRunner key={`${message?.id || "msg"}-${idx}`} block={block} messageId={message?.id} />
              ))
            : null}
        </div>
      )}
    </div>
  );
};

export default CustomMessage;
