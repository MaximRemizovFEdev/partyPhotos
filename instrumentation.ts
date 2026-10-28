export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { eventState } = await import("./lib/server");
    await eventState();
  }
}
