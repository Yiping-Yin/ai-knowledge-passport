import { getAppContext } from "@/server/context";
import { drainQueue } from "@/server/services/jobs";

async function main() {
  const context = getAppContext();
  // A small polling loop is enough for the local MVP queue.
  for (;;) {
    await drainQueue(context, 10);
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
