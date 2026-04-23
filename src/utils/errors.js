/**
 * Converts a Tauri IPC error into a user-facing Russian string.
 *
 * Tauri serializes AppError as `{ type: string, message: string }`.
 * We branch on `type` first (stable enum discriminant) and fall back to
 * message-string heuristics for forward-compatibility with plain strings.
 */
export function humanizeError(error) {
  const type = error?.type;
  const message = error?.message ?? String(error);

  if (type === "Process" || message.includes("Failed to start")) {
    return "Не удалось запустить стратегию. Попробуйте другую или перезапустите приложение.";
  }
  if (type === "Path" || message.includes("not found")) {
    return "Файлы стратегии не найдены. Попробуйте перезапустить приложение.";
  }
  return message;
}
