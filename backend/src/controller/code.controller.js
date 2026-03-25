const PISTON_EXECUTE_URL =
  process.env.PISTON_EXECUTE_URL || "https://emkc.org/api/v2/piston/execute";

const MAX_SOURCE_CHARS = 25_000;
const MAX_STDIN_CHARS = 10_000;
const DEFAULT_TIMEOUT_MS = 12_000;

export async function executeCode(req, res) {
  try {
    const { language, source, stdin } = req.body || {};

    const lang = typeof language === "string" ? language.trim() : "";
    const src = typeof source === "string" ? source : "";
    const inText = typeof stdin === "string" ? stdin : "";

    if (!lang) {
      return res.status(400).json({ message: "language is required" });
    }

    if (!src.trim()) {
      return res.status(400).json({ message: "source is required" });
    }

    if (src.length > MAX_SOURCE_CHARS) {
      return res.status(400).json({ message: `source too long (max ${MAX_SOURCE_CHARS} chars)` });
    }

    if (inText.length > MAX_STDIN_CHARS) {
      return res.status(400).json({ message: `stdin too long (max ${MAX_STDIN_CHARS} chars)` });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let pistonRes;
    try {
      pistonRes = await fetch(PISTON_EXECUTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          language: lang,
          version: "*",
          files: [{ content: src }],
          stdin: inText,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!pistonRes.ok) {
      let details = "";
      try {
        details = await pistonRes.text();
      } catch {
        // ignore
      }
      return res.status(400).json({
        message: `Piston error (${pistonRes.status})`,
        details: details || pistonRes.statusText,
      });
    }

    const json = await pistonRes.json();
    const run = json?.run || {};
    const compile = json?.compile || {};

    return res.status(200).json({
      language: lang,
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      output: run.output || "",
      code: run.code,
      signal: run.signal,
      compile_output: compile.output || "",
      compile_code: compile.code,
      compile_signal: compile.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(408).json({ message: "Code execution timed out" });
    }
    console.error("Error in executeCode controller", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
