/** `--seed=123` / `--seed 123` 形式の簡易パーサ */
export const parseArgs = (argv: string[] = process.argv.slice(2)): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq >= 0) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      out[arg.slice(2)] = argv[++i];
    } else {
      out[arg.slice(2)] = "true";
    }
  }
  return out;
};

export const intArg = (args: Record<string, string>, key: string, fallback: number): number => {
  if (args[key] === undefined) return fallback;
  const v = Number(args[key]);
  if (!Number.isInteger(v)) throw new Error(`--${key} には整数を指定してください: ${args[key]}`);
  return v;
};
